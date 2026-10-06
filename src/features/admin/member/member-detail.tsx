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
import { displayAdminId } from "../display-admin-id";
import { formatAdminTimestamp } from "../date-format";
import { payoutStatusLabel, questStateLabel, reportCaseStatusLabel } from "../domain/rulebook";
import { formatTopUpPaymentMethod, TopUpDetailDrawer } from "../finance/top-up-detail-drawer";
import { TOP_UP_BOARD_TABS } from "../finance/top-ups-board-model";
import { statusBadgeClass } from "../status-badge";
import { filterReviews } from "../user-reviews/review-model";
import { formatWalletMovementAmount, walletBusinessReferenceLabel, walletCompartmentLabel, walletEventTypeLabel } from "../wallet/wallet-model";
import { formatWalletStatementDateInput, parseWalletStatementDateInput } from "./member-wallet-model";
import {
  currentWalletBalance,
  formatMoneySatang,
  formatWalletDate,
  memberStatusClass,
  memberStatusText,
  memberTabHref,
  walletStatusClass,
  walletStatusText,
  walletStatementRows,
  type MemberModel,
  type MemberTab,
} from "./member-model";
import { useMemberDetailQuery, useMemberTopUpsQuery } from "./member-query";

function initials(model: MemberModel): string {
  return `${model.firstName.charAt(0)}${model.lastName.charAt(0)}`.toUpperCase() || "M";
}

function averageRating(model: MemberModel): string {
  if (model.stats.averageRating !== null) return model.stats.averageRating.toFixed(1);
  return "—";
}

function reviewCount(model: MemberModel): number | null {
  return model.stats.reviewsReceivedCount;
}

function reviewStateMessage(model: MemberModel): string {
  const count = reviewCount(model);
  if (count === null) return "Review data is not verified.";
  if (count === 0) return "No Reviews received.";
  return "Review details are not available.";
}

function reviewStatusLabel(status: string): string {
  switch (status) {
    case "Reported": return "Reported review";
    case "Hidden": return "Hidden review";
    case "Visible": return "Visible review";
    default: return status;
  }
}

function completedQuestCount(model: MemberModel): number | null {
  return model.quests !== null
    ? model.quests.filter((quest) => quest.status === "QUEST_COMPLETED").length
    : model.stats.questsCompletedAsWorkerCount;
}

function reportsReceivedCountLabel(
  model: MemberModel,
  translateText: (value: string) => string,
): string | number {
  if (model.reportsTotalCount !== null) return model.reportsTotalCount;
  if (model.reports.length) return `${translateText("Records loaded")}: ${model.reports.length}`;
  if (model.reportsComplete) return 0;
  if (model.reportsError) return translateText("Report count is not verified.");
  return translateText("Reports received are not available.");
}

function statusBadge(model: MemberModel, translateText: (value: string) => string) {
  const label = model.memberStatus ? memberStatusText(model) : "Not provided by the Admin API";
  return model.memberStatus
    ? <span className={`badge ${memberStatusClass(model)}`}>{translateText(label)}</span>
    : <span className="audit-note">{translateText(label)}</span>;
}

function walletBadge(model: MemberModel, translateText: (value: string) => string) {
  return model.walletStatus
    ? <span className={`badge ${walletStatusClass(model)}`}>{translateText(walletStatusText(model))}</span>
    : <span className="audit-note">{translateText(walletStatusText(model))}</span>;
}

function latestWalletTransactionAt(model: MemberModel): string | null {
  return model.walletStatement
    .filter((transaction) => transaction.sealedAt)
    .reduce<string | null>((latest, transaction) => {
      if (!latest || Date.parse(transaction.createdAt) > Date.parse(latest)) return transaction.createdAt;
      return latest;
    }, null);
}

