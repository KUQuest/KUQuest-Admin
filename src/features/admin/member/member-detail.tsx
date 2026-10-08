"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { Button, Card, CardContent, CardHeader, EmptyState, Table } from "../../../components/ui";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { adminRecordCount, adminRecordHeader, adminRecordHeading, adminRecordSection } from "../../../components/admin/admin-record-styles";
import { ADMIN_LEDGER_EVENT_TYPES } from "../api/admin-api";
import type { AdminTopUpListItem } from "../api/admin-api";
import { memberRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { payoutStatusLabel, questStateLabel, reportCaseStatusLabel } from "../domain/rulebook";
import { formatTopUpPaymentMethod, TopUpDetailDrawer } from "../finance/top-up-detail-drawer";
import { TOP_UP_BOARD_TABS } from "../finance/top-ups-board-model";
import { statusBadgeClass } from "../status-badge";
import { formatWalletMovementAmount, isWalletCompartmentAccountType, walletCompartmentLabel, walletEventTypeLabel } from "../wallet/wallet-model";
import { formatWalletStatementDateInput, parseWalletStatementDateInput } from "./member-wallet-model";
import {
  currentWalletBalance,
  formatMoneySatang,
  formatWalletDate,
  memberQuestHistoryStatusDate,
  memberQuestHistoryStatusLabel,
  memberStatusClass,
  memberStatusText,
  memberPenaltyHistoryItemKey,
  memberTabHref,
  walletStatusClass,
  walletStatusText,
  walletStatementRows,
  type MemberCollection,
  type MemberModel,
  type MemberReportEntry,
  type MemberTab,
} from "./member-model";
import { useMemberDetailQuery, useMemberTopUpsQuery } from "./member-query";
const emptyReviewRecords: NonNullable<MemberModel["reviews"]["items"]> = [];


function initials(model: MemberModel): string {
  return `${model.firstName.charAt(0)}${model.lastName.charAt(0)}`.toUpperCase() || "M";
}

function averageRating(model: MemberModel): string {
  const count = model.stats.reviewsReceivedCount;
  if (model.stats.averageRating === null
    || (model.reviews.complete && model.reviews.totalCount !== null && count !== null && model.reviews.totalCount !== count)) {
    return "—";
  }
  return model.stats.averageRating.toFixed(1);
}

function reviewCount(model: MemberModel): number | null {
  const { reviews } = model;
  const summaryCount = model.stats.reviewsReceivedCount;
  if (reviews.complete && reviews.totalCount !== null) {
    return summaryCount === null || summaryCount === reviews.totalCount
      ? reviews.totalCount
      : null;
  }
  return summaryCount;
}

function reviewStateMessage(model: MemberModel, translateText: (value: string) => string): string {
  const count = reviewCount(model);
  const collection = model.reviews;
  if (collection.error) return translateText(collection.error.message);
  if (count === 0) return translateText("No Reviews received.");
  if (count === null) return translateText("Review data is not verified.");
  if (collection.items === null || !collection.complete) {
    return translateText("Review details are not available.");
  }
  return translateText("Review data is not verified.");
}

function completedQuestCount(model: MemberModel): number | null {
  return model.stats.questsCompletedAsWorkerCount;
}

function collectionCountLabel<T>(
  collection: MemberCollection<T>,
  translateText: (value: string) => string,
  unavailableMessage: string,
  contractMessage?: string,
): string | number {
  if (collection.complete && collection.totalCount !== null) return collection.totalCount;
  if (collection.items?.length) return `${translateText("Records loaded")}: ${collection.items.length}`;
  if (collection.error) return translateText(collection.error.kind === "contract" && contractMessage ? contractMessage : collection.error.message);
  return translateText(unavailableMessage);
}

function collectionStateMessage<T>(
  collection: MemberCollection<T>,
  emptyMessage: string,
  unavailableMessage: string,
  translateText: (value: string) => string,
  contractMessage?: string,
): string | null {
  if (collection.items?.length) return null;
  if (collection.error) return translateText(collection.error.kind === "contract" && contractMessage ? contractMessage : collection.error.message);
  if (collection.items === null || !collection.complete) return translateText(unavailableMessage);
  return translateText(emptyMessage);
}

function reportsReceivedCountLabel(
  model: MemberModel,
  translateText: (value: string) => string,
): string | number {
  return collectionCountLabel(model.reportsReceived, translateText, "Reports received are not available.");
}

function statusBadge(model: MemberModel, translateText: (value: string) => string) {
  const label = memberStatusText(model);
  return model.memberStatus
    ? <span className={`badge ${memberStatusClass(model)}`}>{translateText(label)}</span>
    : <span className="audit-note">{translateText(label)}</span>;
}

function walletBadge(model: MemberModel, translateText: (value: string) => string) {
  return model.walletStatus
    ? <span className={`badge ${walletStatusClass(model)}`}>{translateText(walletStatusText(model))}</span>
    : <span className="audit-note">{translateText(walletStatusText(model))}</span>;
}
function walletReadWarningText(model: MemberModel, translateText: (value: string) => string): string | null {
  const state = model.walletReadState;
  if (state.kind === "absent" && state.warning?.kind === "request") {
    return translateText("Member Finance could not be loaded. The Member detail response reports no Wallet.");
  }
  if (state.kind !== "available" || !state.warning) return null;
  if (state.warning.kind === "contract") return translateText("Wallet data conflicts with the API contract.");
  if (state.source === "member-detail") {
    return translateText("Member detail Wallet snapshot is shown because the Finance read failed.");
  }
  return translateText(state.warning.message);
}

function latestWalletTransactionAt(model: MemberModel): string | null {
  const transactions = model.walletStatement.items;
  const walletId = model.walletId;
  if (!model.walletStatement.complete || transactions === null || walletId === null) return null;
  return transactions
    .filter((transaction) => transaction.sealedAt !== null
      && transaction.isBalanced
      && transaction.postings.some((posting) => posting.walletId === walletId && isWalletCompartmentAccountType(posting.accountType)))
    .reduce<string | null>((latest, transaction) => {
      if (!latest || Date.parse(transaction.createdAt) > Date.parse(latest)) return transaction.createdAt;
      return latest;
    }, null);
}


function walletBalanceText(
  model: MemberModel,
  translateText: (value: string) => string,
  amountSatang: number | undefined,
): string {
  if (model.walletReadState.kind === "absent") return translateText("This Member has no Wallet.");
  if (model.walletReadState.kind === "conflict") return translateText("Wallet data conflicts.");
  if (model.walletReadState.kind === "contract-error") return translateText("Wallet data conflicts with the API contract.");
  if (model.walletReadState.kind === "request-error") return translateText("Member finance could not be loaded.");
  if (model.walletReadState.kind === "unavailable") return translateText("Wallet data is not verified.");
  if (model.walletProjectionMatchesLedger === false) return translateText("Wallet balance does not match the Ledger.");
  if (!model.walletBalances || amountSatang === undefined) return translateText("Wallet data is not verified.");
  return formatMoneySatang(amountSatang);
}

function latestWalletTransactionLabel(model: MemberModel, translateText: (value: string) => string): string {
  const state = model.walletReadState;
  if (state.kind === "absent") return translateText("This Member has no Wallet.");
  if (state.kind === "request-error") return translateText("Could not read the latest Ledger Transaction date.");
  if (state.kind === "contract-error") return translateText("Wallet data conflicts with the API contract.");
  if (state.kind === "conflict") return translateText("Wallet data conflicts.");
  if (state.kind === "unavailable") return translateText("Latest Wallet Transaction date is not verified.");
  if (model.walletStatement.error?.kind === "request") {
    return translateText("Could not read the latest Ledger Transaction date.");
  }
  if (model.walletStatement.error?.kind === "contract") {
    return translateText("Wallet data conflicts with the API contract.");
  }
  if (!model.walletStatement.complete) return translateText("Latest Wallet Transaction date is not verified.");
  const latest = latestWalletTransactionAt(model);
  return latest ? formatWalletDate(latest) : translateText("No Ledger Transactions yet.");
}

function MemberSummary({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const tags = model.profileTags.items ?? [];
  const tagsState = collectionStateMessage(
    model.profileTags,
    "No Profile Tags.",
    "Profile Tags are not available.",
    translateText,
  );
  return (
    <Card as="section" className="mb-[18px] p-[18px]">
      <div className="grid !grid-cols-[minmax(250px,1.35fr)_minmax(300px,1fr)] items-start gap-5 max-[1100px]:!grid-cols-[minmax(250px,1fr)_minmax(270px,1fr)] max-[600px]:!grid-cols-1">
        <div className="user-summary-identity flex min-w-0 items-start gap-3.5">
          <span className="user-profile-avatar grid size-[58px] shrink-0 place-items-center rounded-full bg-admin-avatar text-xl font-bold text-admin-accent-strong">{initials(model)}</span>
          <div>
            <h2 className="mb-0 text-[22px] leading-[1.3]">{model.title}</h2>
            {model.displayId ? <p className="m-0 block text-[15px] leading-[1.45] text-admin-muted">{model.displayId}</p> : null}
            <p className="m-0 block text-[15px] leading-[1.45] text-admin-muted">{model.faculty || translateText("Academic profile not recorded")}</p>
            <p className="m-0 block text-[15px] leading-[1.45] text-admin-muted">Kasetsart University</p>
            <a className="mt-[3px] block text-[15px] leading-[1.45] text-admin-accent no-underline hover:underline" href={`mailto:${model.email}`}>{model.email}</a>
            <div className="user-detail-tags mt-2.5 flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => <span className="rounded-full border border-admin-border px-2 py-[3px] text-[13px] text-admin-muted" key={tag}>{tag}</span>)}
              {tagsState ? <span className="text-[13px] text-admin-muted" role={model.profileTags.error ? "alert" : undefined}>{tagsState}</span> : null}
            </div>
          </div>
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="flex justify-end">{statusBadge(model, translateText)}</div>
          <div className="grid !grid-cols-3 border-l border-admin-border max-[600px]:border-l-0 max-[600px]:border-t max-[600px]:pt-3">
            <div className="grid min-w-0 !grid-cols-1 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{averageRating(model)}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Rating")}</span></div>
            <div className="grid min-w-0 !grid-cols-1 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{reviewCount(model) ?? translateText("Review data is not verified.")}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Reviews")}</span></div>
            <div className="grid min-w-0 !grid-cols-1 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{completedQuestCount(model) ?? translateText("Not provided by the Admin API")}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Completed quests as Worker")}</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MemberAccountInfo({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const balances = model.walletBalances;
  const facts: Array<[string, React.ReactNode]> = [
    ["Member status", statusBadge(model, translateText)],
    ["Wallet status", walletBadge(model, translateText)],
    ["Current Wallet Balance", walletBalanceText(model, translateText, balances ? currentWalletBalance(balances) : undefined)],
    ["Spending Balance", walletBalanceText(model, translateText, balances?.spendingBalanceSatang)],
    ["Earnings Balance", walletBalanceText(model, translateText, balances?.earningsBalanceSatang)],
    ["Funding Reserved", walletBalanceText(model, translateText, balances?.fundingReservedSatang)],
    ["Reserved For Payouts", walletBalanceText(model, translateText, balances?.reservedForPayoutsSatang)],
    ["Latest Wallet Transaction Date", latestWalletTransactionLabel(model, translateText)],
    ["Email", model.email],
    ["Created", model.createdAt],
    ["Role", model.occupation ? translateText(model.occupation) : translateText("Student")],
    ["Faculty", model.faculty || translateText("Not recorded")],
  ];
  const warning = walletReadWarningText(model, translateText);
  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush><h2>{translateText("Account Information")}</h2></CardHeader>
      {warning ? <p className="audit-note" role="alert">{warning}</p> : null}
      <dl className="user-facts m-0 grid gap-0">{facts.map(([label, value]) => <div className="flex justify-between gap-3 border-t border-admin-border py-2 first:border-t-0 first:pt-0" key={label}><dt className="text-sm text-admin-muted">{translateText(label)}</dt><dd className="m-0 text-right text-sm font-semibold">{value}</dd></div>)}</dl>
    </Card>
  );
}

