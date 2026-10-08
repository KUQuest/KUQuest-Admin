import { z } from "zod";

import type {
  AdminApiRequestOptions,
  AdminLedgerTransaction,
  AdminMemberListQuery,
} from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { WALLET_STATUSES } from "../domain/rulebook";
import { loadAllWalletLedgerTransactions, WalletLedgerContractError } from "../wallet/wallet-ledger-pages";
import {
  memberListModelFromApi,
  memberModelFromApi,
  type MemberApiCollections,
  type MemberApiReadData,
  type MemberCollection,
  type MemberCollectionError,
  type MemberModel,
  type MemberPageData,
  type MemberWalletBalances,
  type MemberWalletReadState,
} from "./member-model";
import { loadMemberProfileCollections } from "./member-profile-service";

const dateTime = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const memberDisplayId = z.string().regex(/^MEM-[0-9]{6,}$/);
const memberStatus = z.enum(["NORMAL", "RED_FLAG", "TEMPORARY_BAN", "PERMANENT_BAN"]);
const walletStatus = z.enum(WALLET_STATUSES);
const nonnegativeSatang = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const memberDetailCoreSchema = z.object({
  member: z.object({
    id: z.string().min(1),
    displayId: memberDisplayId,
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    studentId: z.string().nullable(),
    telephone: z.string().nullable(),
    bio: z.string().nullable(),
    academicYear: z.number().int().nullable(),
    faculty: z.string().nullable(),
    department: z.string().nullable(),
    occupation: z.string().nullable(),
    memberStatus,
    createdAt: dateTime,
  }).passthrough(),
}).passthrough();

const walletSnapshotSchema = z.object({
  id: z.string().min(1),
  walletStatus,
  spendingBalanceSatang: nonnegativeSatang,
  earningsBalanceSatang: nonnegativeSatang,
  fundingReservedSatang: nonnegativeSatang,
  reservedForPayoutsSatang: nonnegativeSatang,
  projectionMatchesLedger: z.boolean(),
}).passthrough();

const memberDetailWalletSchema = walletSnapshotSchema.extend({
  totalBalanceSatang: nonnegativeSatang,
}).superRefine((wallet, context) => {
  const compartmentTotal = wallet.spendingBalanceSatang
    + wallet.earningsBalanceSatang
    + wallet.fundingReservedSatang
    + wallet.reservedForPayoutsSatang;
  if (wallet.totalBalanceSatang !== compartmentTotal) {
    context.addIssue({
      code: "custom",
      path: ["totalBalanceSatang"],
      message: "Wallet total does not equal its four compartments.",
    });
  }
});

const financeWalletResponseSchema = z.object({
  member: z.object({ userId: z.string().min(1) }).passthrough(),
  wallet: walletSnapshotSchema.nullable(),
}).passthrough();

type WalletSnapshot = z.infer<typeof walletSnapshotSchema>;
type WalletReadResult = {
  walletReadState: MemberWalletReadState;
  wallet: WalletSnapshot | null;
};

const requestError = (message: string): MemberCollectionError => ({ kind: "request", message });
const contractError = (message: string): MemberCollectionError => ({ kind: "contract", message });

function walletReadResult(
  state: MemberWalletReadState,
  wallet: WalletSnapshot | null = null,
): WalletReadResult {
  return { walletReadState: state, wallet };
}

function availableWallet(
  wallet: WalletSnapshot,
  source: "finance" | "member-detail",
  warning: MemberCollectionError | null,
): WalletReadResult {
  return walletReadResult({ kind: "available", source, warning }, wallet);
}

function absentWallet(
  source: "finance" | "member-detail",
  warning: MemberCollectionError | null,
): WalletReadResult {
  return walletReadResult({ kind: "absent", source, warning });
}

function invalidWallet(error: MemberCollectionError): WalletReadResult {
  return walletReadResult({ kind: "contract-error", error });
}

function conflictingWallet(message: string): WalletReadResult {
  return walletReadResult({ kind: "conflict", error: contractError(message) });
}

function resolveMemberWallet(
  memberId: string,
  detailWalletValue: unknown,
  financeResult: PromiseSettledResult<Awaited<ReturnType<typeof adminApiProvider.read.getMemberFinance>>>,
): WalletReadResult {
  const detailResult = memberDetailWalletSchema.nullable().safeParse(detailWalletValue);
  const detailWallet = detailResult.success ? detailResult.data : null;
  const detailIsInvalid = !detailResult.success;
  const invalidContract = contractError("Wallet data does not match API contract.");
  const financeRequestFailure = requestError("Member Finance could not be loaded.");

  if (financeResult.status === "rejected") {
    if (detailIsInvalid) return invalidWallet(invalidContract);
    if (detailWallet === null) return absentWallet("member-detail", financeRequestFailure);
    return availableWallet(detailWallet, "member-detail", financeRequestFailure);
  }

  const finance = financeWalletResponseSchema.safeParse(financeResult.value);
  if (!finance.success) return invalidWallet(invalidContract);
  if (finance.data.member.userId !== memberId) {
    return conflictingWallet("Wallet data conflicts with the selected Member.");
  }

  const financeWallet = finance.data.wallet;
  if (financeWallet === null) {
    if (detailIsInvalid) return invalidWallet(invalidContract);
    if (detailWallet !== null) {
      return conflictingWallet("Finance and Member detail disagree about Wallet existence.");
    }
    return absentWallet("finance", null);
  }

  if (detailIsInvalid) return availableWallet(financeWallet, "finance", invalidContract);
  if (detailWallet === null || detailWallet.id !== financeWallet.id) {
    return conflictingWallet("Finance and Member detail disagree about Wallet identity.");
  }
  return availableWallet(financeWallet, "finance", null);
}