function MemberSummary({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className="mb-[18px] p-[18px]">
      <div className="grid !grid-cols-[minmax(250px,1.35fr)_minmax(300px,1fr)] items-start gap-5 max-[1100px]:!grid-cols-[minmax(250px,1fr)_minmax(270px,1fr)] max-[600px]:!grid-cols-1">
        <div className="user-summary-identity flex min-w-0 items-start gap-3.5">
          <span className="user-profile-avatar grid size-[58px] shrink-0 place-items-center rounded-full bg-admin-avatar text-xl font-bold text-admin-accent-strong">{initials(model)}</span>
          <div>
            <h2 className="mb-0 text-[22px] leading-[1.3]">{model.title}</h2>
            <p className="m-0 block text-[15px] leading-[1.45] text-admin-muted">{model.faculty || translateText("Academic profile not recorded")}</p>
            <p className="m-0 block text-[15px] leading-[1.45] text-admin-muted">Kasetsart University</p>
            <a className="mt-[3px] block text-[15px] leading-[1.45] text-admin-accent no-underline hover:underline" href={`mailto:${model.email}`}>{model.email}</a>
            <div className="user-detail-tags mt-2.5 flex flex-wrap items-center gap-1.5">{model.tags === null ? <span className="text-[13px] text-admin-muted">{translateText("Profile Tags are not available.")}</span> : model.tags.length ? model.tags.map((tag) => <span className="rounded-full border border-admin-border px-2 py-[3px] text-[13px] text-admin-muted" key={tag}>{tag}</span>) : <span className="text-[13px] text-admin-muted">{translateText("No Profile Tags.")}</span>}</div>
          </div>
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="flex justify-end">{statusBadge(model, translateText)}</div>
          <div className="grid !grid-cols-3 border-l border-admin-border max-[600px]:border-l-0 max-[600px]:border-t max-[600px]:pt-3">
            <div className="grid min-w-0 !grid-cols-1 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{averageRating(model)}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Rating")}</span></div>
            <div className="grid min-w-0 !grid-cols-1 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{reviewCount(model) ?? translateText("Review data is not verified.")}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Reviews")}</span></div>
            <div className="grid min-w-0 !grid-cols-1 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{completedQuestCount(model) ?? translateText("Not provided by the Admin API")}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Completed quests")}</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MemberAccountInfo({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const latestTransactionAt = latestWalletTransactionAt(model);
  const facts: Array<[string, React.ReactNode]> = [
    ["Member status", statusBadge(model, translateText)],
    ["Wallet status", walletBadge(model, translateText)],
    ["Current Wallet Balance", model.walletBalances ? formatMoneySatang(currentWalletBalance(model.walletBalances)) : "—"],
    ["Latest Wallet Transaction Date", latestTransactionAt ? formatWalletDate(latestTransactionAt) : "—"],
    ["Email", model.email],
    ["Created", model.createdAt],
    ["Role", model.occupation ? translateText(model.occupation) : translateText("Student")],
    ["Faculty", model.faculty || translateText("Not recorded")],
  ];
  return <Card as="section" className="user-detail-panel p-[16px_18px]"><CardHeader flush><h2>{translateText("Account Information")}</h2></CardHeader><dl className="user-facts m-0 grid gap-0">{facts.map(([label, value]) => <div className="flex justify-between gap-3 border-t border-admin-border py-2 first:border-t-0 first:pt-0" key={label}><dt className="text-sm text-admin-muted">{translateText(label)}</dt><dd className="m-0 text-right text-sm font-semibold">{value}</dd></div>)}</dl></Card>;
}

function MemberModerationSummary({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush><h2>{translateText("Moderation Summary")}</h2></CardHeader>
      <div className="user-counter-list mb-3.5 grid grid-cols-2 border-y border-admin-border">
        <div className="grid content-start gap-[3px] border-r border-b border-admin-border px-2 py-[9px]"><strong className="text-xl">{reportsReceivedCountLabel(model, translateText)}</strong><span className="text-xs text-admin-muted">{translateText("Reports received")}</span></div>
        <div className="grid content-start gap-[3px] border-b border-admin-border px-2 py-[9px]"><strong className="text-xl">{model.confirmedViolationCount === null ? translateText("Confirmed violation count is not available.") : model.confirmedViolationCount}</strong><span className="text-xs text-admin-muted">{translateText("Confirmed violations")}</span></div>
        <div className="grid content-start gap-[3px] border-r border-admin-border px-2 py-[9px]"><strong className="text-xl">{translateText("Not provided by the Admin API")}</strong><span className="text-xs text-admin-muted">{translateText("Active Red Flags")}</span></div>
        <div className="grid content-start gap-[3px] px-2 py-[9px]"><strong className="text-xl">{translateText("Not provided by the Admin API")}</strong><span className="text-xs text-admin-muted">{translateText("Suspensions")}</span></div>
      </div>
      <p className="audit-note">{translateText("Moderation history is not available.")}</p>
    </Card>
  );
}

function MemberRecentReports({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush className="user-panel-heading flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2>{translateText("Recent Reports")}</h2>
          <p>{translateText("Report Cases and Conduct Reports filed against this Member.")}</p>
        </div>
        <span className={adminRecordCount}>{reportsReceivedCountLabel(model, translateText)}</span>
      </CardHeader>
      {model.reportsError && <p className="audit-note" role="alert">{translateText(model.reportsError)}</p>}
      {model.reports.length ? (
        <div className="user-recent-reports grid">
          {model.reports.slice(0, 3).map((report) => (
            <Link className="flex items-center justify-between gap-3 border-t border-admin-border py-2.5 text-admin-text no-underline first:border-t-0 hover:[&>span:first-child_strong]:text-admin-accent" key={report.id} href={report.href}>
              <span className="min-w-0">
                <strong className="block text-[15px] leading-[1.4]">{report.displayId || translateText(report.kind)}</strong>
                <small className="mt-0.5 block text-[15px] leading-[1.45] text-admin-muted">{translateText(report.category)}</small>
              </span>
              <span className={`badge shrink-0 ${statusBadgeClass(report.status)}`}>{translateText(reportCaseStatusLabel(report.status))}</span>
            </Link>
          ))}
        </div>
      ) : model.reportsError ? null : model.reportsComplete ? <p className="audit-note">{translateText("No Reports received.")}</p> : <p className="audit-note">{translateText("Reports received are not available.")}</p>}
    </Card>
  );
}

function MemberAbout({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <>
      <Card as="section" className="user-detail-panel p-[16px_18px]"><CardHeader flush><h2>{translateText("About Me")}</h2></CardHeader><p className="user-about-copy m-0 leading-[1.6] text-admin-muted">{model.bio || translateText("No profile description is available.")}</p></Card>
      <Card as="section" className="user-detail-panel p-[16px_18px]">
        <CardHeader flush><h2>{translateText("Experience")}</h2></CardHeader>
        <p className="audit-note">{translateText("Work Experience is not available.")}</p>
      </Card>
    </>
  );
}

function MemberPayoutPreview({ model, translateText, className = "user-detail-panel p-[16px_18px]" }: { model: MemberModel; translateText: (value: string) => string; className?: string }) {
  const payoutCount = model.stats.payoutsCount;
  const total = model.stats.totalPaidOutSatang;
  const payoutCountText = payoutCount === null ? translateText("Payout data is not verified.") : payoutCount;
  const totalText = total === null ? translateText("Payout data is not verified.") : formatMoneySatang(total);
  const payoutRecords = model.payouts;
  const recordsLabel = payoutRecords === null
    ? null
    : `${translateText("Records loaded")}: ${payoutRecords.length}`;

  return (
    <Card as="section" className={className}>
      <CardHeader flush className="user-panel-heading flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2>{translateText("Payouts")}</h2>
          <p>{translateText("Summary shows successful Payout totals. History shows all statuses.")}</p>
        </div>
        {recordsLabel !== null && payoutRecords !== null && payoutRecords.length > 0 ? <span className={adminRecordCount}>{recordsLabel}</span> : null}
      </CardHeader>
      <div className="user-payout-stat-list mb-3 grid grid-cols-2 border-y border-admin-border">
        <div className="grid gap-[3px] border-r border-admin-border px-2 py-[9px]">
          <strong className="text-[17px]">{payoutCountText}</strong>
          <span className="text-xs text-admin-muted">{translateText("Successful Payouts")}</span>
        </div>
        <div className="grid gap-[3px] px-2 py-[9px]">
          <strong className="text-[17px]">{totalText}</strong>
          <span className="text-xs text-admin-muted">{translateText("Total paid out")}</span>
        </div>
      </div>
      {model.payoutsError ? <p className="audit-note" role="alert">{translateText(model.payoutsError)}</p> : null}
      {model.payouts === null ? <p className="audit-note">{translateText("Payout details are not available.")}</p> : model.payouts.length ? (
        <div className="user-payout-list grid">
          {model.payouts.map((payout) => (
            <div className="user-payout-row flex w-full items-center justify-between gap-3 border-0 border-t border-admin-border bg-transparent py-2.5 text-left text-admin-text first:border-t-0" key={payout.id}>
              <span className="user-payout-primary grid min-w-0 gap-0.5">
                <strong className="text-[17px] leading-[1.4]">{displayAdminId(payout.displayId, payout.id) || translateText("Payout")}</strong>
                <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-[1.45] text-admin-muted">{payout.createdAt}</small>
                {(payout.bankName || payout.maskedDestinationValue) ? <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-[1.45] text-admin-muted">{[payout.bankName, payout.maskedDestinationValue].filter(Boolean).join(" · ")}</small> : null}
              </span>
              <span className="user-payout-secondary grid shrink-0 justify-items-end gap-0.5">
                <strong className="text-[17px] leading-[1.4]">{payout.amountSatang === null ? "—" : formatMoneySatang(payout.amountSatang)}</strong>
                <small className="text-[15px] leading-[1.45] text-admin-muted">{translateText(payoutStatusLabel(payout.status))}</small>
              </span>
            </div>
          ))}
        </div>
      ) : model.payoutsComplete ? <p className="audit-note">{translateText("No Payouts.")}</p> : <p className="audit-note">{translateText("Payout details are not available.")}</p>}
    </Card>
  );
}

function MemberReviewPreview({ model, translateText, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onOpenReviews: () => void }) {
  const count = reviewCount(model);
  const reviews = model.reviews ?? [];

  return (
    <Card as="section" className="user-detail-panel p-[16px_18px]">
      <CardHeader flush className="user-panel-heading">
        <div>
          <h2>{translateText("Reviews")}</h2>
          <div className="flex flex-wrap items-baseline gap-2 text-[15px] text-admin-muted">
            <strong className="text-[17px] text-admin-text">{averageRating(model)} ★</strong>
            <span className="text-base">{count === null ? translateText("Review data is not verified.") : "(" + count + ")"}</span>
          </div>
        </div>
        <Button variant="link" size="sm" type="button" onClick={onOpenReviews}>{translateText("View all")}</Button>
      </CardHeader>
      <div className="user-review-preview grid">
        {reviews.length ? reviews.slice(0, 5).map((review) => (
          <div className="flex items-center justify-between gap-3 border-t border-admin-border py-2.5 first:border-t-0" key={review.reviewer + review.date}>
            <span>
              <strong className="block text-[17px] leading-[1.4]">{review.reviewer}</strong>
              <small className="mt-0.5 block text-[15px] leading-[1.45] text-admin-muted">{"★".repeat(review.rating)} · {review.date}</small>
            </span>
            <span className="badge">{translateText(reviewStatusLabel(review.status))}</span>
          </div>
        )) : <p className="audit-note">{translateText(reviewStateMessage(model))}</p>}
      </div>
    </Card>
  );
}

function OverviewTab({ model, translateText, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onOpenReviews: () => void }) {
  return (
    <div className="grid !grid-cols-[minmax(0,1.6fr)_minmax(280px,0.72fr)] items-start gap-[18px] max-[900px]:!grid-cols-1">
      <div className="grid min-w-0 !grid-cols-1 gap-[18px] max-[900px]:contents">
        <MemberAbout model={model} translateText={translateText} />
        <MemberPayoutPreview model={model} translateText={translateText} />
        <Card as="section" className="user-detail-panel p-[16px_18px]"><CardHeader flush><h2>{translateText("Certificates")}</h2></CardHeader><p className="audit-note">{translateText("Certificates are not available.")}</p></Card>
        <MemberReviewPreview model={model} translateText={translateText} onOpenReviews={onOpenReviews} />
      </div>
      <aside className="grid min-w-0 !grid-cols-1 gap-[18px] max-[900px]:contents"><MemberAccountInfo model={model} translateText={translateText} /><MemberModerationSummary model={model} translateText={translateText} /><MemberRecentReports model={model} translateText={translateText} /></aside>
    </div>
  );
}

function ActivityTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const quests = model.quests;
  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]">
      <CardHeader flush className="user-panel-heading">
        <h2>{translateText("Quest history")}</h2>
        {quests !== null ? <span className={adminRecordCount}>{quests.length}</span> : null}
      </CardHeader>
      {quests === null ? <p className="audit-note">{translateText("Quest history is not available.")}</p> : quests.length ? (
        <div className="user-quest-history-list grid">
          {quests.map((quest) => <Link className="user-quest-history-row grid grid-cols-[minmax(0,1fr)_auto] gap-[18px] border-t border-admin-border py-[15px] text-admin-text no-underline first:border-t-0 first:pt-0 hover:text-admin-accent max-[900px]:grid-cols-1 max-[900px]:gap-2.5" key={quest.id} href={quest.href}>
            <div className="user-quest-history-primary min-w-0">
              <div className="user-quest-history-title flex flex-wrap items-baseline gap-[7px]">
                <strong className="text-[17px] leading-[1.4]">{quest.title}</strong>
                {quest.displayId ? <span className="text-[15px] leading-[1.4] text-admin-muted">{quest.displayId}</span> : null}
              </div>
              <div className="user-quest-history-fields mt-2.5 grid grid-cols-[minmax(120px,.8fr)_minmax(155px,1fr)_minmax(250px,1.7fr)_minmax(115px,.8fr)] gap-3 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
                <div className="user-quest-history-field grid min-w-0 content-start gap-0.5"><span className="text-[15px] leading-[1.4] text-admin-muted">{translateText("Role")}</span><strong className="text-[17px] leading-[1.4]">{translateText(quest.role)}</strong></div>
                <div className="user-quest-history-field grid min-w-0 content-start gap-0.5"><span className="text-[15px] leading-[1.4] text-admin-muted">{translateText("Status")}</span><strong className="text-[17px] leading-[1.4]">{translateText(questStateLabel(quest.status))}</strong></div>
                <div className="user-quest-history-field grid min-w-0 content-start gap-0.5"><span className="text-[15px] leading-[1.4] text-admin-muted">{translateText("Created")}</span><strong className="text-[17px] leading-[1.4]">{quest.createdAt}</strong></div>
              </div>
            </div>
          </Link>)}
        </div>
      ) : <p className="audit-note">{translateText("No Quest history.")}</p>}
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
  const filteredRows = walletStatementRows(model, filters, model.walletStatement.length);
  const rows = filteredRows.slice(0, visibleCount);
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
  if (model.walletStatementError) {
    return (
      <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]" data-user-wallet-statement>
        <CardHeader flush><h2>{translateText("Wallet Statement")}</h2></CardHeader>
        <p className="audit-note">{translateText(model.walletStatementError)}</p>
      </Card>
    );
  }
  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]" data-user-wallet-statement>
      <CardHeader flush className="user-panel-heading">
        <div>
          <h2>{translateText("Wallet Statement")}</h2>
          <p>{translateText("Committed and sealed Ledger Transactions affecting this Wallet.")}</p>
        </div>
      </CardHeader>
      {model.walletBalances ? (
        <div className="wallet-statement-balance-grid mb-3.5 grid grid-cols-4 gap-2.5 max-[720px]:grid-cols-2 max-[420px]:grid-cols-1">
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Spending Balance")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(model.walletBalances.spendingBalanceSatang)}</strong></div>
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Earnings Balance")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(model.walletBalances.earningsBalanceSatang)}</strong></div>
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Funding Reserved")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(model.walletBalances.fundingReservedSatang)}</strong></div>
          <div className="wallet-statement-balance grid min-w-0 gap-[3px] rounded-admin-sm border border-admin-border bg-admin-soft p-2.5"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-[1.4] text-admin-muted">{translateText("Reserved For Payouts")}</span><strong className="text-[17px] leading-[1.4] [font-variant-numeric:tabular-nums]">{formatMoneySatang(model.walletBalances.reservedForPayoutsSatang)}</strong></div>
        </div>
      ) : <p className="audit-note">{translateText("No Wallet is linked to this Member.")}</p>}
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
                <td><strong>{translateText(walletEventTypeLabel(row.transaction.eventType))}</strong><small className="mt-[3px] block text-admin-muted">{walletBusinessReferenceLabel(row.transaction.businessReference)}</small></td>
                <td className="money">{formatMoneySatang(row.signedAmountSatang, true)}</td>
                <td className="wallet-statement-movement">{row.movement.map((movement) => <span className="block" key={movement.accountType}>{translateText(walletCompartmentLabel(movement.accountType))}: {formatWalletMovementAmount(movement.amountSatang)}</span>)}</td>
                <td className="money">{formatMoneySatang(row.resultingWalletBalanceSatang)}</td>
              </tr>)}</tbody>
            </Table>
          </div>
        </div>
      ) : <p className="audit-note">{translateText("No sealed Ledger Transactions match these filters.")}</p>}
      {model.apiError && <p className="audit-note">{translateText(model.apiError)}</p>}
      {filteredRows.length > rows.length && <Button variant="outline" type="button" onClick={() => setVisibleCount((count) => count + 25)}>{translateText("Load more")}</Button>}
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
  const reviews = useMemo(
    () => model.reviews ? filterReviews(model.reviews, { query, filter: "all", rating }) : [],
    [model.reviews, query, rating],
  );
  const reviewDetailsAvailable = model.reviews !== null;

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
      </CardHeader>
      <div className="mb-3 flex items-center justify-between gap-3 max-[600px]:items-stretch max-[600px]:flex-col">
        <div className="inline-search search-field">
          <input type="search" aria-label={translateText("Search reviews")} placeholder={translateText("Search reviews…")} value={query} onChange={(event) => setQuery(event.target.value)} disabled={!reviewDetailsAvailable} />
        </div>
      </div>
      <p className="audit-note">{translateText("Review records are read-only. Review Hide or Unhide is not an accepted Admin moderation command.")}</p>
      {reviews.length ? (
        <div className="overflow-x-auto">
          <Table className="user-detail-table min-w-[760px] [&_tbody>tr]:cursor-default [&_td]:align-top [&_th]:align-middle [&_th]:pt-2 [&_td:nth-child(3)]:max-w-[260px] [&_td:nth-child(3)]:text-admin-muted">
            <thead><tr><th>{translateText("Reviewer")}</th><th>{translateText("Rating")}</th><th>{translateText("Review")}</th><th>{translateText("Date")}</th></tr></thead>
            <tbody>{reviews.map((review) => {
              return <tr key={`${review.reviewer}-${review.date}`}><td>{review.reviewer}</td><td>{"★".repeat(review.rating)}</td><td>{review.review}</td><td>{review.date}</td></tr>;
            })}</tbody>
          </Table>
        </div>
      ) : !reviewDetailsAvailable ? <p className="audit-note">{translateText(reviewStateMessage(model))}</p> : reviewCount(model) === 0 ? <p className="audit-note">{translateText("No Reviews received.")}</p> : <p className="audit-note">{translateText("No reviews match these filters.")}</p>}
    </Card>
  );
}