function MemberModerationSummary({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const summary = model.penaltyHistory.summary;
  const summaryState = collectionStateMessage(
    model.penaltyHistory,
    "Confirmed violation count is not available.",
    "Confirmed violation count is not available.",
    translateText,
  );
  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush><h2>{translateText("Moderation Summary")}</h2></CardHeader>
      <div className="user-counter-list mb-3.5 grid grid-cols-2 border-y border-admin-border">
        <div className="grid content-start gap-[3px] border-r border-b border-admin-border px-2 py-[9px]"><strong className="text-xl">{reportsReceivedCountLabel(model, translateText)}</strong><span className="text-xs text-admin-muted">{translateText("Reports received")}</span></div>
        <div className="grid content-start gap-[3px] border-b border-admin-border px-2 py-[9px]"><strong className="text-xl">{summary?.confirmedMisconductCount ?? translateText("Confirmed violation count is not available.")}</strong><span className="text-xs text-admin-muted">{translateText("Confirmed violations")}</span></div>
        <div className="grid content-start gap-[3px] border-r border-admin-border px-2 py-[9px]"><strong className="text-xl">{summary?.effectiveActiveMisconductPenaltyCount ?? translateText("Moderation history is not available.")}</strong><span className="text-xs text-admin-muted">{translateText("Effective active misconduct penalties")}</span></div>
        <div className="grid content-start gap-[3px] px-2 py-[9px]"><strong className="text-xl">{summary?.reviewLadderRecordCount ?? translateText("Moderation history is not available.")}</strong><span className="text-xs text-admin-muted">{translateText("Review ladder records")}</span></div>
      </div>
      {model.penaltyHistory.error ? <p className="audit-note" role="alert">{translateText(model.penaltyHistory.error.message)}</p> : summaryState && !summary ? <p className="audit-note">{summaryState}</p> : null}
    </Card>
  );
}

function MemberRecentReports({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const reports = model.reportsReceived.items ?? [];
  const state = collectionStateMessage(
    model.reportsReceived,
    "No Reports received.",
    "Reports received are not available.",
    translateText,
  );
  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush className="user-panel-heading flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2>{translateText("Recent Reports")}</h2>
          <p>{translateText("Report Cases and Conduct Reports filed against this Member.")}</p>
        </div>
        <span className={adminRecordCount}>{reportsReceivedCountLabel(model, translateText)}</span>
      </CardHeader>
      {reports.length ? (
        <div className="user-recent-reports grid">
          {reports.slice(0, 3).map((report) => (
            <Link className="flex items-center justify-between gap-3 border-t border-admin-border py-2.5 text-admin-text no-underline first:border-t-0 hover:[&>span:first-child_strong]:text-admin-accent" key={report.id} href={report.href}>
              <span className="min-w-0">
                <strong className="block text-[15px] leading-[1.4]">{report.displayId || translateText(report.kind)}</strong>
                <small className="mt-0.5 block text-[15px] leading-[1.45] text-admin-muted">{translateText(report.category)}</small>
              </span>
              <span className={`badge shrink-0 ${statusBadgeClass(report.status)}`}>{translateText(reportCaseStatusLabel(report.status))}</span>
            </Link>
          ))}
        </div>
      ) : null}
      {state ? <p className="audit-note" role={model.reportsReceived.error ? "alert" : undefined}>{state}</p> : null}
      {reports.length && model.reportsReceived.error ? <p className="audit-note" role="alert">{translateText(model.reportsReceived.error.message)}</p> : null}
    </Card>
  );
}

