"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { AdminSortableHeader } from "../../../components/admin/admin-sortable-header";
import { AdminRecordFact as Fact } from "../../../components/admin/admin-record-fields";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { adminBoardCount, adminBoardPagination, adminBoardTable, adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection } from "../../../components/admin/admin-record-styles";
import { Badge as UiBadge, Button as UiButton, Card, CardDescription, CardHeader, CardTitle, EmptyState, Input, PageSizeControls, Pagination, Table, Tabs, TabsList, TabsTrigger } from "../../../components/ui";
import { adminApiProvider } from "../api/admin-provider";
import { walletStatusLabel, type WalletStatus } from "../domain/rulebook";
import { useAdminBoardReset } from "../data/use-admin-board-reset";
import { memberTabHref } from "../member/member-model";
import { verifyWalletProjectionAction } from "./wallet-actions";
import { WalletStatementTable } from "./wallet-statement-table";
import {
  formatWalletDate,
  formatWalletMoney,
  pageWalletRows,
  searchWalletRows,
  sortWalletRows,
  walletMatchesTab,
  walletPageCount,
  walletStatusClass,
  WALLET_BOARD_TABS,
  type WalletBoardRow,
  type WalletBoardTab,
  type WalletFinanceSummary,
  type WalletHistoryView,
  type WalletVerificationView,
} from "./wallet-model";
import { useWalletBoardStore } from "./wallet-board-store";
import { useWalletBoardQuery, useWalletDrawerQuery, walletBoardQueryKey, walletDrawerQueryKey, type WalletBoardQueryData } from "./wallet-query";
import type { WalletDataSource, WalletBoardPageData } from "./wallet-service";

type WalletStatusTarget = Exclude<WalletStatus, "CLOSED">;
type WalletStatusFixture = "success" | "error" | "stale-version";

type WalletStatusReceipt = {
  id: string;
  fromStatus: WalletStatus;
  toStatus: WalletStatus;
  reason: string;
  createdAt: string;
};

const WALLET_STATUS_FIXTURE_OPTIONS: Array<{ value: WalletStatusFixture; label: string }> = [
  { value: "success", label: "Success" },
  { value: "error", label: "Command error" },
  { value: "stale-version", label: "Stale Wallet version" },
];

function walletStatusTargets(status: WalletStatus): WalletStatusTarget[] {
  if (status === "CLOSED") return [];
  if (status === "ACTIVE") return ["FROZEN", "SUSPENDED"];
  if (status === "FROZEN") return ["SUSPENDED", "ACTIVE"];
  return ["FROZEN", "ACTIVE"];
}

function walletStatusActionLabel(status: WalletStatusTarget): string {
  if (status === "ACTIVE") return "Restore Wallet to ACTIVE";
  if (status === "FROZEN") return "Freeze Wallet";
  return "Suspend Wallet";
}

function walletStatusActionClass(status: WalletStatusTarget): string {
  if (status === "ACTIVE") return "primary";
  if (status === "SUSPENDED") return "danger";
  return "";
}

function walletStatusTransitionCopy(status: WalletStatusTarget): string[] {
  if (status === "ACTIVE") {
    return [
      "Student-initiated Wallet operations are permitted again.",
      "This does not change the Member Ban status.",
    ];
  }
  return [
    "New commitments are blocked, including Top-up, Payout, Earnings Conversion, and new Quest participation.",
    "Existing Escrow, Assignments, and in-progress Payouts continue under their own rules.",
    "This changes Wallet Status only. It does not create or remove a Member Ban.",
  ];
}

function walletStatusFixtureError(fixture: WalletStatusFixture): string | null {
  if (fixture === "error") return "Mock Wallet status command failed. No status was changed.";
  if (fixture === "stale-version") return "Wallet status is stale. Refresh this Wallet before trying again. No status was changed.";
  return null;
}