function ReportsTable({ reports, translateText }: { reports: MemberModel["reports"]; translateText: (value: string) => string }) {
  return <div className="overflow-x-auto"><Table className="user-detail-table min-w-[760px] [&_tbody>tr]:cursor-default [&_td]:align-top [&_th]:align-middle [&_th]:pt-2 [&_td:nth-child(3)]:max-w-[260px] [&_td:nth-child(3)]:text-admin-muted"><thead><tr><th>{translateText("Case")}</th><th>{translateText("Type")}</th><th>{translateText("Reported by")}</th><th>{translateText("Reason")}</th><th>{translateText("Status")}</th><th>{translateText("Reported")}</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><Link href={report.href}>{report.displayId || translateText(report.kind)}</Link></td><td>{translateText(report.kind)}</td><td>{report.reporterName}</td><td>{report.detail}</td><td>{translateText(reportCaseStatusLabel(report.status))}</td><td>{report.reportedAt}</td></tr>)}</tbody></Table></div>;
}

function ReportsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
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
            <div className="min-w-0">
              <h3>{translateText("Reports received")}</h3>
              <p>{translateText("Report Cases and Conduct Reports filed against this Member.")}</p>
            </div>
            <span className={`${adminRecordCount} shrink-0`}>{reportsReceivedCountLabel(model, translateText)}</span>
          </CardHeader>
          {model.reports.length ? <><ReportsTable reports={model.reports} translateText={translateText} />{model.reportsError ? <p className="audit-note" role="alert">{translateText(model.reportsError)}</p> : null}</> : model.reportsError ? <p className="audit-note" role="alert">{translateText(model.reportsError)}</p> : model.reportsComplete ? <p className="audit-note">{translateText("No Reports received.")}</p> : <p className="audit-note">{translateText("Reports received are not available.")}</p>}
        </section>
        <section className="min-w-0 border-t border-admin-border pt-4">
          <CardHeader flush className="user-panel-heading flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3>{translateText("Reports submitted")}</h3>
              <p>{translateText("Cases submitted by this Member about another Member or Quest.")}</p>
            </div>
            {model.reportsSubmitted !== null ? <span className={`${adminRecordCount} shrink-0`}>{model.reportsSubmitted.length}</span> : null}
          </CardHeader>
          {model.reportsSubmitted === null ? <p className="audit-note">{translateText(model.reportsSubmittedError || "Reports submitted are not available.")}</p> : model.reportsSubmitted.length ? <ReportsTable reports={model.reportsSubmitted} translateText={translateText} /> : <p className="audit-note">{translateText("No Reports submitted.")}</p>}
        </section>
      </div>
    </Card>
  );
}