function MemberAbout({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const experiences = model.workExperiences.items ?? [];
  const state = collectionStateMessage(
    model.workExperiences,
    "No Work Experience records.",
    "Work Experience is not available.",
    translateText,
  );
  return (
    <>
      <Card as="section" className="user-detail-panel p-[16px_18px]"><CardHeader flush><h2>{translateText("About Me")}</h2></CardHeader><p className="user-about-copy m-0 leading-[1.6] text-admin-muted">{model.bio || translateText("No profile description is available.")}</p></Card>
      <Card as="section" className="user-detail-panel p-[16px_18px]">
        <CardHeader flush className="user-panel-heading flex items-center justify-between gap-3">
          <h2>{translateText("Work Experience")}</h2>
          <span className={adminRecordCount}>{collectionCountLabel(model.workExperiences, translateText, "Work Experience is not available.")}</span>
        </CardHeader>
        {experiences.map((experience) => <article className="border-t border-admin-border py-3 first:border-t-0" key={`${experience.title}-${experience.employmentType}-${experience.organization ?? ""}-${experience.startedAt}-${experience.endedAt ?? ""}-${experience.description ?? ""}`}>
          <strong className="block text-[17px]">{experience.title}</strong>
          <p className="m-0 text-admin-muted">{translateText(experience.employmentType)}{experience.organization ? ` · ${experience.organization}` : ""}</p>
          <p className="m-0 text-admin-muted">{experience.startedAt} – {experience.endedAt ?? translateText("Present")}</p>
          {experience.description ? <p className="mb-0 text-admin-muted">{experience.description}</p> : null}
        </article>)}
        {state ? <p className="audit-note" role={model.workExperiences.error ? "alert" : undefined}>{state}</p> : null}
        {experiences.length > 0 && model.workExperiences.error ? <p className="audit-note" role="alert">{translateText(model.workExperiences.error.message)}</p> : null}
      </Card>
    </>
  );
}

function MemberCertificates({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const certificates = model.certificates.items ?? [];
  const state = collectionStateMessage(
    model.certificates,
    "No Certificates.",
    "Certificates are not available.",
    translateText,
  );
  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush className="user-panel-heading flex items-center justify-between gap-3">
        <h2>{translateText("Certificates")}</h2>
        <span className={adminRecordCount}>{collectionCountLabel(model.certificates, translateText, "Certificates are not available.")}</span>
      </CardHeader>
      {certificates.map((certificate) => <article className="border-t border-admin-border py-3 first:border-t-0" key={`${certificate.name}-${certificate.issuer}-${certificate.issuedAt}-${certificate.image?.contentType ?? ""}-${certificate.image?.sizeBytes ?? ""}`}>
        <strong className="block text-[17px]">{certificate.name}</strong>
        <p className="m-0 text-admin-muted">{certificate.issuer} · {certificate.issuedAt}</p>
        {certificate.image ? <small className="text-admin-muted">{certificate.image.contentType} · {certificate.image.sizeBytes} bytes</small> : null}
      </article>)}
      {state ? <p className="audit-note" role={model.certificates.error ? "alert" : undefined}>{state}</p> : null}
      {certificates.length > 0 && model.certificates.error ? <p className="audit-note" role="alert">{translateText(model.certificates.error.message)}</p> : null}
    </Card>
  );
}

function MemberPayoutPreview({
  model,
  translateText,
  className = "user-detail-panel p-[16px_18px]",
  preview = false,
}: {
  model: MemberModel;
  translateText: (value: string) => string;
  className?: string;
  preview?: boolean;
}) {
  const payouts = model.payouts.items ?? [];
  const successfulPayouts = payouts.filter((payout) => payout.status === "SUCCEEDED");
  const successfulAmountSatang = successfulPayouts.reduce((total, payout) => total + payout.amountSatang, 0);
  const payoutSummaryMismatch = model.payouts.complete && model.payouts.items !== null
    && ((model.stats.payoutsCount !== null && model.stats.payoutsCount !== successfulPayouts.length)
      || (model.stats.totalPaidOutSatang !== null && model.stats.totalPaidOutSatang !== successfulAmountSatang));
  const payoutCountText = payoutSummaryMismatch || model.stats.payoutsCount === null
    ? translateText("Payout data is not verified.")
    : model.stats.payoutsCount;
  const totalText = payoutSummaryMismatch || model.stats.totalPaidOutSatang === null
    ? translateText("Payout data is not verified.")
    : formatMoneySatang(model.stats.totalPaidOutSatang);
  const payoutContractMessage = "Payout data does not match the Admin API contract.";
  const state = collectionStateMessage(
    model.payouts,
    "No Payouts.",
    "Payout details are not available.",
    translateText,
    payoutContractMessage,
  );
  const payoutErrorText = model.payouts.error
    ? translateText(model.payouts.error.kind === "contract" ? payoutContractMessage : model.payouts.error.message)
    : null;
  const shownPayouts = preview ? payouts.slice(0, 3) : payouts;

  return (
    <Card as="section" className={className}>
      <CardHeader flush className="user-panel-heading flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2>{translateText("Payouts")}</h2>
          <p>{translateText("Summary shows successful Payout totals. History shows all statuses.")}</p>
        </div>
        <span className={adminRecordCount}>{collectionCountLabel(model.payouts, translateText, "Payout details are not available.", payoutContractMessage)}</span>
      </CardHeader>
      <div className="user-payout-stat-list mb-3 grid grid-cols-2 border-y border-admin-border">
        <div className="grid gap-[3px] border-r border-admin-border px-2 py-[9px]"><strong className="text-[17px]">{payoutCountText}</strong><span className="text-xs text-admin-muted">{translateText("Successful Payouts")}</span></div>
        <div className="grid gap-[3px] px-2 py-[9px]"><strong className="text-[17px]">{totalText}</strong><span className="text-xs text-admin-muted">{translateText("Total paid out")}</span></div>
      </div>
      {payoutErrorText && payouts.length > 0 ? <p className="audit-note" role="alert">{payoutErrorText}</p> : null}
      {shownPayouts.length ? (
        <div className="user-payout-list grid">
          {shownPayouts.map((payout) => (
            <div className="user-payout-row flex w-full items-center justify-between gap-3 border-0 border-t border-admin-border bg-transparent py-2.5 text-left text-admin-text first:border-t-0" key={payout.id}>
              <span className="user-payout-primary grid min-w-0 gap-0.5">
                <strong className="text-[17px] leading-[1.4]">{payout.displayId ?? translateText("Payout")}</strong>
                <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-[1.45] text-admin-muted">{payout.createdAt}</small>
                {(payout.bankName || payout.maskedDestinationValue) ? <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-[1.45] text-admin-muted">{[payout.bankName, payout.maskedDestinationValue].filter(Boolean).join(" · ")}</small> : null}
              </span>
              <span className="user-payout-secondary grid shrink-0 justify-items-end gap-0.5">
                <strong className="text-[17px] leading-[1.4]">{formatMoneySatang(payout.amountSatang)}</strong>
                <small className="text-[15px] leading-[1.45] text-admin-muted">{translateText(payoutStatusLabel(payout.status))}</small>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {state ? <p className="audit-note" role={model.payouts.error ? "alert" : undefined}>{state}</p> : null}
    </Card>
  );
}

function MemberReviewPreview({ model, translateText, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onOpenReviews: () => void }) {
  const reviews = model.reviews.items ?? [];
  const count = reviewCount(model);
  const state = collectionStateMessage(
    model.reviews,
    reviewStateMessage(model, translateText),
    count === null ? "Review data is not verified." : "Review details are not available.",
    translateText,
  );
  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush className="user-panel-heading">
        <div>
          <h2>{translateText("Reviews")}</h2>
          <div className="flex flex-wrap items-baseline gap-2 text-[15px] text-admin-muted">
            <strong className="text-[17px] text-admin-text">{averageRating(model)} ★</strong>
            <span className="text-base">{count === null ? translateText("Review data is not verified.") : `(${count})`}</span>
          </div>
        </div>
        <span className={adminRecordCount}>{collectionCountLabel(model.reviews, translateText, "Review details are not available.")}</span>
        <Button variant="link" size="sm" type="button" onClick={onOpenReviews}>{translateText("View all")}</Button>
      </CardHeader>
      {reviews.slice(0, 5).map((review) => <div className="flex items-center justify-between gap-3 border-t border-admin-border py-2.5 first:border-t-0" key={review.id}>
        <span>
          <strong className="block text-[17px] leading-[1.4]">{review.reviewer.name}</strong>
          <small className="mt-0.5 block text-[15px] leading-[1.45] text-admin-muted">{review.reviewer.displayId} · {"★".repeat(review.rating)} · {formatAdminTimestamp(review.createdAt, "Asia/Bangkok")}</small>
          <small className="block text-[15px] leading-[1.45] text-admin-muted">{review.quest.displayId} · {review.quest.title}</small>
        </span>
      </div>)}
      {state ? <p className="audit-note" role={model.reviews.error ? "alert" : undefined}>{state}</p> : null}
      {reviews.length > 0 && model.reviews.error ? <p className="audit-note" role="alert">{translateText(model.reviews.error.message)}</p> : null}
    </Card>
  );
}

function OverviewTab({ model, translateText, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onOpenReviews: () => void }) {
  return (
    <div className="grid !grid-cols-[minmax(0,1.6fr)_minmax(280px,0.72fr)] items-start gap-[18px] max-[900px]:!grid-cols-1">
      <div className="grid min-w-0 !grid-cols-1 gap-[18px] max-[900px]:contents">
        <MemberAbout model={model} translateText={translateText} />
        <MemberPayoutPreview model={model} translateText={translateText} preview />
        <MemberCertificates model={model} translateText={translateText} />
        <MemberReviewPreview model={model} translateText={translateText} onOpenReviews={onOpenReviews} />
      </div>
      <aside className="grid min-w-0 !grid-cols-1 gap-[18px] max-[900px]:contents"><MemberAccountInfo model={model} translateText={translateText} /><MemberModerationSummary model={model} translateText={translateText} /><MemberRecentReports model={model} translateText={translateText} /></aside>
    </div>
  );
}

function ActivityTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const history = model.questHistory.items ?? [];
  const state = collectionStateMessage(
    model.questHistory,
    "No Quest history.",
    "Quest history is not available.",
    translateText,
  );
  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]">
      <CardHeader flush className="user-panel-heading">
        <h2>{translateText("Quest history")}</h2>
        <span className={adminRecordCount}>{collectionCountLabel(model.questHistory, translateText, "Quest history is not available.")}</span>
      </CardHeader>
      {history.length ? (
        <div className="user-quest-history-list grid">
          {history.map((entry) => {
            const quest = entry.quest;
            const status = memberQuestHistoryStatusLabel(entry);
            const statusDate = memberQuestHistoryStatusDate(entry);
            return <Link className="user-quest-history-row grid grid-cols-[minmax(0,1fr)_auto] gap-[18px] border-t border-admin-border py-[15px] text-admin-text no-underline first:border-t-0 first:pt-0 hover:text-admin-accent max-[900px]:grid-cols-1 max-[900px]:gap-2.5" key={`${entry.role}:${quest.id}`} href={entry.href}>
              <div className="user-quest-history-primary min-w-0">
                <div className="user-quest-history-title flex flex-wrap items-baseline gap-[7px]">
                  <strong className="text-[17px] leading-[1.4]">{quest.title}</strong>
                  <span className="text-[15px] leading-[1.4] text-admin-muted">{quest.displayId}</span>
                </div>
                <div className="user-quest-history-fields mt-2.5 grid grid-cols-[minmax(120px,.8fr)_minmax(155px,1fr)_minmax(250px,1.7fr)_minmax(115px,.8fr)] gap-3 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
                  <div className="user-quest-history-field grid min-w-0 content-start gap-0.5"><span className="text-[15px] leading-[1.4] text-admin-muted">{translateText("Role")}</span><strong className="text-[17px] leading-[1.4]">{translateText(entry.role)}</strong></div>
                  <div className="user-quest-history-field grid min-w-0 content-start gap-0.5"><span className="text-[15px] leading-[1.4] text-admin-muted">{translateText(entry.role === "WORKER" ? "Assignment status" : "Quest status")}</span><strong className="text-[17px] leading-[1.4]">{translateText(status)}</strong></div>
                  <div className="user-quest-history-field grid min-w-0 content-start gap-0.5"><span className="text-[15px] leading-[1.4] text-admin-muted">{translateText(entry.role === "WORKER" ? "Assignment status date" : "Quest status date")}</span><strong className="text-[17px] leading-[1.4]">{statusDate ? formatAdminTimestamp(statusDate, "Asia/Bangkok") : translateText("Not provided by the Admin API")}</strong></div>
                  {entry.startedAt ? <div className="user-quest-history-field grid min-w-0 content-start gap-0.5"><span className="text-[15px] leading-[1.4] text-admin-muted">{translateText("Started Work")}</span><strong className="text-[17px] leading-[1.4]">{formatAdminTimestamp(entry.startedAt, "Asia/Bangkok")}</strong></div> : null}
                </div>
                {entry.relatedMembers.length ? <p className="mb-0 mt-2 text-[15px] text-admin-muted">{entry.relatedMembers.map((related) => `${related.role}: ${related.member.displayId} · ${related.member.firstName} ${related.member.lastName}`).join(" · ")}</p> : null}
              </div>
            </Link>;
          })}
        </div>
      ) : null}
      {state ? <p className="audit-note" role={model.questHistory.error ? "alert" : undefined}>{state}</p> : null}
      {history.length && model.questHistory.error ? <p className="audit-note" role="alert">{translateText(model.questHistory.error.message)}</p> : null}
    </Card>
  );
}

function PayoutsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return <MemberPayoutPreview model={model} translateText={translateText} className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]" />;
}

function MemberTopUpsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const topUpQuery = useMemberTopUpsQuery(model.id, true);
  const topUps = useMemo(
    () => topUpQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [topUpQuery.data?.pages],
  );
  const [selectedTopUp, setSelectedTopUp] = useState<AdminTopUpListItem | null>(null);
  const [drawerOpener, setDrawerOpener] = useState<HTMLElement | null>(null);
  const error = topUpQuery.error instanceof Error ? topUpQuery.error.message : null;

  function openTopUp(topUp: AdminTopUpListItem, opener: HTMLElement) {
    setDrawerOpener(opener);
    setSelectedTopUp(topUp);
  }

  return <>
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]" data-member-top-ups>
      <CardHeader flush className="user-panel-heading">
        <div><h2>{translateText("Top-ups")}</h2><p>{translateText("Top-up records for this Member.")}</p></div>
        <span className={adminRecordCount}>{topUps.length} {translateText("shown")}</span>
      </CardHeader>
      {topUpQuery.isPending ? <p className="audit-note" aria-live="polite">{translateText("Loading Top-ups…")}</p> : null}
      {error && !topUps.length ? <div className="m-3 rounded-admin-sm border border-admin-danger bg-admin-danger-soft p-3 text-sm" role="alert">{translateText(error)} <Button variant="outline" size="sm" type="button" onClick={() => { void topUpQuery.refetch(); }}>{translateText("Try again")}</Button></div> : null}
      {!topUpQuery.isPending && !error && !topUps.length ? <EmptyState title={translateText("No Top-ups found")} description={translateText("This Member has no Top-up records.")} /> : null}
      {topUps.length ? <>
        {error ? <p className="field-error" role="alert">{translateText(error)}</p> : null}
        <p className="mb-2 hidden rounded-[7px] border border-admin-border bg-admin-soft px-2.5 py-2 text-[15px] leading-[1.4] text-admin-muted max-[600px]:block">{translateText("On narrow screens, scroll horizontally to view all Top-up columns.")}</p>
        <div className="min-w-0 overflow-x-auto [scrollbar-gutter:stable] max-[600px]:[overscroll-behavior-inline:contain]" role="region" aria-label={translateText("Member Top-ups table")}>
          <Table className="min-w-[900px] [&_td_small]:mt-[3px] [&_td.money]:whitespace-nowrap">
            <caption>{translateText("Top-ups for this Member")}</caption>
            <thead><tr><th>{translateText("Top-up")}</th><th>{translateText("Credit amount")}</th><th>{translateText("Payment total")}</th><th>{translateText("Payment method")}</th><th>{translateText("Status")}</th><th>{translateText("Created")}</th><th>{translateText("Paid at")}</th></tr></thead>
            <tbody>{topUps.map((topUp) => {
              const statusLabel = TOP_UP_BOARD_TABS.find((tab) => tab.id === topUp.topUpStatus)?.label ?? topUp.topUpStatus;
              return <tr
                data-member-top-up-row={topUp.id}
                key={topUp.id}
              >
                <td><button className="row-record-button" type="button" data-member-top-up-drawer-trigger={topUp.id} aria-label={`${translateText("Open Top-up")} ${topUp.displayId}`} onClick={(event) => openTopUp(topUp, event.currentTarget)}>{topUp.displayId}</button><small>{topUp.providerReference ?? translateText("Provider reference not provided")}</small></td>
                <td className="money">{formatMoneySatang(topUp.creditAmountSatang)}</td>
                <td className="money">{formatMoneySatang(topUp.paymentTotalSatang)}</td>
                <td>{translateText(formatTopUpPaymentMethod(topUp.paymentMethod))}</td>
                <td><span className={`badge ${statusBadgeClass(topUp.topUpStatus)}`}>{translateText(statusLabel)}</span></td>
                <td><time dateTime={topUp.createdAt}>{formatAdminTimestamp(topUp.createdAt)}</time></td>
                <td>{topUp.paidAt ? <time dateTime={topUp.paidAt}>{formatAdminTimestamp(topUp.paidAt)}</time> : "—"}</td>
              </tr>;
            })}</tbody>
          </Table>
        </div>
      </> : null}
      {topUpQuery.hasNextPage ? <div className="border-t border-admin-border px-1 py-3 text-sm text-admin-muted">
        <Button variant="outline" size="sm" type="button" onClick={() => { void topUpQuery.fetchNextPage(); }} disabled={topUpQuery.isFetchingNextPage}>{translateText(topUpQuery.isFetchingNextPage ? "Loading more Top-ups…" : "Load more Top-ups")}</Button>
      </div> : null}
    </Card>
    {selectedTopUp ? <TopUpDetailDrawer topUp={selectedTopUp} opener={drawerOpener} onClose={() => setSelectedTopUp(null)} showMemberProfileLink={false} /> : null}
  </>;
}
function WalletStatementDateField({
  name,
  label,
  value,
  hasError,
  onChange,
  translateText,
}: {
  name: "from" | "to";
  label: string;
  value: string;
  hasError: boolean;
  onChange: (value: string) => void;
  translateText: (value: string) => string;
}) {
  const pickerValue = parseWalletStatementDateInput(value) || "";
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value);
  const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => onChange(formatWalletStatementDateInput(event.currentTarget.value));

  return (
    <div className="grid gap-1 text-[15px] font-semibold leading-[1.4] text-admin-muted">
      <label htmlFor={`wallet-statement-${name}`}>{translateText(label)}</label>
      <div className="grid grid-cols-[minmax(0,1fr)_35px] gap-1">
        <input
          id={`wallet-statement-${name}`}
          className="min-h-[35px] w-full rounded-[7px] border border-admin-border-strong bg-admin-surface px-2 text-admin-text"
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          value={value}
          aria-invalid={hasError}
          aria-describedby={hasError ? "wallet-statement-date-error" : undefined}
          onChange={handleTextChange}
        />
        <span className="relative inline-flex h-[35px] w-[35px] items-center justify-center rounded-[7px] border border-admin-border bg-admin-surface text-admin-text hover:bg-admin-hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-admin-accent">
          <CalendarDays aria-hidden="true" size={16} />
          <input
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            type="date"
            aria-label={translateText("Open date picker")}
            value={pickerValue}
            onChange={handlePickerChange}
          />
        </span>
      </div>
    </div>
  );
}

function WalletStatementTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const [filters, setFilters] = useState({ eventType: "", from: "", to: "" });
  const [dateInputValues, setDateInputValues] = useState({ from: "", to: "" });
  const [dateInputError, setDateInputError] = useState("");
  const [visibleCount, setVisibleCount] = useState(25);
  const transactions = model.walletStatement.items ?? [];
  const walletAvailable = model.walletReadState.kind === "available" && model.walletBalances !== null;
  const projectionVerified = model.walletProjectionMatchesLedger === true;
  const displayBalances = walletAvailable && projectionVerified ? model.walletBalances : null;
  const statementVerified = walletAvailable
    && projectionVerified
    && model.walletStatement.complete
    && model.walletStatement.items !== null;
  const filteredRows = statementVerified
    ? walletStatementRows({
      walletId: model.walletId,
      walletBalances: model.walletBalances,
      walletStatement: transactions,
    }, filters, transactions.length)
    : [];
  const rows = filteredRows.slice(0, visibleCount);
  const hasEligibleTransactions = latestWalletTransactionAt(model) !== null;

  useEffect(() => {
    setVisibleCount(25);
    setFilters({ eventType: "", from: "", to: "" });
    setDateInputValues({ from: "", to: "" });
    setDateInputError("");
  }, [model.id]);

  const handleFromDateChange = (value: string) => {
    setDateInputValues((current) => ({ ...current, from: value }));
    setDateInputError("");
  };
  const handleToDateChange = (value: string) => {
    setDateInputValues((current) => ({ ...current, to: value }));
    setDateInputError("");
  };
  const clearFilters = () => {
    setFilters({ eventType: "", from: "", to: "" });
    setDateInputValues({ from: "", to: "" });
    setDateInputError("");
    setVisibleCount(25);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = parseWalletStatementDateInput(String(form.get("from") || ""));
    const to = parseWalletStatementDateInput(String(form.get("to") || ""));
    if (from === null || to === null) {
      setDateInputError(translateText("Enter dates as DD/MM/YYYY."));
      return;
    }
    setDateInputError("");
    setFilters({
      eventType: String(form.get("eventType") || ""),
      from,
      to,
    });
    setVisibleCount(25);
  };

  const statementError = (() => {
    const state = model.walletReadState;
    if (state.kind === "absent") return "Member นี้ไม่มี Wallet";
    if (state.kind === "request-error") return "อ่าน Wallet Statement ไม่สำเร็จ";
    if (state.kind === "conflict") return "ข้อมูล Wallet ขัดแย้งกัน";
    if (state.kind === "contract-error") return "ข้อมูล Wallet ไม่ตรงตามสัญญา API";
    if (state.kind === "unavailable") return "ยังไม่ยืนยันข้อมูล Wallet Statement";
    if (model.walletProjectionMatchesLedger === false) return "ยอด Wallet ไม่ตรงกับ Ledger";
    if (model.walletStatement.error?.kind === "request") return "อ่าน Wallet Statement ไม่สำเร็จ";
    if (model.walletStatement.error?.kind === "contract") return "ข้อมูล Wallet Statement ไม่ตรงตามสัญญา API";
    if (!model.walletStatement.complete || model.walletStatement.items === null) {
      return "ยังไม่ยืนยันข้อมูล Wallet Statement";
    }
    return null;
  })();

  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]" data-user-wallet-statement>
      <CardHeader flush className="user-panel-heading">
        <div>
          <h2>{translateText("Wallet Statement")}</h2>
          <p>{translateText("Committed and sealed Ledger Transactions affecting this Wallet.")}</p>
        </div>
      </CardHeader>
      {displayBalances ? (
        <div className="wallet-statement-balance-grid mb-3.5 grid grid-cols-4 gap-2.5 max-[720px]:grid-cols-2 max-[420px]:grid-cols-1">
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Spending Balance")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(displayBalances.spendingBalanceSatang)}</strong></div>
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Earnings Balance")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(displayBalances.earningsBalanceSatang)}</strong></div>
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Funding Reserved")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(displayBalances.fundingReservedSatang)}</strong></div>
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Reserved For Payouts")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(displayBalances.reservedForPayoutsSatang)}</strong></div>
        </div>
      ) : null}
      {walletReadWarningText(model, translateText) ? <p className="audit-note" role="alert">{walletReadWarningText(model, translateText)}</p> : null}
      {!statementVerified ? <p className="audit-note" role={model.walletStatement.error || model.walletReadState.kind === "contract-error" || model.walletReadState.kind === "conflict" ? "alert" : undefined}>{translateText(statementError ?? "ยังไม่ยืนยันข้อมูล Wallet Statement")}</p> : (
        <>
          <form className="wallet-statement-filters mb-3.5 grid grid-cols-[minmax(0,1.3fr)_repeat(2,minmax(130px,1fr))_auto] items-end gap-[9px] max-[720px]:grid-cols-2 max-[420px]:grid-cols-1" onSubmit={submit}>
            <label className="grid gap-1 text-[15px] font-semibold leading-[1.4] text-admin-muted max-[720px]:col-span-full max-[420px]:col-span-1">{translateText("Event type")}<select className="min-h-[35px] w-full rounded-[7px] border border-admin-border-strong bg-admin-surface px-2 text-admin-text" name="eventType" aria-label={translateText("Event type")} defaultValue=""><option value="">{translateText("All event types")}</option>{ADMIN_LEDGER_EVENT_TYPES.map((eventType) => <option key={eventType} value={eventType}>{translateText(walletEventTypeLabel(eventType))}</option>)}</select></label>
            <WalletStatementDateField name="from" label="From" value={dateInputValues.from} hasError={Boolean(dateInputError)} onChange={handleFromDateChange} translateText={translateText} />
            <WalletStatementDateField name="to" label="To" value={dateInputValues.to} hasError={Boolean(dateInputError)} onChange={handleToDateChange} translateText={translateText} />
            <Button className="min-h-[35px]" variant="primary" type="submit">{translateText("Apply filters")}</Button>
            <Button className="min-h-[35px]" variant="outline" type="button" onClick={clearFilters}>{translateText("Clear")}</Button>
            {dateInputError ? <p className="col-span-full m-0 text-sm text-admin-danger" id="wallet-statement-date-error" role="alert" aria-live="polite">{dateInputError}</p> : null}
          </form>
          {rows.length ? (
            <div className="wallet-statement-table-block min-w-0">
              <p className="wallet-statement-scroll-hint mb-2 hidden rounded-[7px] border border-admin-border bg-admin-soft px-2.5 py-2 text-[15px] leading-[1.4] text-admin-muted max-[600px]:block">{translateText("On narrow screens, scroll horizontally to view all Wallet Statement columns.")}</p>
              <div className="wallet-statement-table-wrap min-w-0 overflow-x-auto [scrollbar-gutter:stable] max-[600px]:[overscroll-behavior-inline:contain]" role="region" aria-label={translateText("Wallet Statement table")}>
                <Table className="wallet-statement-table min-w-[760px] [&_tbody>tr]:cursor-default [&_tbody>tr>td>strong]:text-xs [&_td.money]:whitespace-nowrap [&_td.wallet-statement-movement]:min-w-[220px] [&_td_small]:mt-[3px]">
                  <caption>{translateText("Wallet Statement")}</caption>
                  <thead><tr><th>{translateText("Date")}</th><th>{translateText("Event type")}</th><th>{translateText("Signed amount")}</th><th>{translateText("Compartment movement")}</th><th>{translateText("Resulting Wallet balance")}</th></tr></thead>
                  <tbody>{rows.map((row) => <tr key={row.transaction.id}>
                    <td><time dateTime={row.transaction.createdAt}>{formatWalletDate(row.transaction.createdAt)}</time><small className="mt-[3px] block text-admin-muted">{row.transaction.description}</small></td>
                    <td><strong>{translateText(walletEventTypeLabel(row.transaction.eventType))}</strong><small className="mt-[3px] block text-admin-muted">{row.transaction.displayReference}</small></td>
                    <td className="money">{formatMoneySatang(row.signedAmountSatang, true)}</td>
                    <td className="wallet-statement-movement">{row.movement.map((movement) => <span className="block" key={movement.accountType}>{translateText(walletCompartmentLabel(movement.accountType))}: {formatWalletMovementAmount(movement.amountSatang)}</span>)}</td>
                    <td className="money">{formatMoneySatang(row.resultingWalletBalanceSatang)}</td>
                  </tr>)}</tbody>
                </Table>
              </div>
            </div>
          ) : !hasEligibleTransactions ? <p className="audit-note">{translateText("No Ledger Transactions yet.")}</p> : <p className="audit-note">{translateText("No sealed Ledger Transactions match these filters.")}</p>}
          {filteredRows.length > rows.length ? <Button variant="outline" type="button" onClick={() => setVisibleCount((count) => count + 25)}>{translateText("Load more")}</Button> : null}
        </>
      )}
    </Card>
  );
}