function WalletStatusCommandDialog({
  row,
  targetStatus,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  row: WalletBoardRow;
  targetStatus: WalletStatusTarget;
  onCancel: () => void;
  onSubmit: (reason: string, fixture: WalletStatusFixture) => void;
  error: string | null;
  pending: boolean;
}) {
  const { translateText } = useAdminShell();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [fixture, setFixture] = useState<WalletStatusFixture>("success");
  const [validationError, setValidationError] = useState<string | null>(null);
  const transitionCopy = walletStatusTransitionCopy(targetStatus);
  const actionLabel = walletStatusActionLabel(targetStatus);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [onCancel]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setValidationError("Enter a reason for this Wallet status change.");
      return;
    }
    setValidationError(null);
    onSubmit(trimmedReason, fixture);
  }

  return <AdminModalPortal open onClose={onCancel}><dialog ref={dialogRef} open className="dispute-decision-dialog wallet-status-command-dialog" aria-labelledby="wallet-status-command-title" aria-modal="true" tabIndex={-1}>
    <form method="dialog" className="wallet-status-command-form" onSubmit={submit}>
      <div className="dialog-body min-h-0 flex-1 overflow-y-auto p-5">
        <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
        <h2 id="wallet-status-command-title">{translateText(actionLabel)}</h2>
        <p>{translateText("Review the Wallet status change before saving. Every Wallet status change requires a reason.")}</p>
        <AdminActionSummary
          title={translateText("Before you confirm")}
          affected={`${translateText("Wallet")} ${row.id} · ${row.memberName}`}
          currentState={walletStatusLabel(row.status)}
          nextState={walletStatusLabel(targetStatus)}
          effect={translateText(transitionCopy.join(" "))}
          reversibility={translateText("This changes Wallet Status only. It does not create or remove a Member Ban. The status history is retained.")}
          warning={translateText("The API Server remains the authority for the final Wallet result.")}
        />
        <label htmlFor="wallet-status-reason">{translateText("Reason for this decision")}</label>
        <textarea id="wallet-status-reason" name="reason" rows={4} minLength={1} maxLength={500} required value={reason} aria-invalid={validationError ? "true" : undefined} aria-describedby={validationError ? "wallet-status-reason-error" : undefined} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} autoFocus />
        <div className="mt-1.5 flex justify-between gap-3 text-[15px] leading-[1.4] text-admin-muted"><span>{translateText("This reason is part of the Wallet status history. It does not change the Member Ban ladder.")}</span><span>{reason.length}/500</span></div>
        <label className="wallet-fixture-field" htmlFor="wallet-status-fixture">{translateText("Mock response fixture")} <span className="text-xs font-medium">{translateText("Development only")}</span>
          <select id="wallet-status-fixture" value={fixture} onChange={(event) => setFixture(event.target.value as WalletStatusFixture)}>
            {WALLET_STATUS_FIXTURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{translateText(option.label)}</option>)}
          </select>
        </label>
        {validationError || error ? <p id="wallet-status-reason-error" className="field-error" role="alert">{translateText(validationError ?? error ?? "")}</p> : null}
      </div>
      <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
        <UiButton variant="outline" type="button" onClick={onCancel} disabled={pending}>{translateText("Cancel")}</UiButton>
        <UiButton variant={targetStatus === "ACTIVE" ? "primary" : "danger"} type="submit" disabled={pending}>{pending ? translateText("Saving…") : translateText(actionLabel)}</UiButton>
      </div>
    </form>
  </dialog></AdminModalPortal>;
}

function Badge({ status, track = true }: { status: WalletStatus; track?: boolean }) {
  const { translateText } = useAdminShell();
  const label = walletStatusLabel(status);
  return <UiBadge
    tone="neutral"
    className={`badge ${walletStatusClass(status)}`}
    data-wallet-status={track ? status : undefined}
    title={status === "CLOSED" ? translateText("Closed — terminal Wallet status") : undefined}
  >{translateText(label)}</UiBadge>;
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return <div className="grid min-w-0 gap-[3px] rounded-lg border border-admin-border bg-admin-surface p-2.5"><span className="overflow-hidden text-[13px] font-semibold leading-[1.4] text-admin-muted text-ellipsis whitespace-nowrap">{label}</span><strong className="text-[17px] leading-[1.4] tabular-nums text-admin-text">{formatWalletMoney(value)}</strong></div>;
}