function walletBalances(wallet: WalletSnapshot | null): MemberWalletBalances | null {
  if (!wallet) return null;
  return {
    spendingBalanceSatang: wallet.spendingBalanceSatang,
    earningsBalanceSatang: wallet.earningsBalanceSatang,
    fundingReservedSatang: wallet.fundingReservedSatang,
    reservedForPayoutsSatang: wallet.reservedForPayoutsSatang,
  };
}

function emptyCollection<T>(error: MemberCollectionError): MemberCollection<T> {
  return { items: null, totalCount: null, complete: false, error };
}

function unavailableCollections(error: MemberCollectionError): MemberApiCollections {
  return {
    profileTags: emptyCollection(error),
    workExperiences: emptyCollection(error),
    certificates: emptyCollection(error),
    questHistory: emptyCollection(error),
    reviews: emptyCollection(error),
    reportsReceived: emptyCollection(error),
    reportsSubmitted: emptyCollection(error),
    payouts: emptyCollection(error),
    penaltyHistory: { ...emptyCollection(error), summary: null },
  };
}

function walletStatementFailure(error: MemberCollectionError): MemberCollection<AdminLedgerTransaction> {
  return { items: null, totalCount: null, complete: false, error };
}

async function loadMemberWalletStatement(
  walletRead: WalletReadResult,
  options: AdminApiRequestOptions,
): Promise<MemberCollection<AdminLedgerTransaction>> {
  if (walletRead.walletReadState.kind !== "available" || !walletRead.wallet) {
    const state = walletRead.walletReadState;
    if (state.kind === "request-error" || state.kind === "contract-error" || state.kind === "conflict") {
      return walletStatementFailure(state.error);
    }
    return { items: null, totalCount: null, complete: false, error: null };
  }

  try {
    const items = await loadAllWalletLedgerTransactions(walletRead.wallet.id, options);
    return { items, totalCount: null, complete: true, error: null };
  } catch (error) {
    const failure = error instanceof WalletLedgerContractError
      ? contractError("Wallet Statement data does not match the Admin API contract.")
      : requestError("Wallet Statement could not be loaded.");
    return walletStatementFailure(failure);
  }
}

export async function loadMemberPageData(
  cookieHeader?: string,
  cursor?: string,
): Promise<MemberPageData> {
  const query: AdminMemberListQuery = {
    limit: 50,
    ...(cursor ? { cursor } : {}),
  };
  const page = await adminApiProvider.read.listMembers(query, adminApiRequestOptions(cookieHeader));
  return {
    items: page.items.map(memberListModelFromApi),
    nextCursor: page.nextCursor,
  };
}

export async function loadMemberDetailFromApi(
  memberId: string,
  cookieHeader?: string,
): Promise<MemberModel | null> {
  const options = adminApiRequestOptions(cookieHeader);
  const detail = await adminApiProvider.read.getMember(memberId, options);
  const detailContract = memberDetailCoreSchema.safeParse(detail);
  if (!detailContract.success || detailContract.data.member.id !== memberId) {
    throw new Error("Member detail data does not match the Admin API contract.");
  }

  const [financeResult, collectionsResult] = await Promise.allSettled([
    adminApiProvider.read.getMemberFinance(memberId, options),
    loadMemberProfileCollections(memberId, detailContract.data.member.displayId, options),
  ]);
  const walletRead = resolveMemberWallet(memberId, detail.wallet, financeResult);
  const collections = collectionsResult.status === "fulfilled"
    ? collectionsResult.value
    : unavailableCollections(requestError("Member profile collections could not be loaded."));
  const walletStatement = await loadMemberWalletStatement(walletRead, options);
  const reads: MemberApiReadData = {
    walletReadState: walletRead.walletReadState,
    walletId: walletRead.wallet?.id ?? null,
    walletStatus: walletRead.wallet?.walletStatus ?? null,
    walletBalances: walletBalances(walletRead.wallet),
    walletProjectionMatchesLedger: walletRead.wallet?.projectionMatchesLedger ?? null,
    walletStatement,
    collections,
  };
  const model = memberModelFromApi(detail, reads);
  return model.id === memberId ? model : null;
}