function ReviewsTab({
  model,
  translateText,
}: {
  model: MemberModel;
  translateText: (value: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const allReviews = model.reviews.items ?? emptyReviewRecords;
  const reviewDetailsAvailable = model.reviews.complete && model.reviews.items !== null;
  const reviews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return allReviews.filter((review) => {
      if (rating !== null && review.rating !== rating) return false;
      if (!normalizedQuery) return true;
      return [
        review.reviewer.name,
        review.reviewer.displayId,
        review.comment ?? "",
        review.quest.title,
        review.quest.displayId,
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [allReviews, query, rating]);
  const state = reviews.length ? null : reviewStateMessage(model, translateText);

  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]">
      <CardHeader flush className="user-panel-heading">
        <div>
          <h2>{translateText("Reviews")}</h2>
          <div className="flex flex-wrap items-baseline gap-2 text-[15px] text-admin-muted">
            <strong className="text-[17px] text-admin-text">{averageRating(model)} ★</strong>
            <span className="text-base">{reviewCount(model) === null ? translateText("Review data is not verified.") : `(${reviewCount(model)})`}</span>
            <span className="inline-flex flex-wrap gap-2" role="group" aria-label={translateText("Filter reviews by rating")}>
              <button className="border-0 bg-transparent p-0 text-base text-admin-muted hover:text-admin-accent hover:underline focus-visible:text-admin-accent focus-visible:underline disabled:cursor-not-allowed disabled:opacity-50" type="button" aria-pressed={rating === null} disabled={!reviewDetailsAvailable} onClick={() => setRating(null)}>{translateText("All")}</button>
              {[5, 4, 3, 2, 1].map((value) => (
                <button className={`border-0 bg-transparent p-0 text-base text-admin-muted hover:text-admin-accent hover:underline focus-visible:text-admin-accent focus-visible:underline disabled:cursor-not-allowed disabled:opacity-50 ${rating === value ? "text-admin-accent underline underline-offset-4" : ""}`} type="button" key={value} aria-pressed={rating === value} disabled={!reviewDetailsAvailable} onClick={() => setRating(rating === value ? null : value)}>
                  {value} {translateText("star")}
                </button>
              ))}
            </span>
          </div>
        </div>
        <span className={adminRecordCount}>{collectionCountLabel(model.reviews, translateText, "Review details are not available.")}</span>
      </CardHeader>
      <div className="mb-3 flex items-center justify-between gap-3 max-[600px]:items-stretch max-[600px]:flex-col">
        <div className="inline-search search-field">
          <input type="search" aria-label={translateText("Search reviews")} placeholder={translateText("Search reviews…")} value={query} onChange={(event) => setQuery(event.currentTarget.value)} disabled={!reviewDetailsAvailable} />
        </div>
      </div>
      <p className="audit-note">{translateText("Review records are read-only. Review Hide or Unhide is not an accepted Admin moderation command.")}</p>
      {reviews.length ? (
        <div className="overflow-x-auto">
          <Table className="user-detail-table min-w-[900px] [&_tbody>tr]:cursor-default [&_td]:align-top [&_th]:align-middle [&_th]:pt-2">
            <thead><tr><th>{translateText("Reviewer")}</th><th>{translateText("Rating")}</th><th>{translateText("Review")}</th><th>{translateText("Quest")}</th><th>{translateText("Date")}</th></tr></thead>
            <tbody>{reviews.map((review) => <tr key={review.id}>
              <td>{review.reviewer.name}<small className="mt-1 block text-admin-muted">{review.reviewer.displayId}</small></td>
              <td>{"★".repeat(review.rating)}</td>
              <td>{review.comment ?? translateText("No review comment.")}</td>
              <td>{review.quest.title}<small className="mt-1 block text-admin-muted">{review.quest.displayId} · {translateText(questStateLabel(review.quest.questStatus))}</small></td>
              <td><time dateTime={review.createdAt}>{formatAdminTimestamp(review.createdAt, "Asia/Bangkok")}</time></td>
            </tr>)}</tbody>
          </Table>
        </div>
      ) : state ? <p className="audit-note" role={model.reviews.error ? "alert" : undefined}>{state}</p> : <p className="audit-note">{translateText("No reviews match these filters.")}</p>}
      {reviews.length && model.reviews.error ? <p className="audit-note" role="alert">{translateText(model.reviews.error.message)}</p> : null}
    </Card>
  );
}

function ReportsTable({ reports, translateText }: { reports: MemberReportEntry[]; translateText: (value: string) => string }) {
  return <div className="overflow-x-auto"><Table className="user-detail-table min-w-[900px] [&_tbody>tr]:cursor-default [&_td]:align-top [&_th]:align-middle [&_th]:pt-2 [&_td:nth-child(3)]:max-w-[260px] [&_td:nth-child(3)]:text-admin-muted">
    <thead><tr><th>{translateText("Report")}</th><th>{translateText("Type")}</th><th>{translateText("Reported by")}</th><th>{translateText("Reported Member")}</th><th>{translateText("Quest")}</th><th>{translateText("Reason")}</th><th>{translateText("Status")}</th><th>{translateText("Reported")}</th></tr></thead>
    <tbody>{reports.map((report) => <tr key={report.id}>
      <td><Link href={report.href}>{report.displayId || translateText(report.kind)}</Link></td>
      <td>{translateText(report.kind)}</td>
      <td>{report.reporterName}{report.reporterDisplayId ? <small className="mt-1 block text-admin-muted">{report.reporterDisplayId}</small> : null}</td>
      <td>{report.reportedMemberName ?? "—"}{report.reportedMemberDisplayId ? <small className="mt-1 block text-admin-muted">{report.reportedMemberDisplayId}</small> : null}</td>
      <td>{report.questTitle ?? "—"}{report.questDisplayId ? <small className="mt-1 block text-admin-muted">{report.questDisplayId}</small> : null}</td>
      <td>{report.detail}</td>
      <td><span className={`badge ${statusBadgeClass(report.status)}`}>{translateText(reportCaseStatusLabel(report.status))}</span></td>
      <td>{report.reportedAt}</td>
    </tr>)}</tbody>
  </Table></div>;
}

function ReportsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const received = model.reportsReceived.items ?? [];
  const submitted = model.reportsSubmitted.items ?? [];
  const receivedState = collectionStateMessage(model.reportsReceived, "No Reports received.", "Reports received are not available.", translateText);
  const submittedState = collectionStateMessage(model.reportsSubmitted, "No Reports submitted.", "Reports submitted are not available.", translateText);
  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]">
      <div className="user-reports-tab-content grid gap-4">
        <CardHeader flush className="user-panel-heading flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2>{translateText("Reports and Conduct Reports")}</h2>
            <p>{translateText("Cases received against this Member and cases submitted by this Member.")}</p>
          </div>
        </CardHeader>
        <section className="min-w-0 border-t border-admin-border pt-4">
          <CardHeader flush className="user-panel-heading flex items-start justify-between gap-3">
            <div className="min-w-0"><h3>{translateText("Reports received")}</h3><p>{translateText("Report Cases and Conduct Reports filed against this Member.")}</p></div>
            <span className={`${adminRecordCount} shrink-0`}>{reportsReceivedCountLabel(model, translateText)}</span>
          </CardHeader>
          {received.length ? <ReportsTable reports={received} translateText={translateText} /> : null}
          {receivedState ? <p className="audit-note" role={model.reportsReceived.error ? "alert" : undefined}>{receivedState}</p> : null}
          {received.length && model.reportsReceived.error ? <p className="audit-note" role="alert">{translateText(model.reportsReceived.error.message)}</p> : null}
        </section>
        <section className="min-w-0 border-t border-admin-border pt-4">
          <CardHeader flush className="user-panel-heading flex items-start justify-between gap-3">
            <div className="min-w-0"><h3>{translateText("Reports submitted")}</h3><p>{translateText("Cases submitted by this Member about another Member or Quest.")}</p></div>
            <span className={`${adminRecordCount} shrink-0`}>{collectionCountLabel(model.reportsSubmitted, translateText, "Reports submitted are not available.")}</span>
          </CardHeader>
          {submitted.length ? <ReportsTable reports={submitted} translateText={translateText} /> : null}
          {submittedState ? <p className="audit-note" role={model.reportsSubmitted.error ? "alert" : undefined}>{submittedState}</p> : null}
          {submitted.length && model.reportsSubmitted.error ? <p className="audit-note" role="alert">{translateText(model.reportsSubmitted.error.message)}</p> : null}
        </section>
      </div>
    </Card>
  );
}