function WalletSummary({
  summary,
  error,
  dataSource,
  onRetry,
}: {
  summary: WalletFinanceSummary | null;
  error: string | null;
  dataSource: WalletDataSource;
  onRetry: () => void;
}) {
  const { translateText } = useAdminShell();
  const content = error
    ? <EmptyState role="alert" title={translateText("Wallet summary unavailable")} description={translateText(error)} action={<UiButton variant="outline" type="button" onClick={onRetry}>{translateText("Try again")}</UiButton>} />
    : summary
    ? <div className="grid grid-cols-5 gap-2.5 max-[900px]:grid-cols-3 max-[600px]:grid-cols-2">
      <SummaryMetric label={translateText("Spending balance")} value={summary.totalSpendingSatang} />
      <SummaryMetric label={translateText("Earnings balance")} value={summary.totalEarningsSatang} />
      <SummaryMetric label={translateText("Funding reserved")} value={summary.totalFundingReservedSatang} />
      <SummaryMetric label={translateText("Payout reserved")} value={summary.totalPayoutReservedSatang} />
      <SummaryMetric label={translateText("Total circulating")} value={summary.totalCirculatingSatang} />
    </div>
    : null;

  return <Card as="section" className="wallet-funds-summary my-[18px] grid gap-3 bg-admin-soft p-[15px_17px]" aria-labelledby="wallet-summary-heading"><div className="flex items-center justify-between gap-3"><div className="grid gap-[3px]"><strong id="wallet-summary-heading" className="text-lg leading-[1.4] text-admin-text">{translateText("Member Wallet Summary")}</strong><small className="text-[13px] font-medium leading-[1.4] text-admin-muted">{translateText(dataSource === "api" ? "Aggregate values from the Admin API" : "All Wallets · all statuses")}</small></div></div>{content}</Card>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{title}</h3></CardHeader>{children}</Card>;
}