function MemberModerationTimeline({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return model.penaltyHistory === null ? <p className="audit-note">{translateText("Moderation history is not available.")}</p> : model.penaltyHistory.length ? <div className="mt-2 grid gap-0" data-member-moderation-history><p className="audit-note">{translateText("Moderation history provided by the Admin API.")}</p>{model.penaltyHistory.map((entry) => <article className="border-t border-admin-border py-4 first:pt-3.5 last:pb-0" key={`${entry.at}-${entry.event}-${entry.caseId || entry.outcome || "event"}`}><strong className="mb-1.5 block text-[17px] leading-[1.4]">{translateText(entry.event)}</strong><span className="mt-1.5 block text-[15px] leading-[1.45] text-admin-muted">{formatAdminTimestamp(entry.at, "Asia/Bangkok")} · {translateText("by")} {displayAdminId(entry.by) ?? translateText("Admin")}</span>{entry.reason && <p className="mt-[9px] text-[15px] leading-[1.5]">{entry.reason}</p>}{(entry.previousStatus || entry.newStatus || entry.outcome || entry.durationDays || entry.expiresAt) && <p className="mt-[9px] text-[15px] leading-[1.5]">{entry.previousStatus && `${translateText("Previous status")}: ${translateText(entry.previousStatus)}`}{entry.previousStatus && entry.newStatus ? " · " : ""}{entry.newStatus && `${translateText("New status")}: ${translateText(entry.newStatus)}`}{(entry.previousStatus || entry.newStatus) && entry.outcome ? " · " : ""}{entry.outcome && `${translateText("Outcome")}: ${translateText(entry.outcome)}`}{entry.durationDays ? ` · ${entry.durationDays} ${translateText("days")}` : ""}{entry.expiresAt ? ` · ${translateText("Expires")} ${formatAdminTimestamp(entry.expiresAt, "Asia/Bangkok")}` : ""}</p>}{displayAdminId(entry.caseId) && <p className="mt-[9px] text-[15px] leading-[1.5]"><span>{translateText(entry.caseType || "Related case")}:</span> {entry.caseHref ? <Link href={entry.caseHref} aria-label={`${translateText("Open related case")} ${displayAdminId(entry.caseId)}`}>{displayAdminId(entry.caseId)}</Link> : <strong>{displayAdminId(entry.caseId)}</strong>}</p>}</article>)}</div> : <p className="audit-note">{translateText("No moderation history.")}</p>;
}

function PenaltyHistoryTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className="user-detail-panel user-tab-panel col-span-full min-w-0 p-[16px_18px]">
      <div className="user-reports-tab-content">
        <CardHeader flush className="user-panel-heading">
          <div>
            <h2>{translateText("Moderation History")}</h2>
            <p>{translateText("Factual Red Flag, Member Ban, Report Case, and Conduct Report events for this Member.")}</p>
          </div>
          {model.penaltyHistory !== null ? <span className={adminRecordCount}>{model.penaltyHistory.length}</span> : null}
        </CardHeader>
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
  const latestTransactionAt = latestWalletTransactionAt(model);
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
        <div className="user-context-list grid gap-3"><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Student ID")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{model.studentId || "—"}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Member ID")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{model.displayId || "—"}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Created")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{model.createdAt}</strong></div></div>
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Wallet")}</h2></CardHeader>
        <div className="user-context-list grid gap-3"><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Wallet Status")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{walletBadge(model, translateText)}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Current Wallet Balance")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{model.walletBalances ? formatMoneySatang(currentWalletBalance(model.walletBalances)) : "—"}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Latest Wallet Transaction Date")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{latestTransactionAt ? formatWalletDate(latestTransactionAt) : "—"}</strong></div></div>
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Moderation")}</h2></CardHeader>
        <div className="user-context-list grid gap-3"><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Member Status")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{statusBadge(model, translateText)}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Confirmed violations")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{model.confirmedViolationCount === null ? translateText("Confirmed violation count is not available.") : model.confirmedViolationCount}</strong></div></div>
      </Card>
      <Card as="section" className={`${adminRecordSection} member-drawer-moderation-history`} data-member-drawer-moderation-history>
        <CardHeader flush className={`${adminRecordHeader} user-panel-heading`}><h2 className={adminRecordHeading}>{translateText("Moderation History")}</h2>{model.penaltyHistory !== null ? <span className={adminRecordCount}>{model.penaltyHistory.length}</span> : null}</CardHeader>
        <MemberModerationTimeline model={model} translateText={translateText} />
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Activity summary")}</h2></CardHeader>
        <div className="user-activity-list grid gap-3"><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Completed quests")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{completedQuestCount(model) ?? translateText("Not provided by the Admin API")}</strong></div><div className="grid min-w-0 gap-1"><span className="block text-[15px] leading-[1.4] text-admin-muted">{translateText("Reports received")}</span><strong className="block min-w-0 break-words text-[17px] font-semibold leading-[1.4]">{reportsReceivedCountLabel(model, translateText)}</strong></div></div>
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