function MemberModerationTimeline({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const items = model.penaltyHistory.items ?? [];
  const state = collectionStateMessage(model.penaltyHistory, "No Moderation history.", "Moderation history is not available.", translateText);
  return (
    <>
      {items.length ? <div className="mt-2 grid gap-0" data-member-moderation-history>
        <p className="audit-note">{translateText("Moderation history provided by the Admin API.")}</p>
        {items.map((entry) => <article className="border-t border-admin-border py-4 first:pt-3.5 last:pb-0" key={memberPenaltyHistoryItemKey(entry)}>
          <strong className="mb-1.5 block text-[17px] leading-[1.4]">{translateText(entry.result)}</strong>
          <span className="mt-1.5 block text-[15px] leading-[1.45] text-admin-muted">{formatAdminTimestamp(entry.createdAt, "Asia/Bangkok")} · {translateText("by")} {entry.actor.displayName}</span>
          <span className="mt-1 block text-[15px] leading-[1.45] text-admin-muted">{translateText(entry.ladder)} · {translateText(entry.source)}{entry.sourceDisplayId ? ` · ${entry.sourceDisplayId}` : ""} · {translateText("Sequence")} {entry.sequenceNumber}</span>
          <span className="mt-1 block text-[15px] leading-[1.45] text-admin-muted">{translateText(entry.reasonCode)}{entry.reviewRating === null ? "" : ` · ${translateText("Rating")} ${entry.reviewRating}`}</span>
          {entry.reversal ? <span className="mt-1 block text-[15px] leading-[1.45] text-admin-muted">{translateText(entry.reversal.relation)} · {translateText("Sequence")} {entry.reversal.sequenceNumber} · {formatAdminTimestamp(entry.reversal.createdAt, "Asia/Bangkok")}</span> : null}
        </article>)}
      </div> : null}
      {state ? <p className="audit-note" role={model.penaltyHistory.error ? "alert" : undefined}>{state}</p> : null}
      {items.length && model.penaltyHistory.error ? <p className="audit-note" role="alert">{translateText(model.penaltyHistory.error.message)}</p> : null}
    </>
  );
}

function MemberPenaltyActions({ translateText }: { translateText: (value: string) => string }) {
  return (
    <div className="mt-4 grid gap-3 border-t border-admin-border pt-4">
      <p className="audit-note">{translateText("Member penalty commands are not available.")}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled variant="primary">{translateText("Record violation")}</Button>
        <Button disabled variant="outline">{translateText("Remove penalty")}</Button>
      </div>
    </div>
  );
}

function PenaltyHistoryTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]">
      <div className="user-reports-tab-content">
        <CardHeader flush className="user-panel-heading">
          <div>
            <h2>{translateText("Moderation History")}</h2>
            <p>{translateText("Penalty audit records and outcomes for this Member.")}</p>
          </div>
          <span className={adminRecordCount}>{collectionCountLabel(model.penaltyHistory, translateText, "Moderation history is not available.")}</span>
        </CardHeader>
        <MemberPenaltyActions translateText={translateText} />
        <MemberModerationTimeline model={model} translateText={translateText} />
      </div>
    </Card>
  );
}