function WalletDrawer({
  row,
  dataSource,
  opener,
  onClose,
  onStatusChanged,
}: {
  row: WalletBoardRow;
  dataSource: WalletDataSource;
  opener: HTMLElement | null;
  onClose: () => void;
  onStatusChanged: (walletId: string, nextStatus: WalletStatus) => void;
}) {
  const { translateText } = useAdminShell();
  const queryClient = useQueryClient();
  const { data: drawerData, isPending: loading, error, refetch } = useWalletDrawerQuery(row.id, dataSource);
  const detail = drawerData?.detail ? { ...drawerData.detail, status: row.status, statusLabel: walletStatusLabel(row.status) } : null;
  const history = drawerData?.history ?? [];
  const ledger = drawerData?.ledger ?? [];
  const [verification, setVerification] = useState<WalletVerificationView | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"verify" | "rebuild" | null>(null);
  const [statusCommand, setStatusCommand] = useState<WalletStatusTarget | null>(null);
  const [statusCommandError, setStatusCommandError] = useState<string | null>(null);
  const [statusCommandPending, setStatusCommandPending] = useState(false);
  const [statusReceipt, setStatusReceipt] = useState<WalletStatusReceipt | null>(null);

  async function verifyLedger() {
    setActionPending("verify");
    setActionError(null);
    setNotice(null);
    try {
      if (dataSource === "api") {
        const result = await verifyWalletProjectionAction(row.id);
        setVerification(result);
      } else if (detail) {
        setVerification({ matches: detail.projectionMatchesLedger, activityCountMatches: true, projectedTotal: detail.currentBalanceSatang, ledgerTotal: detail.currentBalanceSatang });
      }
      setNotice(`Ledger verification completed for ${row.id}.`);
    } catch (verifyError) {
      setActionError(verifyError instanceof Error ? verifyError.message : "Ledger verification failed.");
    } finally {
      setActionPending(null);
    }
  }

  async function rebuildProjection() {
    setActionPending("rebuild");
    setActionError(null);
    setNotice(null);
    try {
      if (dataSource === "api") {
        await adminApiProvider.commands.rebuildWalletProjection(row.id);
        await refetch();
      }
      setNotice(`Wallet projection rebuilt for ${row.id}.`);
    } catch (rebuildError) {
      setActionError(rebuildError instanceof Error ? rebuildError.message : "Wallet projection rebuild failed.");
    } finally {
      setActionPending(null);
    }
  }

  const cancelStatusCommand = useCallback(() => {
    if (statusCommandPending) return;
    setStatusCommand(null);
    setStatusCommandError(null);
  }, [statusCommandPending]);

  function openStatusCommand(nextStatus: WalletStatusTarget) {
    setStatusCommandError(null);
    setStatusReceipt(null);
    setStatusCommand(nextStatus);
  }

  async function submitStatusCommand(reason: string, fixture: WalletStatusFixture) {
    if (!detail || dataSource !== "mock" || !statusCommand) return;
    setStatusCommandPending(true);
    setStatusCommandError(null);
    setNotice(null);
    try {
      const fixtureError = walletStatusFixtureError(fixture);
      if (fixtureError) throw new Error(fixtureError);

      const createdAt = new Date().toISOString();
      const historyEntry: WalletHistoryView = {
        id: `mock-wallet-status-${row.id}-${Date.now()}`,
        fromStatus: detail.status,
        toStatus: statusCommand,
        reason,
        actorAdminId: "admin-mock",
        createdAt,
      };
      const receipt: WalletStatusReceipt = {
        id: `mock-action-${row.id}-${Date.now()}`,
        fromStatus: detail.status,
        toStatus: statusCommand,
        reason,
        createdAt,
      };
      queryClient.setQueryData(walletDrawerQueryKey(row.id, dataSource), (current: typeof drawerData) => current
        ? {
            ...current,
            history: [historyEntry, ...current.history],
          }
        : current);
      setStatusReceipt(receipt);
      setNotice(`Wallet status changed to ${walletStatusLabel(statusCommand)}.`);
      onStatusChanged(row.id, statusCommand);
      setStatusCommand(null);
    } catch (commandError) {
      setStatusCommandError(commandError instanceof Error ? commandError.message : "Wallet status command failed.");
    } finally {
      setStatusCommandPending(false);
    }
  }

  const statusActionContent = dataSource === "mock" ? <>
        <p>{translateText("Change Wallet Status without changing the Member Ban status. A non-active Wallet blocks new commitments while existing obligations continue.")}</p>
        {walletStatusTargets(detail?.status ?? row.status).length ? <div className="wallet-status-actions mt-3 flex flex-wrap gap-2 [&_[data-slot=button]]:min-w-[170px] [&_[data-slot=button]]:flex-1" aria-label={translateText("Wallet status actions")}>
          {walletStatusTargets(detail?.status ?? row.status).map((targetStatus) => <UiButton variant={walletStatusActionClass(targetStatus) === "danger" ? "danger" : "outline"} type="button" key={targetStatus} data-wallet-status-action={targetStatus} onClick={() => openStatusCommand(targetStatus)} disabled={statusCommandPending}>{translateText(walletStatusActionLabel(targetStatus))}</UiButton>)}
        </div> : <p className="audit-note">{translateText("Closed is terminal. No Wallet status change is available.")}</p>}
      </> : <p>{translateText("Status commands will be connected to the Admin API in the API integration step.")}</p>;

  return <AdminDrawer
    ariaLabel={translateText("Close Wallet detail")}
    title={row.id}
    titleId="wallet-drawer-title"
    subtitle={translateText("Wallet detail drawer")}
    className="wallet-drawer [&>.drawer-body]:grid [&>.drawer-body]:content-start [&>.drawer-body]:gap-3.5 [&>.drawer-body]:!min-w-0 [&>.drawer-body]:!grid-cols-[minmax(0,1fr)] [&>.drawer-body]:!pb-7"
    opener={opener}
    onClose={onClose}
    actions={!loading && !error && detail ? <>
      {dataSource === "api" ? <>
        <UiButton variant="outline" type="button" disabled={actionPending !== null} onClick={() => { void verifyLedger(); }}>{actionPending === "verify" ? translateText("Verifying…") : translateText("Verify Ledger")}</UiButton>
        <UiButton variant="primary" type="button" disabled={actionPending !== null} onClick={() => { if (window.confirm(translateText("Rebuild this Wallet projection from the Ledger source of truth?"))) void rebuildProjection(); }}>{actionPending === "rebuild" ? translateText("Rebuilding…") : translateText("Rebuild projection")}</UiButton>
      </> : null}
      {detail ? <UiButton asChild variant="outline"><a href={memberTabHref(detail.memberId, "wallet-statement")}>{translateText("See Wallet Statement")}</a></UiButton> : null}
      <UiButton variant="outline" type="button" onClick={onClose}>{translateText("Close record")}</UiButton>
    </> : null}
  >
        {loading ? <p aria-live="polite">{translateText("Loading Wallet detail…")}</p> : error ? <EmptyState role="alert" title={translateText("Wallet detail unavailable")} description={translateText(error instanceof Error ? error.message : "Wallet detail is not available.")} action={<UiButton variant="outline" type="button" onClick={() => { void refetch(); }}>{translateText("Try again")}</UiButton>} /> : detail ? <>
          <Card as="section" className="wallet-record m-0 min-w-0 max-w-full p-[18px]"><div className="drawer-title"><span className="att-icon neutral">W</span><div><h2>{detail.memberName}</h2><p>{detail.email} · {detail.memberId}</p></div></div><div className={adminRecordFacts}><Fact label={translateText("Wallet Status")}><Badge status={detail.status} /></Fact><Fact label={translateText("Current Wallet Balance")}>{formatWalletMoney(detail.currentBalanceSatang)}</Fact><Fact label={translateText("Wallet record")}>{detail.id}</Fact><Fact label={translateText("Latest Wallet Transaction Date")}>{formatWalletDate(detail.latestTransactionAt)}</Fact></div></Card>
          <Section title={translateText("Wallet balances")}><div className="grid gap-3"><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Spending Balance")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{formatWalletMoney(detail.balances.spendingBalanceSatang)}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Earnings Balance")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{formatWalletMoney(detail.balances.earningsBalanceSatang)}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Funding Reserved")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{formatWalletMoney(detail.balances.fundingReservedSatang)}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Reserved For Payouts")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{formatWalletMoney(detail.balances.reservedForPayoutsSatang)}</strong></div></div></Section>
          <Section title={translateText("Ledger check")}><p>{translateText(detail.projectionMatchesLedger ? "Wallet projection matches the Ledger." : "Wallet projection does not match the Ledger.")}</p></Section>
          {verification ? <Section title={translateText("Ledger verification")}><p>{translateText(verification.matches ? "Projected balances match the Ledger." : "Projected balances do not match the Ledger.")}</p><div className={adminRecordFacts}><Fact label={translateText("Projected Wallet Balance")}>{formatWalletMoney(verification.projectedTotal)}</Fact><Fact label={translateText("Ledger Wallet Balance")}>{formatWalletMoney(verification.ledgerTotal)}</Fact><Fact label={translateText("Activity count")}>{translateText(verification.activityCountMatches ? "Matches" : "Does not match")}</Fact></div></Section> : null}
          <Section title={translateText("Wallet Statement")}><p>{translateText("Latest 5 committed and sealed Ledger Transactions, newest first.")}</p><WalletStatementTable transactions={ledger} /></Section>
          <Section title={translateText("Wallet status history")}>
            {history.length ? <ol className="timeline">{history.map((entry) => <li key={entry.id}><strong>{entry.fromStatus ? `${translateText(walletStatusLabel(entry.fromStatus))} → ` : ""}{translateText(walletStatusLabel(entry.toStatus))}</strong><time dateTime={entry.createdAt}>{formatWalletDate(entry.createdAt)}</time><span>{entry.reason}</span>{entry.actorAdminId ? <small className="block text-xs text-admin-muted">{translateText("Admin")} {entry.actorAdminId}</small> : null}</li>)}</ol> : <p>{translateText("No Wallet status changes are recorded.")}</p>}
          </Section>
          <Section title={translateText("Wallet status action")}>{statusActionContent}</Section>
          {statusReceipt ? <Card as="section" className="wallet-action-receipt my-[18px] rounded-[10px] border border-admin-success bg-admin-success-soft p-3" aria-label={translateText("Wallet status action receipt")}><CardHeader flush><h3 className="mb-2.5 text-[18px] leading-[1.4]">{translateText("Action receipt")}</h3></CardHeader><div className="wallet-status-preview grid gap-2 rounded-[10px] border border-admin-border bg-admin-surface p-3 text-[17px] leading-[1.4]"><div className="flex items-start justify-between gap-3"><span className="text-admin-muted">{translateText("Action ID")}</span><strong className="max-w-[70%] break-words text-right font-semibold">{statusReceipt.id}</strong></div><div className="flex items-start justify-between gap-3"><span className="text-admin-muted">{translateText("Wallet Status")}</span><strong className="max-w-[70%] break-words text-right font-semibold">{translateText(walletStatusLabel(statusReceipt.fromStatus))} → {translateText(walletStatusLabel(statusReceipt.toStatus))}</strong></div><div className="flex items-start justify-between gap-3"><span className="text-admin-muted">{translateText("Reason")}</span><strong className="max-w-[70%] break-words text-right font-semibold">{statusReceipt.reason}</strong></div><div className="flex items-start justify-between gap-3"><span className="text-admin-muted">{translateText("Recorded")}</span><strong className="max-w-[70%] break-words text-right font-semibold">{formatWalletDate(statusReceipt.createdAt)}</strong></div></div><p className="audit-note mb-0">{translateText("This mock receipt represents the Activity Log event that the API integration will return.")}</p></Card> : null}
          {actionError || notice ? <p className={actionError ? "field-error" : "audit-note"} role={actionError ? "alert" : "status"}>{translateText(actionError ?? notice ?? "")}</p> : null}
        </> : null}
    {statusCommand && detail ? <WalletStatusCommandDialog row={{ ...row, status: detail.status, statusLabel: walletStatusLabel(detail.status) }} targetStatus={statusCommand} onCancel={cancelStatusCommand} onSubmit={(reason, fixture) => { void submitStatusCommand(reason, fixture); }} error={statusCommandError} pending={statusCommandPending} /> : null}
  </AdminDrawer>;
}