export type MemberDetailProps = {
  memberId: string;
  initialModel?: MemberModel | null;
  initialTab?: MemberTab;
  drawer?: boolean;
};

function DetailTabs({ model, activeTab, translateText }: { model: MemberModel; activeTab: MemberTab; translateText: (value: string) => string }) {
  const labels: Record<MemberTab, string> = { overview: "Overview", activity: "Activity", payouts: "Payouts", "top-ups": "Top-ups", "wallet-statement": "Wallet Statement", reviews: "Reviews", reports: "Reports", "penalty-history": "Penalty History" };
  return <nav className="flex min-h-[42px] gap-[22px] overflow-x-auto border-b border-admin-border mb-[18px] max-[600px]:gap-[15px]" aria-label={translateText("Member detail sections")}>{Object.entries(labels).map(([value, label]) => {
    const active = activeTab === value;
    return <a className={`relative shrink-0 pb-[11px] font-semibold text-admin-muted hover:text-admin-text ${active ? "text-admin-text after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-admin-accent" : ""}`} aria-current={active ? "page" : undefined} key={value} href={memberTabHref(model.id, value as MemberTab)}>{translateText(label)}</a>;
  })}</nav>;
}

function DrawerContent({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const balances = model.walletBalances;
  const penaltySummary = model.penaltyHistory.summary;
  const walletWarning = walletReadWarningText(model, translateText);
  return (
    <div className="user-drawer-detail admin-drawer-content-flow grid min-w-0 content-start gap-[18px]">
      <Card as="section" className={`${adminRecordSection} member-drawer-overview`}>
        <CardHeader flush className={adminRecordHeader}>
          <h2 className={adminRecordHeading}>{translateText("Member overview")}</h2>
          {statusBadge(model, translateText)}
        </CardHeader>
        <div className="member-drawer-identity flex min-w-0 items-start gap-3">
          <span className="att-icon info" aria-hidden="true">◉</span>
          <div className="member-drawer-identity-copy grid min-w-0 gap-1">
            <strong className="min-w-0 break-words text-[18px] font-semibold leading-[1.4]">{model.title}</strong>
            <p className="m-0 min-w-0 break-words text-[15px] leading-[1.45] text-admin-muted">{model.email} · {model.studentId || "—"}</p>
          </div>
        </div>
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Account")}</h2></CardHeader>
        <div className="user-context-list grid gap-3">
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Student ID")}</span><strong className="break-words text-[17px]">{model.studentId || "—"}</strong></div>
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Member ID")}</span><strong className="break-words text-[17px]">{model.displayId || "—"}</strong></div>
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Created")}</span><strong className="break-words text-[17px]">{model.createdAt}</strong></div>
        </div>
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Wallet")}</h2></CardHeader>
        <div className="user-context-list grid gap-3">
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Wallet Status")}</span><strong className="break-words text-[17px]">{walletBadge(model, translateText)}</strong></div>
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Current Wallet Balance")}</span><strong className="break-words text-[17px]">{walletBalanceText(model, translateText, balances ? currentWalletBalance(balances) : undefined)}</strong></div>
          {(["spendingBalanceSatang", "earningsBalanceSatang", "fundingReservedSatang", "reservedForPayoutsSatang"] as const).map((field, index) => {
            const labels = ["Spending Balance", "Earnings Balance", "Funding Reserved", "Reserved For Payouts"] as const;
            return <div className="grid min-w-0 gap-1" key={field}><span className="text-[15px] text-admin-muted">{translateText(labels[index]!)}</span><strong className="break-words text-[17px]">{walletBalanceText(model, translateText, balances?.[field])}</strong></div>;
          })}
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Latest Wallet Transaction Date")}</span><strong className="break-words text-[17px]">{latestWalletTransactionLabel(model, translateText)}</strong></div>
        </div>
        {walletWarning ? <p className="audit-note" role="alert">{walletWarning}</p> : null}
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Moderation")}</h2></CardHeader>
        <div className="user-context-list grid gap-3">
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Member Status")}</span><strong className="break-words text-[17px]">{statusBadge(model, translateText)}</strong></div>
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Confirmed violations")}</span><strong className="break-words text-[17px]">{penaltySummary?.confirmedMisconductCount ?? translateText("Confirmed violation count is not available.")}</strong></div>
        </div>
      </Card>
      <Card as="section" className={`${adminRecordSection} member-drawer-moderation-history`} data-member-drawer-moderation-history>
        <CardHeader flush className={`${adminRecordHeader} user-panel-heading`}><h2 className={adminRecordHeading}>{translateText("Moderation History")}</h2><span className={adminRecordCount}>{collectionCountLabel(model.penaltyHistory, translateText, "Moderation history is not available.")}</span></CardHeader>
        <MemberPenaltyActions translateText={translateText} />
        <MemberModerationTimeline model={model} translateText={translateText} />
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Activity summary")}</h2></CardHeader>
        <div className="user-activity-list grid gap-3">
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Completed quests as Worker")}</span><strong className="break-words text-[17px]">{completedQuestCount(model) ?? translateText("Not provided by the Admin API")}</strong></div>
          <div className="grid min-w-0 gap-1"><span className="text-[15px] text-admin-muted">{translateText("Reports received")}</span><strong className="break-words text-[17px]">{reportsReceivedCountLabel(model, translateText)}</strong></div>
        </div>
      </Card>
      <div className="admin-drawer-actions sticky bottom-[-28px] z-[4] m-[18px_-24px_-28px] flex flex-wrap gap-2 border-t border-admin-border bg-admin-surface/95 px-6 py-3.5 shadow-[0_-6px_18px_rgba(0,0,0,0.09)] [&>*]:min-h-11 [&>*]:flex-[1_1_180px] [&>*]:text-center max-[720px]:bottom-[-24px] max-[720px]:m-[18px_-16px_-24px] max-[720px]:px-4 max-[720px]:[&>*]:basis-full"><Button asChild variant="outline"><a href={memberRoutes.detail(model.id)}>{translateText("See full Member profile")}</a></Button></div>
    </div>
  );
}

export function MemberDetail({ memberId, initialModel = null, initialTab = "overview", drawer = false }: MemberDetailProps) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const { data: model, isPending, error } = useMemberDetailQuery(memberId, initialModel);
  const [activeTab, setActiveTab] = useState<MemberTab>(initialTab);

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  if (isPending && !model) return <AdminLoading message={translateText("Loading Member…")} />;
  if (!model) {
    return <main className={drawer ? "drawer-body" : "admin-feedback"}><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Member not found")}</h1></CardHeader><CardContent className="space-y-4"><p>{translateText(error instanceof Error ? error.message : "No Member record matches this identifier.")}</p>{!drawer && <Button asChild variant="primary"><Link href={memberRoutes.list()}>{translateText("Return to Members")}</Link></Button>}</CardContent></Card></main>;
  }

  if (drawer) {
    return <DrawerContent model={model} translateText={translateText} />;
  }

  const tabContent = activeTab === "activity"
    ? <ActivityTab model={model} translateText={translateText} />
    : activeTab === "payouts"
      ? <PayoutsTab model={model} translateText={translateText} />
      : activeTab === "top-ups"
        ? <MemberTopUpsTab model={model} translateText={translateText} />
      : activeTab === "wallet-statement"
        ? <WalletStatementTab model={model} translateText={translateText} />
        : activeTab === "reviews"
          ? <ReviewsTab model={model} translateText={translateText} />
          : activeTab === "reports"
            ? <ReportsTab model={model} translateText={translateText} />
            : activeTab === "penalty-history"
              ? <PenaltyHistoryTab model={model} translateText={translateText} />
              : <OverviewTab model={model} translateText={translateText} onOpenReviews={() => router.push(memberTabHref(model.id, "reviews"))} />;

  return <main className="admin-route-page user-detail-page" tabIndex={-1}><div className="user-detail-breadcrumb mb-4 flex items-center gap-2 text-sm text-admin-muted"><Link className="text-admin-accent hover:underline" href={memberRoutes.list()}>{translateText("Members")}</Link><span aria-hidden="true">›</span><span>{model.title}</span></div><AdminPageHeader title={model.title} description={translateText("Review Member information, activity, Top-ups, Payouts, and penalty history.")} /><MemberSummary model={model} translateText={translateText} /><DetailTabs model={model} activeTab={activeTab} translateText={translateText} />{tabContent}</main>;
}

export function MemberDrawer({ memberId, initialModel, onClose }: { memberId: string; initialModel?: MemberModel | null; onClose: () => void }) {
  const { translateText } = useAdminShell();
  return <AdminDrawer ariaLabel={translateText("Close Member drawer")} title={initialModel?.displayId ?? initialModel?.title ?? translateText("Member")} titleId="member-drawer-title" subtitle={translateText("Member")} onClose={onClose}><MemberDetail memberId={memberId} initialModel={initialModel} drawer /></AdminDrawer>;
}

export function MemberDrawerRoute({ memberId, initialModel }: { memberId: string; initialModel?: MemberModel | null }) {
  const router = useRouter();
  return <MemberDrawer memberId={memberId} initialModel={initialModel} onClose={() => router.back()} />;
}