export function AdminWalletPage({ initialData }: { initialData: WalletBoardPageData }) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const queryClient = useQueryClient();
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const { data: boardData, isFetching, error: queryError } = useWalletBoardQuery(initialData);
  const rows = boardData?.rows ?? [];
  const {
    search,
    tab,
    pageSize,
    pageNumber,
    sortKey,
    sortDirection,
    setSearch,
    setTab,
    setPageSize,
    setPageNumber,
    sortBy,
    reset,
  } = useWalletBoardStore();
  const [selectedWallet, setSelectedWallet] = useState<WalletBoardRow | null>(null);

  useAdminBoardReset(reset);

  const filteredRows = searchWalletRows(rows, search).filter((row) => walletMatchesTab(row, tab));
  const sortedRows = sortWalletRows(filteredRows, sortKey, sortDirection);
  const totalPages = walletPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(pageNumber, Math.max(totalPages, 1));
  const visibleRows = pageWalletRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  function resetView() {
    reset();
  }

  function openWalletDrawer(row: WalletBoardRow, opener: HTMLElement) {
    drawerOpenerRef.current = opener;
    setSelectedWallet(row);
  }

  const closeWalletDrawer = useCallback(() => {
    setSelectedWallet(null);
  }, []);

  const handleStatusChanged = useCallback((walletId: string, nextStatus: WalletStatus) => {
    queryClient.setQueryData<WalletBoardQueryData>([...walletBoardQueryKey, initialData.dataSource], (current) => current
      ? { ...current, rows: current.rows.map((row) => row.id === walletId
        ? { ...row, status: nextStatus, statusLabel: walletStatusLabel(nextStatus) }
        : row) }
      : current);
    setSelectedWallet((current) => current?.id === walletId
      ? { ...current, status: nextStatus, statusLabel: walletStatusLabel(nextStatus) }
      : current);
  }, [initialData.dataSource, queryClient]);

  if (initialData.boardError) return <main className="admin-route-page wallet-route-page" tabIndex={-1}>
    <AdminPageHeader title={translateText("Wallets")} description={translateText("Review Wallet status and balances. Wallet detail is not a route in this migration.")} />
    <Card as="section" className="overflow-hidden wallet-board" aria-label={translateText("Wallet review board")}>
      <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
        <div><CardTitle>{translateText("Wallets")}</CardTitle><CardDescription>{translateText("Review Wallet status and balances.")}</CardDescription></div>
        <span className={adminBoardCount}>0 {translateText("shown")}</span>
      </CardHeader>
      <WalletSummary summary={initialData.summary} error={initialData.summaryError} dataSource={initialData.dataSource} onRetry={() => router.refresh()} />
      <EmptyState role="alert" title={translateText("Records are not available")} description={translateText(initialData.boardError)} action={<UiButton variant="primary" type="button" onClick={() => router.refresh()}>{translateText("Try again")}</UiButton>} />
    </Card>
  </main>;

  const resultLabel = !sortedRows.length
    ? translateText("Showing 0 of 0 results")
    : pageSize === "all"
    ? `${translateText("Showing all")} ${sortedRows.length} ${translateText(sortedRows.length === 1 ? "result" : "results")}`
    : `${translateText("Showing")} ${pageStart}–${pageEnd} ${translateText("of")} ${sortedRows.length} ${translateText(sortedRows.length === 1 ? "result" : "results")}`;
  return <main className="admin-route-page wallet-route-page" tabIndex={-1}>
    <AdminPageHeader title={translateText("Wallets")} description={translateText("Review Wallet status and balances. Wallet detail is not a route in this migration.")} />
    <Card as="section" className="overflow-hidden wallet-board" aria-label={translateText("Wallet review board")}>
      <CardHeader className="flex min-h-[60px] items-center justify-between gap-4">
        <div><CardTitle>{translateText("Wallets")}</CardTitle><CardDescription>{translateText("Review Wallet status and balances.")}</CardDescription></div>
        <span className={adminBoardCount}>{sortedRows.length} {translateText("shown")}</span>
      </CardHeader>
      <WalletSummary summary={initialData.summary} error={initialData.summaryError} dataSource={initialData.dataSource} onRetry={() => router.refresh()} />
      <Tabs value={tab} onValueChange={(value) => setTab(value as WalletBoardTab)}>
        <TabsList className="px-3" aria-label={translateText("Wallet status filters")}>
          {WALLET_BOARD_TABS.map((item) => <TabsTrigger key={item.id} value={item.id}>{translateText(item.label)}{item.id === "all" ? ` (${rows.length})` : ""}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="flex min-h-[54px] flex-wrap items-center gap-2 border-b border-admin-border px-3 py-2">
        <label className="flex min-w-0 max-w-[420px] flex-1 flex-col gap-1 text-sm text-admin-text max-[600px]:basis-full max-[600px]:max-w-none" htmlFor="wallet-search"><span className="visually-hidden">{translateText("Search Wallets")}</span><Input className="h-9 min-h-9 px-3 py-1.5 text-sm" id="wallet-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translateText("Search Wallets…")} autoComplete="off" /></label>
        <span className="text-sm text-admin-muted">{translateText("Click a column to sort")}</span>
        <PageSizeControls value={pageSize} translateText={translateText} onChange={setPageSize} />
        <span className="ml-auto text-sm text-admin-muted max-[600px]:hidden" aria-live="polite">{translateText(resultLabel)}{isFetching ? ` · ${translateText("Loading more records…")}` : ""}</span>
      </div>
      {queryError ? <p className="field-error" role="alert">{translateText(queryError instanceof Error ? queryError.message : "Some Wallet records could not be loaded.")} <UiButton variant="link" size="sm" type="button" onClick={() => router.refresh()}>{translateText("Try again")}</UiButton></p> : null}
      {initialData.boardError ? <p className="field-error" role="alert">{translateText(initialData.boardError)} <UiButton variant="link" size="sm" type="button" onClick={() => router.refresh()}>{translateText("Try again")}</UiButton></p> : null}
      {!sortedRows.length ? <EmptyState title={translateText("No matching records")} description={search.trim() ? translateText("Clear your search to see more results.") : translateText("There are no records in this view.")} action={<UiButton variant="outline" type="button" onClick={resetView}>{translateText("Reset view")}</UiButton>} /> : <section className="overflow-x-auto wallet-board-table-wrap" aria-label={translateText("Wallets table")}><Table className={`${adminBoardTable} wallet-board-table`}><caption>{translateText("Wallets")}</caption><thead><tr><AdminSortableHeader label={translateText("Wallet / Member ID")} sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Member")} sortKey="member" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><th scope="col">{translateText("Email")}</th><AdminSortableHeader label={translateText("Current Wallet Balance")} sortKey="balance" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Latest Wallet Transaction Date")} sortKey="latestTransactionAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Wallet status")} sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><AdminSortableHeader label={translateText("Created")} sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr data-wallet-row={row.id} key={row.id} tabIndex={0} aria-label={`${translateText("Open Wallet")} ${row.id}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; openWalletDrawer(row, event.currentTarget); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openWalletDrawer(row, event.currentTarget); } }}><td><button className="row-record-button" type="button" data-wallet-drawer-trigger={row.id} aria-label={`${translateText("Open Wallet")} ${row.id}`} onClick={(event) => openWalletDrawer(row, event.currentTarget)}>{row.id}</button><small>{row.memberId}</small><div className="wallet-mobile-key-facts" aria-label={translateText("Wallet summary")}><div><span>{translateText("Current Wallet Balance")}</span><strong>{formatWalletMoney(row.currentBalanceSatang)}</strong></div><div><span>{translateText("Wallet Status")}</span><strong><Badge status={row.status} track={false} /></strong></div><div><span>{translateText("Latest Wallet Transaction Date")}</span><strong>{formatWalletDate(row.latestTransactionAt)}</strong></div></div></td><td>{row.memberAvailable ? <Link className="user-record-link" data-member-link={row.memberId} href={memberTabHref(row.memberId, "overview")} aria-label={`${translateText("Open Member")} ${row.memberName}`}><strong>{row.memberName}</strong></Link> : <strong>{row.memberName}</strong>}</td><td><strong>{row.email}</strong><small>{row.studentId || translateText("Student ID not provided")}</small></td><td className="money">{formatWalletMoney(row.currentBalanceSatang)}</td><td>{formatWalletDate(row.latestTransactionAt)}</td><td><Badge status={row.status} /></td><td>{formatWalletDate(row.createdAt)}</td></tr>)}</tbody></Table></section>}
      {sortedRows.length ? <Pagination page={currentPage} pageCount={totalPages} onPageChange={setPageNumber} ariaLabel={translateText("Wallets pagination")} previousLabel={translateText("Previous")} nextLabel={translateText("Next")} pageLabel={translateText("Page")} ofLabel={translateText("of")} className={adminBoardPagination} /> : null}
    </Card>
    {selectedWallet ? <WalletDrawer row={selectedWallet} dataSource={initialData.dataSource} opener={drawerOpenerRef.current} onClose={closeWalletDrawer} onStatusChanged={handleStatusChanged} /> : null}
  </main>;
}
