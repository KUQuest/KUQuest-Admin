"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Card, CardHeader } from "../../../components/ui/card";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { ADMIN_LEDGER_EVENT_TYPES, adminApi } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { memberRoutes } from "../admin-routes";
import { payoutStatusLabel, questStateLabel, reportCaseStatusLabel } from "../domain/rulebook";
import { filterReviews, type ReviewFilter } from "../user-reviews/review-model";
import {
  findMemberFromMock,
  recordMemberViolation,
  removeMemberPenalty,
  saveMemberNote,
  submitMemberReport,
} from "./member-adapter";
import { MEMBER_UPDATED_EVENT } from "./member-board";
import {
  currentWalletBalance,
  formatMoneySatang,
  formatWalletDate,
  memberModelFromApi,
  memberStatusClass,
  memberStatusText,
  memberTabHref,
  nextPenaltyFor,
  walletStatusClass,
  walletStatusText,
  walletStatementRows,
  type MemberModel,
  type MemberTab,
} from "./member-model";

export type MemberDetailProps = {
  memberId: string;
  initialModel?: MemberModel | null;
  initialTab?: MemberTab;
  drawer?: boolean;
};

type MemberActionDialogProps = {
  model: MemberModel;
  open: boolean;
  busy: boolean;
  error: string | null;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string, note: string) => void;
};

function initials(model: MemberModel): string {
  return `${model.firstName.charAt(0)}${model.lastName.charAt(0)}`.toUpperCase() || "M";
}

function averageRating(model: MemberModel): string {
  if (model.stats.averageRating !== null) return model.stats.averageRating.toFixed(1);
  if (!model.reviews.length) return "—";
  return (model.reviews.reduce((sum, review) => sum + review.rating, 0) / model.reviews.length).toFixed(1);
}

function reviewCount(model: MemberModel): number {
  return model.source === "api" ? model.stats.reviewsReceivedCount : model.reviews.length;
}

function reviewStatusLabel(status: string): string {
  switch (status) {
    case "Reported": return "Reported review";
    case "Hidden": return "Hidden review";
    case "Visible": return "Visible review";
    default: return status;
  }
}

function completedQuestCount(model: MemberModel): number {
  return model.quests.length
    ? model.quests.filter((quest) => quest.status === "QUEST_COMPLETED").length
    : model.stats.questsCompletedAsWorkerCount;
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
      <div className="grid grid-cols-[minmax(250px,1.35fr)_minmax(300px,1fr)] items-center gap-5 max-[1100px]:grid-cols-[minmax(250px,1fr)_minmax(270px,1fr)] max-[600px]:grid-cols-1">
        <div className="user-summary-identity flex min-w-0 items-start gap-3.5">
          <span className="user-profile-avatar">{initials(model)}</span>
          <div>
            <div className="user-summary-name"><h2>{model.title}</h2>{statusBadge(model, translateText)}</div>
            <p>{model.faculty || translateText("Academic profile not recorded")}</p>
            <p>Kasetsart University</p>
            <a href={`mailto:${model.email}`}>{model.email}</a>
            <div className="user-detail-tags">{model.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-l border-admin-border max-[600px]:border-l-0 max-[600px]:border-t max-[600px]:pt-3">
          <div className="grid min-w-0 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{averageRating(model)}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Rating")}</span></div>
          <div className="grid min-w-0 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{reviewCount(model)}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Reviews")}</span></div>
          <div className="grid min-w-0 gap-0.5 border-r border-admin-border px-3 last:border-r-0 max-[600px]:px-2"><strong className="text-lg">{completedQuestCount(model)}</strong><span className="text-admin-muted text-[var(--member-font-meta)] leading-[1.4]">{translateText("Completed quests")}</span></div>
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
    ["Email verified", model.source === "api" ? translateText("Not provided by the Admin API") : translateText("Yes")],
    ["Created", model.createdAt],
    ["Role", model.occupation ? translateText(model.occupation) : translateText("Student")],
    ["University", model.source === "api" ? translateText("Not provided by the Admin API") : "Kasetsart University"],
    ["Faculty", model.faculty || translateText("Not recorded")],
  ];
  return <Card as="section" className="user-detail-panel"><CardHeader flush><h2>{translateText("Account Information")}</h2></CardHeader><dl className="user-facts">{facts.map(([label, value]) => <div key={label}><dt>{translateText(label)}</dt><dd>{value}</dd></div>)}</dl></Card>;
}

function MemberModerationSummary({ model, translateText, onRecordViolation }: { model: MemberModel; translateText: (value: string) => string; onRecordViolation: () => void }) {
  const nextOutcome = model.confirmedViolationCount === null ? null : nextPenaltyFor(model);
  const activeWarnings = model.memberStatus === "Flag" ? 1 : 0;
  const suspensions = model.memberStatus === "Temp Ban" || model.memberStatus === "Perm Ban" ? 1 : 0;
  const expiresAt = model.banExpiresAt || model.redFlagExpiresAt;
  const canRecord = model.source === "mock"
    && model.confirmedViolationCount !== null
    && !["FROZEN", "SUSPENDED", "CLOSED"].includes(model.walletStatus || "");
  return (
    <Card as="section" className="user-detail-panel">
      <CardHeader flush><h2>{translateText("Moderation Summary")}</h2></CardHeader>
      <div className="user-counter-list"><div><strong>{model.reports.length}</strong><span>{translateText("Reports received")}</span></div><div><strong>{model.confirmedViolationCount === null ? translateText("Not provided by the Admin API") : model.confirmedViolationCount}</strong><span>{translateText("Confirmed violations")}</span></div><div><strong>{activeWarnings}</strong><span>{translateText("Active Red Flags")}</span></div><div><strong>{suspensions}</strong><span>{translateText("Suspensions")}</span></div></div>
      <p className="audit-note">{translateText("Next outcome:")} <strong>{nextOutcome ? `${translateText(nextOutcome.label)}${nextOutcome.durationDays ? ` · ${nextOutcome.durationDays} ${translateText("days")}` : ""}` : translateText("Not provided by the Admin API")}</strong>{expiresAt ? ` · ${translateText("Expires")} ${expiresAt}` : ""}.</p>
      {model.statusReason && <p className="audit-note">{translateText("Reason")}: {model.statusReason}</p>}
      {canRecord && <button className="btn primary" type="button" onClick={onRecordViolation}>{translateText("Record violation")}</button>}
    </Card>
  );
}

function MemberRecentReports({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return <Card as="section" className="user-detail-panel"><CardHeader flush className="user-panel-heading"><h2>{translateText("Recent Reports")}</h2><span className="section-count">{model.reports.length}</span></CardHeader>{model.reportsError ? <p className="audit-note">{translateText(model.reportsError)}</p> : model.reports.length ? <div className="user-recent-reports">{model.reports.slice(0, 3).map((report) => <Link key={report.id} href={report.href}><span><strong>{report.id}</strong><small>{translateText(report.category)}</small></span><span className="badge">{translateText(reportCaseStatusLabel(report.status))}</span></Link>)}</div> : <p className="audit-note">{translateText("No reports have been filed against this account.")}</p>}</Card>;
}

function AdminNotes({ model, translateText, onAddNote, limit }: { model: MemberModel; translateText: (value: string) => string; onAddNote: () => void; limit?: number }) {
  const unavailable = model.source === "api";
  const visibleNotes = typeof limit === "number" ? model.adminNotes.slice(0, limit) : model.adminNotes;
  return <Card as="section" className="user-detail-panel"><CardHeader flush className="user-panel-heading"><div><h2>{translateText("Admin Notes")}</h2><span className="admin-only-label">{unavailable ? translateText("Admin only") : translateText("Fixture data · Admin only")}</span></div>{!unavailable && <button className="link" type="button" onClick={onAddNote}>{translateText("Add note")}</button>}</CardHeader>{unavailable ? <p className="audit-note">{translateText("Admin notes are not provided by the Admin API.")} {translateText("The API integration is not available in this build.")}</p> : visibleNotes.length ? <div className="user-admin-notes">{visibleNotes.map((note) => <article key={`${note.at}-${note.note}`}><strong>{note.at}</strong><small>{note.by}</small><p>{note.note}</p></article>)}</div> : <p className="audit-note">{translateText("No internal notes recorded.")}</p>}</Card>;
}

function MemberAbout({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <>
      <Card as="section" className="user-detail-panel"><CardHeader flush><h2>{translateText("About Me")}</h2></CardHeader><p className="user-about-copy">{model.bio || translateText("No profile description is available.")}</p></Card>
      <Card as="section" className="user-detail-panel">
        <CardHeader flush><h2>{translateText("Experience")}</h2></CardHeader>
        {model.source === "api" ? <p className="audit-note">{translateText("Experience detail is not provided by the Admin API.")}</p> : <div className="user-simple-list"><article><strong>{translateText("University marketplace participant")}</strong><span>KuQuest · {model.createdAt}</span><p>{translateText("Contributes reliable research, documentation, and project support through KuQuest.")}</p></article></div>}
      </Card>
    </>
  );
}

function MemberPayoutPreview({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const payoutCount = model.source === "api" ? model.stats.payoutsCount : model.payouts.length;
  const total = model.payouts.length
    ? model.payouts.reduce((sum, payout) => sum + (payout.amountSatang || 0), 0)
    : model.stats.totalPaidOutSatang;
  return <Card as="section" className="user-detail-panel"><CardHeader flush className="user-panel-heading"><div><h2>{translateText("Payouts")}</h2><p>{translateText("Payout records associated with this Member.")}</p></div><span className="section-count">{payoutCount}</span></CardHeader><div className="user-payout-stat-list"><div><strong>{payoutCount}</strong><span>{translateText("Payouts")}</span></div><div><strong>{formatMoneySatang(total)}</strong><span>{translateText("Total paid out")}</span></div></div>{model.payouts.length ? <div className="user-payout-list">{model.payouts.map((payout) => <div className="user-payout-row" key={payout.id}><span className="user-payout-primary"><strong>{payout.id}</strong><small>{payout.createdAt}</small></span><span className="user-payout-secondary"><strong>{payout.amountSatang === null ? "—" : formatMoneySatang(payout.amountSatang)}</strong><small>{translateText(payoutStatusLabel(payout.status))}</small></span></div>)}</div> : <p className="audit-note">{payoutCount ? translateText("Payout detail is not provided by the Admin API.") : translateText("No Payout records are available.")}</p>}</Card>;
}

function MemberReviewPreview({ model, translateText, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onOpenReviews: () => void }) {
  return <Card as="section" className="user-detail-panel"><CardHeader flush className="user-panel-heading"><div><h2>{translateText("Reviews")}</h2><div className="user-review-summary"><strong>{averageRating(model)} ★</strong><span className="user-review-count">({reviewCount(model)})</span></div></div><button className="link" type="button" onClick={onOpenReviews}>{translateText("View all")}</button></CardHeader><div className="user-review-preview">{model.reviews.slice(0, 5).map((review) => <div key={`${review.reviewer}-${review.date}`}><span><strong>{review.reviewer}</strong><small>{"★".repeat(review.rating)} · {review.date}</small></span><span className="badge">{translateText(reviewStatusLabel(review.status))}</span></div>)}</div></Card>;
}

function OverviewTab({ model, translateText, onRecordViolation, onAddNote, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onRecordViolation: () => void; onAddNote: () => void; onOpenReviews: () => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(280px,0.72fr)] items-start gap-[18px] max-[900px]:grid-cols-1">
      <div className="grid min-w-0 gap-[18px] max-[900px]:contents">
        <MemberAbout model={model} translateText={translateText} />
        <MemberPayoutPreview model={model} translateText={translateText} />
        <Card as="section" className="user-detail-panel"><CardHeader flush><h2>{translateText("Certificates")}</h2></CardHeader>{model.source === "api" ? <p className="audit-note">{translateText("Certificate detail is not provided by the Admin API.")}</p> : <div className="user-certificate-list"><div><strong>{translateText("University marketplace orientation")}</strong><span>KuQuest · {model.createdAt}</span></div></div>}</Card>
        <MemberReviewPreview model={model} translateText={translateText} onOpenReviews={onOpenReviews} />
      </div>
      <aside className="grid min-w-0 gap-[18px] max-[900px]:contents"><MemberAccountInfo model={model} translateText={translateText} /><MemberModerationSummary model={model} translateText={translateText} onRecordViolation={onRecordViolation} /><MemberRecentReports model={model} translateText={translateText} /><AdminNotes model={model} translateText={translateText} onAddNote={onAddNote} /></aside>
    </div>
  );
}

function ActivityTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const completed = completedQuestCount(model);
  return <Card as="section" className="user-detail-panel user-tab-panel"><CardHeader flush className="user-panel-heading"><div><h2>{translateText("Quest history")}</h2><p>{translateText("All connected Quests")} · {completed} {translateText("completed")}</p></div><span className="section-count">{model.quests.length}</span></CardHeader>{model.quests.length ? <div className="user-quest-history-list">{model.quests.map((quest) => <Link className="user-quest-history-row" key={quest.id} href={quest.href}><div className="user-quest-history-primary"><div className="user-quest-history-title"><strong>{quest.title}</strong><span>{quest.id}</span></div><div className="user-quest-history-fields"><div className="user-quest-history-field"><span>{translateText("Role")}</span><strong>{translateText(quest.role)}</strong></div><div className="user-quest-history-field"><span>{translateText("Status")}</span><strong>{translateText(questStateLabel(quest.status))}</strong></div><div className="user-quest-history-field"><span>{translateText("Created")}</span><strong>{quest.createdAt}</strong></div></div></div></Link>)}</div> : <p className="audit-note">{translateText("Quest history is not provided by the Admin API.")}</p>}</Card>;
}

function PayoutsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return <Card as="section" className="user-detail-panel user-tab-panel"><CardHeader flush><h2>{translateText("Payouts")}</h2></CardHeader><MemberPayoutPreview model={model} translateText={translateText} /></Card>;
}

function WalletStatementTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const [filters, setFilters] = useState({ eventType: "", from: "", to: "" });
  const [visibleCount, setVisibleCount] = useState(25);
  const filteredRows = walletStatementRows(model, filters, model.walletStatement.length);
  const rows = filteredRows.slice(0, visibleCount);
  useEffect(() => {
    setVisibleCount(25);
    setFilters({ eventType: "", from: "", to: "" });
  }, [model.id]);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      eventType: String(form.get("eventType") || ""),
      from: String(form.get("from") || ""),
      to: String(form.get("to") || ""),
    });
    setVisibleCount(25);
  };
  if (model.walletStatementError) {
    return (
      <Card as="section" className="user-detail-panel user-tab-panel" data-user-wallet-statement>
        <CardHeader flush><h2>{translateText("Wallet Statement")}</h2></CardHeader>
        <p className="audit-note">{translateText(model.walletStatementError)}</p>
      </Card>
    );
  }
  return (
    <Card as="section" className="user-detail-panel user-tab-panel" data-user-wallet-statement>
      <CardHeader flush className="user-panel-heading">
        <div>
          <h2>{translateText("Wallet Statement")}</h2>
          <p>{translateText("Committed and sealed Ledger Transactions affecting this Wallet.")}</p>
        </div>
      </CardHeader>
      {model.walletBalances ? (
        <div className="wallet-statement-balance-grid">
          <div className="wallet-statement-balance"><span>{translateText("Spending Balance")}</span><strong>{formatMoneySatang(model.walletBalances.spendingBalanceSatang)}</strong></div>
          <div className="wallet-statement-balance"><span>{translateText("Earnings Balance")}</span><strong>{formatMoneySatang(model.walletBalances.earningsBalanceSatang)}</strong></div>
          <div className="wallet-statement-balance"><span>{translateText("Funding Reserved")}</span><strong>{formatMoneySatang(model.walletBalances.fundingReservedSatang)}</strong></div>
          <div className="wallet-statement-balance"><span>{translateText("Reserved For Payouts")}</span><strong>{formatMoneySatang(model.walletBalances.reservedForPayoutsSatang)}</strong></div>
        </div>
      ) : <p className="audit-note">{translateText("No Wallet is linked to this Member.")}</p>}
      <form className="wallet-statement-filters" onSubmit={submit}>
        <label>{translateText("Event type")}<select name="eventType" aria-label={translateText("Event type")} defaultValue=""><option value="">{translateText("All event types")}</option>{ADMIN_LEDGER_EVENT_TYPES.map((eventType) => <option key={eventType} value={eventType}>{translateText(eventType)}</option>)}</select></label>
        <label>{translateText("From ICT date")}<input name="from" type="date" aria-label={translateText("From ICT date")} /></label>
        <label>{translateText("To ICT date")}<input name="to" type="date" aria-label={translateText("To ICT date")} /></label>
        <button className="btn primary" type="submit">{translateText("Apply filters")}</button>
        <button className="btn" type="button" onClick={() => { setFilters({ eventType: "", from: "", to: "" }); setVisibleCount(25); }}>{translateText("Clear")}</button>
      </form>
      {rows.length ? (
        <div className="wallet-statement-table-block">
          <p className="wallet-statement-scroll-hint">{translateText("On narrow screens, scroll horizontally to view all Wallet Statement columns.")}</p>
          <div className="table-wrap wallet-statement-table-wrap" role="region" aria-label={translateText("Wallet Statement table")}>
            <table className="data wallet-statement-table">
              <caption>{translateText("Wallet Statement")}</caption>
              <thead><tr><th>{translateText("Date")}</th><th>{translateText("Event type")}</th><th>{translateText("Signed amount")}</th><th>{translateText("Compartment movement")}</th><th>{translateText("Resulting Wallet balance")}</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.transaction.id}>
                <td><time dateTime={row.transaction.createdAt}>{formatWalletDate(row.transaction.createdAt)}</time><small>{row.transaction.description}</small></td>
                <td><strong>{translateText(row.transaction.eventType)}</strong><small>{row.transaction.businessReference}</small></td>
                <td className="money">{formatMoneySatang(row.signedAmountSatang, true)}</td>
                <td className="wallet-statement-movement">{row.movement.map((movement) => <span key={movement.accountType}>{translateText(movement.accountType)}: {formatMoneySatang(movement.amountSatang, true)}</span>)}</td>
                <td className="money">{formatMoneySatang(row.resultingWalletBalanceSatang)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
      ) : <p className="audit-note">{translateText("No sealed Ledger Transactions match these filters.")}</p>}
      {model.source === "api" && model.apiError && <p className="audit-note">{translateText(model.apiError)}</p>}
      {filteredRows.length > rows.length && <button className="btn" type="button" onClick={() => setVisibleCount((count) => count + 25)}>{translateText("Load more")}</button>}
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
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [rating, setRating] = useState<number | null>(null);
  const reviews = useMemo(
    () => filterReviews(model.reviews, { query, filter, rating }),
    [filter, model.reviews, query, rating],
  );
  if (model.source === "api" && model.stats.reviewsReceivedCount > 0 && !model.reviews.length) {
    return <Card as="section" className="user-detail-panel user-tab-panel"><CardHeader flush><h2>{translateText("Reviews")}</h2></CardHeader><p className="audit-note">{translateText("Review detail is not provided by the Admin API.")}</p></Card>;
  }

  return (
    <Card as="section" className="user-detail-panel user-tab-panel">
      <CardHeader flush className="user-panel-heading">
        <div>
          <h2>{translateText("Reviews")}</h2>
          <div className="user-review-summary">
            <strong>{averageRating(model)} ★</strong>
            <span className="user-review-count">({reviewCount(model)})</span>
            <span className="user-review-rating-links" role="group" aria-label={translateText("Filter reviews by rating")}>
              <button className="user-review-rating-link" type="button" aria-pressed={rating === null} onClick={() => setRating(null)}>{translateText("All")}</button>
              {[5, 4, 3, 2, 1].map((value) => (
                <button className={`user-review-rating-link ${rating === value ? "active" : ""}`} type="button" key={value} aria-pressed={rating === value} onClick={() => setRating(rating === value ? null : value)}>
                  {value} {translateText("star")}
                </button>
              ))}
            </span>
          </div>
        </div>
      </CardHeader>
      <div className="user-review-toolbar">
        <div className="inline-search search-field">
          <input type="search" aria-label={translateText("Search reviews")} placeholder={translateText("Search reviews…")} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="user-review-filters" role="group" aria-label={translateText("Review filters")}>
          {(["all", "reported", "hidden"] as ReviewFilter[]).map((value) => (
            <button className={`tab ${filter === value ? "active" : ""}`} type="button" key={value} onClick={() => setFilter(value)}>
              {translateText(value === "all" ? "All" : reviewStatusLabel(value[0].toUpperCase() + value.slice(1)))}
            </button>
          ))}
        </div>
      </div>
      <p className="audit-note">{translateText("Review records are read-only. Review Hide or Unhide is not an accepted Admin moderation command.")}</p>
      {reviews.length ? (
        <div className="table-wrap">
          <table className="data user-detail-table">
            <thead><tr><th>{translateText("Reviewer")}</th><th>{translateText("Rating")}</th><th>{translateText("Review")}</th><th>{translateText("Date")}</th><th>{translateText("Status")}</th></tr></thead>
            <tbody>{reviews.map((review) => {
              return <tr key={`${review.reviewer}-${review.date}`}><td>{review.reviewer}</td><td>{"★".repeat(review.rating)}</td><td>{review.review}</td><td>{review.date}</td><td>{translateText(reviewStatusLabel(review.status))}</td></tr>;
            })}</tbody>
          </table>
        </div>
      ) : <p className="audit-note">{translateText("No reviews match these filters.")}</p>}
    </Card>
  );
}

function ReportsTable({ reports, translateText }: { reports: MemberModel["reports"]; translateText: (value: string) => string }) {
  return reports.length ? <div className="table-wrap"><table className="data user-detail-table"><thead><tr><th>{translateText("Case")}</th><th>{translateText("Type")}</th><th>{translateText("Reported by")}</th><th>{translateText("Reason")}</th><th>{translateText("Status")}</th><th>{translateText("Reported")}</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><Link href={report.href}>{report.id}</Link></td><td>{translateText(report.kind)}</td><td>{report.reporterName}</td><td>{report.detail}</td><td>{translateText(reportCaseStatusLabel(report.status))}</td><td>{report.reportedAt}</td></tr>)}</tbody></table></div> : <p className="audit-note">{translateText("No related cases are available.")}</p>;
}

function ReportsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className="user-detail-panel user-tab-panel">
      <div className="user-reports-tab-content">
        <CardHeader flush className="user-panel-heading">
          <div>
            <h2>{translateText("Reports and Conduct Reports")}</h2>
            <p>{translateText("Cases received against this Member and cases submitted by this Member.")}</p>
          </div>
          <span className="section-count">{model.reports.length + model.reportsSubmitted.length}</span>
        </CardHeader>
        <Card as="section" className="user-detail-panel">
          <CardHeader flush className="user-panel-heading">
            <div>
              <h3>{translateText("Reports received")}</h3>
              <p>{translateText("Report Cases and Conduct Reports filed against this Member.")}</p>
            </div>
            <span className="section-count">{model.reports.length}</span>
          </CardHeader>
          {model.reportsError ? <p className="audit-note">{translateText(model.reportsError)}</p> : <ReportsTable reports={model.reports} translateText={translateText} />}
        </Card>
        <Card as="section" className="user-detail-panel">
          <CardHeader flush className="user-panel-heading">
            <div>
              <h3>{translateText("Reports submitted")}</h3>
              <p>{translateText("Cases submitted by this Member about another Member or Quest.")}</p>
            </div>
            <span className="section-count">{model.reportsSubmitted.length}</span>
          </CardHeader>
          {model.reportsSubmittedError ? <p className="audit-note">{translateText(model.reportsSubmittedError)} {translateText("This data is shown only in the mock UI.")}</p> : <ReportsTable reports={model.reportsSubmitted} translateText={translateText} />}
        </Card>
      </div>
    </Card>
  );
}

function MemberModerationTimeline({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const unavailable = model.source === "api" && !model.penaltyHistory.length;
  return unavailable ? <p className="audit-note">{translateText("Penalty history is not provided by the Admin API.")} {translateText("The API integration is not available in this build.")}</p> : model.penaltyHistory.length ? <div className="user-simple-list" data-member-moderation-history><p className="audit-note">{model.source === "mock" ? translateText("Fixture data for UI review. It is not a server record.") : translateText("Moderation history provided by the Admin API.")}</p>{model.penaltyHistory.map((entry) => <article key={`${entry.at}-${entry.event}-${entry.caseId || entry.outcome || "event"}`}><strong>{translateText(entry.event)}</strong><span>{entry.at} · {translateText("by")} {entry.by}</span>{entry.reason && <p>{entry.reason}</p>}{(entry.previousStatus || entry.newStatus || entry.outcome || entry.durationDays || entry.expiresAt) && <p>{entry.previousStatus && `${translateText("Previous status")}: ${translateText(entry.previousStatus)}`}{entry.previousStatus && entry.newStatus ? " · " : ""}{entry.newStatus && `${translateText("New status")}: ${translateText(entry.newStatus)}`}{(entry.previousStatus || entry.newStatus) && entry.outcome ? " · " : ""}{entry.outcome && `${translateText("Outcome")}: ${translateText(entry.outcome)}`}{entry.durationDays ? ` · ${entry.durationDays} ${translateText("days")}` : ""}{entry.expiresAt ? ` · ${translateText("Expires")} ${entry.expiresAt}` : ""}</p>}{entry.caseId && <p><span>{translateText(entry.caseType || "Related case")}:</span> {entry.caseHref ? <Link href={entry.caseHref} aria-label={`${translateText("Open related case")} ${entry.caseId}`}>{entry.caseId}</Link> : <strong>{entry.caseId}</strong>}</p>}</article>)}</div> : <p className="audit-note">{translateText("No moderation events are recorded for this Member.")}</p>;
}

function PenaltyHistoryTab({ model, translateText, onAddNote }: { model: MemberModel; translateText: (value: string) => string; onAddNote: () => void }) {
  return (
    <Card as="section" className="user-detail-panel user-tab-panel">
      <div className="user-reports-tab-content">
        <CardHeader flush className="user-panel-heading">
          <div>
            <h2>{translateText("Moderation History")}</h2>
            <p>{translateText("Factual Red Flag, Member Ban, Report Case, and Conduct Report events for this Member.")}</p>
          </div>
          <span className="section-count">{model.penaltyHistory.length}</span>
        </CardHeader>
        <MemberModerationTimeline model={model} translateText={translateText} />
        <AdminNotes model={model} translateText={translateText} onAddNote={onAddNote} />
      </div>
    </Card>
  );
}

function PenaltyDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: MemberActionDialogProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const outcome = nextPenaltyFor(model);
  useEffect(() => {
    if (open) {
      setReason("");
      setNote("");
      setValidationError(null);
    }
  }, [open, model.id]);
  if (!open) return null;
  return <AdminModalPortal open onClose={onCancel}><dialog open className="member-action-dialog" aria-modal="true" aria-label={translateText(`Confirm violation for ${model.title}`)}><form className="party-chat-modal penalty-modal" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); if (value.length < 8) { setValidationError("Enter at least 8 characters explaining this confirmed violation."); return; } onConfirm(value, note.trim()); }}><div className="chat-modal-head"><div><strong>{translateText("Confirm violation")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close penalty form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body"><p className="chat-intro">{translateText("Confirm that this account committed an actual policy violation. The SRS penalty ladder applies the next consequence automatically.")}</p><Card as="section" className="penalty-policy-note" aria-label={translateText("Penalty ladder")}><strong>{translateText("Penalty ladder")}</strong><span>{translateText("Next outcome")} {translateText(outcome.label)}{outcome.durationDays ? ` · ${outcome.durationDays} ${translateText("days")}` : ""}</span></Card><div className="penalty-preview"><div><span>{translateText("Member")}</span><strong>{model.title}</strong></div><div><span>{translateText("Confirmed violations")}</span><strong>{model.confirmedViolationCount}</strong></div><div><span>{translateText("Next outcome")}</span><strong>{translateText(outcome.label)}</strong></div></div><label htmlFor="member-penalty-reason">{translateText("Reason for confirmed violation")}</label><textarea id="member-penalty-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} /><label htmlFor="member-penalty-note">{translateText("Internal admin note (optional)")}</label><textarea id="member-penalty-note" name="note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />{(validationError || error) && <p className="field-error" role="alert">{translateText(validationError || error || "")}</p>}</div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn danger" type="submit" disabled={busy}>{busy ? translateText("Saving…") : translateText("Confirm violation")}</button></div></form></dialog></AdminModalPortal>;
}

function RemovePenaltyDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: { model: MemberModel; open: boolean; busy: boolean; error: string | null; translateText: (value: string) => string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setReason("");
      setValidationError(null);
    }
  }, [open, model.id]);
  if (!open) return null;
  return <AdminModalPortal open onClose={onCancel}><dialog open className="member-action-dialog" aria-modal="true" aria-label={translateText(`Remove penalty for ${model.title}`)}><form className="party-chat-modal penalty-modal" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); if (value.length < 8) { setValidationError("Enter at least 8 characters explaining the penalty removal."); return; } onConfirm(value); }}><div className="chat-modal-head"><div><strong>{translateText("Remove penalty")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close remove penalty form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body"><p className="chat-intro">{translateText("Remove one active Mock penalty from this Member. The moderation history is retained and a reversal entry is recorded.")}</p><Card as="section" className="penalty-policy-note" aria-label={translateText("Current penalty")}><strong>{translateText("Current penalty")}</strong><span>{translateText("Confirmed violations")} {model.confirmedViolationCount ?? 0} · {translateText(memberStatusText(model))}</span></Card><label htmlFor="member-remove-penalty-reason">{translateText("Reason for removing the penalty")}</label><textarea id="member-remove-penalty-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} />{(validationError || error) && <p className="field-error" role="alert">{translateText(validationError || error || "")}</p>}</div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn danger" type="submit" disabled={busy}>{busy ? translateText("Saving…") : translateText("Remove penalty")}</button></div></form></dialog></AdminModalPortal>;
}

function NoteDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: { model: MemberModel; open: boolean; busy: boolean; error: string | null; translateText: (value: string) => string; onCancel: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  useEffect(() => { if (open) setNote(""); }, [open, model.id]);
  if (!open) return null;
  return <AdminModalPortal open onClose={onCancel}><dialog open className="party-chat-overlay" aria-modal="true" aria-label={translateText(`Add admin note for ${model.title}`)}><form className="party-chat-modal" onSubmit={(event) => { event.preventDefault(); if (note.trim().length < 4) return; onConfirm(note.trim()); }}><div className="chat-modal-head"><div><strong>{translateText("Add admin note")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close admin note form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body"><label htmlFor="member-admin-note">{translateText("Internal note")}</label><textarea id="member-admin-note" name="note" rows={4} minLength={4} maxLength={500} required value={note} onChange={(event) => setNote(event.target.value)} />{error && <p className="field-error" role="alert">{translateText(error)}</p>}</div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn primary" type="submit" disabled={busy || note.trim().length < 4}>{busy ? translateText("Saving…") : translateText("Save note")}</button></div></form></dialog></AdminModalPortal>;
}

function ReportMemberDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: { model: MemberModel; open: boolean; busy: boolean; error: string | null; translateText: (value: string) => string; onCancel: () => void; onConfirm: (category: string, details: string) => void }) {
  const [category, setCategory] = useState("Harassment or abuse");
  const [details, setDetails] = useState("");
  useEffect(() => { if (open) { setCategory("Harassment or abuse"); setDetails(""); } }, [open, model.id]);
  if (!open) return null;
  return <AdminModalPortal open onClose={onCancel}><dialog open className="member-action-dialog" aria-modal="true" aria-label={translateText(`Report ${model.title}`)}><form className="party-chat-modal report-modal" onSubmit={(event) => { event.preventDefault(); if (details.trim().length < 20) return; onConfirm(category, details.trim()); }}><div className="chat-modal-head"><div><strong>{translateText("Report Member")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close report form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body"><p className="chat-intro">{translateText("Record a report submitted by one KUQuest Member about another. This report does not apply a penalty automatically.")}</p><div className="report-selected-user" role="group" aria-label={translateText("Reported Member")}><span>{translateText("Reported Member")}</span><strong>{model.title}</strong><small>{translateText("Student ID")} · {model.studentId}</small></div><label htmlFor="member-report-category">{translateText("Report type")}</label><select id="member-report-category" aria-label={translateText("Report type")} value={category} onChange={(event) => setCategory(event.target.value)}><option value="Harassment or abuse">{translateText("Harassment or abuse")}</option><option value="Fraud or payment issue">{translateText("Fraud or payment issue")}</option><option value="Other policy concern">{translateText("Other policy concern")}</option></select><label htmlFor="member-report-details">{translateText("What happened?")}</label><textarea id="member-report-details" aria-label={translateText("What happened?")} minLength={20} maxLength={500} rows={5} required value={details} onChange={(event) => setDetails(event.target.value)} />{(error || (details.length > 0 && details.trim().length < 20)) && <p className="field-error" role="alert">{translateText(error || "Enter at least 20 characters describing the report.")}</p>}</div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn primary" type="submit" disabled={busy || details.trim().length < 20}>{busy ? translateText("Saving…") : translateText("Submit report")}</button></div></form></dialog></AdminModalPortal>;
}

function DetailTabs({ model, activeTab, translateText }: { model: MemberModel; activeTab: MemberTab; translateText: (value: string) => string }) {
  const labels: Record<MemberTab, string> = { overview: "Overview", activity: "Activity", payouts: "Payouts", "wallet-statement": "Wallet Statement", reviews: "Reviews", reports: "Reports", "penalty-history": "Penalty History" };
  return <nav className="flex min-h-[42px] gap-[22px] overflow-x-auto border-b border-admin-border mb-[18px] max-[600px]:gap-[15px]" aria-label={translateText("Member detail sections")}>{Object.entries(labels).map(([value, label]) => {
    const active = activeTab === value;
    return <a className={`relative shrink-0 pb-[11px] font-semibold text-admin-muted hover:text-admin-text ${active ? "text-admin-text after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-admin-accent" : ""}`} aria-current={active ? "page" : undefined} key={value} href={memberTabHref(model.id, value as MemberTab)}>{translateText(label)}</a>;
  })}</nav>;
}

function DrawerContent({ model, translateText, onRecordViolation, onRemovePenalty, onReport }: { model: MemberModel; translateText: (value: string) => string; onRecordViolation: () => void; onRemovePenalty: () => void; onReport: () => void }) {
  const canRecord = model.source === "mock"
    && model.confirmedViolationCount !== null
    && !["FROZEN", "SUSPENDED", "CLOSED"].includes(model.walletStatus || "");
  const canRemovePenalty = model.source === "mock"
    && model.confirmedViolationCount !== null
    && model.confirmedViolationCount > 0
    && model.memberStatus !== "Normal";
  const latestTransactionAt = latestWalletTransactionAt(model);
  return (
    <div className="drawer-body user-drawer-detail">
      <div className="drawer-title"><span className="att-icon info" aria-hidden="true">◉</span><div><h2>{model.title}</h2><p>{model.email} · {model.studentId || "—"}</p></div></div>
      <Card as="section" className="section">
        <CardHeader flush><h3>{translateText("Account")}</h3></CardHeader>
        <div className="user-context-list"><div><span>{translateText("Student ID")}</span><strong>{model.studentId || "—"}</strong></div><div><span>{translateText("Member ID")}</span><strong>{model.id}</strong></div><div><span>{translateText("Created")}</span><strong>{model.createdAt}</strong></div></div>
      </Card>
      <Card as="section" className="section">
        <CardHeader flush><h3>{translateText("Wallet")}</h3></CardHeader>
        <div className="user-context-list"><div><span>{translateText("Wallet record")}</span><strong>{model.walletId || "—"}</strong></div><div><span>{translateText("Wallet Status")}</span><strong>{walletBadge(model, translateText)}</strong></div><div><span>{translateText("Current Wallet Balance")}</span><strong>{model.walletBalances ? formatMoneySatang(currentWalletBalance(model.walletBalances)) : "—"}</strong></div><div><span>{translateText("Latest Wallet Transaction Date")}</span><strong>{latestTransactionAt ? formatWalletDate(latestTransactionAt) : "—"}</strong></div></div>
      </Card>
      <Card as="section" className="section">
        <CardHeader flush><h3>{translateText("Moderation")}</h3></CardHeader>
        <div className="user-context-list"><div><span>{translateText("Member Status")}</span><strong>{statusBadge(model, translateText)}</strong></div><div><span>{translateText("Confirmed violations")}</span><strong>{model.confirmedViolationCount === null ? translateText("Not provided by the Admin API") : model.confirmedViolationCount}</strong></div></div>
      </Card>
      <Card as="section" className="section member-drawer-moderation-history" data-member-drawer-moderation-history>
        <CardHeader flush className="user-panel-heading"><h3>{translateText("Moderation History")}</h3><span className="section-count">{model.penaltyHistory.length}</span></CardHeader>
        <MemberModerationTimeline model={model} translateText={translateText} />
      </Card>
      <Card as="section" className="section">
        <CardHeader flush><h3>{translateText("Activity summary")}</h3></CardHeader>
        <div className="user-activity-list"><div><span>{translateText("Completed quests")}</span><strong>{completedQuestCount(model)}</strong></div><div><span>{translateText("Reports received")}</span><strong>{model.reports.length}</strong></div></div>
      </Card>
      <div className="drawer-actions"><button className="btn" type="button" onClick={onReport} hidden>{translateText("Report Member")}</button>{canRecord && <button className="btn primary" type="button" onClick={onRecordViolation}>{translateText("Record violation")}</button>}{canRemovePenalty && <button className="btn danger" type="button" onClick={onRemovePenalty}>{translateText("Remove penalty")}</button>}<a className="btn" href={memberRoutes.detail(model.id)}>{translateText("See full Member profile")}</a></div>
    </div>
  );
}

export function MemberDetail({ memberId, initialModel = null, initialTab = "overview", drawer = false }: MemberDetailProps) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const [model, setModel] = useState<MemberModel | null>(initialModel);
  const [activeTab, setActiveTab] = useState<MemberTab>(initialTab);
  const [loading, setLoading] = useState(!initialModel);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [removePenaltyOpen, setRemovePenaltyOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  useEffect(() => {
    if (initialModel) {
      setModel(initialModel);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const request = isAdminApiEnabled()
      ? Promise.all([adminApi.getMember(memberId), adminApi.getMemberFinance(memberId)]).then(([detail, finance]) => memberModelFromApi(detail, finance))
      : Promise.resolve(findMemberFromMock(localStorage, memberId));
    void request.then((nextModel) => {
      if (cancelled) return;
      if (!nextModel) setLoadError("The requested Member was not found.");
      setModel(nextModel);
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "The Member could not load.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [drawer, initialModel, memberId]);

  const updateModel = (nextModel: MemberModel | null) => {
    if (!nextModel) return;
    setModel(nextModel);
    window.dispatchEvent(new CustomEvent(MEMBER_UPDATED_EVENT, { detail: nextModel }));
  };

  const confirmPenalty = (reason: string, note: string) => {
    if (!model) return;
    if (isAdminApiEnabled()) {
      setActionError("Member penalty commands are not available from the Admin API.");
      return;
    }
    setActionBusy(true);
    setActionError(null);
    const result = recordMemberViolation(localStorage, model.id, reason, note);
    if (!result) setActionError("The Member penalty could not be saved.");
    else {
      updateModel(result.model);
      setPenaltyOpen(false);
    }
    setActionBusy(false);
  };

  const removePenalty = (reason: string) => {
    if (!model) return;
    if (isAdminApiEnabled()) {
      setActionError("Member penalty commands are not available from the Admin API.");
      return;
    }
    setActionBusy(true);
    setActionError(null);
    const result = removeMemberPenalty(localStorage, model.id, reason);
    if (!result) setActionError("The Member penalty could not be removed.");
    else {
      updateModel(result.model);
      setRemovePenaltyOpen(false);
    }
    setActionBusy(false);
  };

  const saveNote = (note: string) => {
    if (!model) return;
    if (isAdminApiEnabled()) {
      setActionError("Admin notes are not available from the Admin API.");
      return;
    }
    setActionBusy(true);
    const nextModel = saveMemberNote(localStorage, model.id, note);
    if (!nextModel) setActionError("The Admin note could not be saved.");
    else {
      updateModel(nextModel);
      setNoteOpen(false);
    }
    setActionBusy(false);
  };

  const submitReport = (category: string, details: string) => {
    if (!model) return;
    if (isAdminApiEnabled()) {
      setActionError("New Member reports are not available from the Admin API.");
      return;
    }
    setActionBusy(true);
    const nextModel = submitMemberReport(localStorage, model.id, category, details);
    if (!nextModel) setActionError("The report could not be saved.");
    else {
      updateModel(nextModel);
      setReportOpen(false);
    }
    setActionBusy(false);
  };

  if (loading && !model) return <AdminLoading message={translateText("Loading Member…")} />;
  if (!model) {
    return <main className={drawer ? "drawer-body" : "admin-feedback"}><Card as="section" className="panel"><CardHeader flush><h1>{translateText("Member not found")}</h1></CardHeader><p>{translateText(loadError || "No Member record matches this identifier.")}</p>{!drawer && <Link className="btn primary" href={memberRoutes.list()}>{translateText("Return to Members")}</Link>}</Card></main>;
  }

  const overlays = <><PenaltyDialog model={model} open={penaltyOpen} busy={actionBusy} error={actionError} translateText={translateText} onCancel={() => { if (!actionBusy) { setPenaltyOpen(false); setActionError(null); } }} onConfirm={confirmPenalty} /><RemovePenaltyDialog model={model} open={removePenaltyOpen} busy={actionBusy} error={actionError} translateText={translateText} onCancel={() => { if (!actionBusy) { setRemovePenaltyOpen(false); setActionError(null); } }} onConfirm={removePenalty} /><NoteDialog model={model} open={noteOpen} busy={actionBusy} error={actionError} translateText={translateText} onCancel={() => { if (!actionBusy) { setNoteOpen(false); setActionError(null); } }} onConfirm={saveNote} /><ReportMemberDialog model={model} open={reportOpen} busy={actionBusy} error={actionError} translateText={translateText} onCancel={() => { if (!actionBusy) { setReportOpen(false); setActionError(null); } }} onConfirm={submitReport} /></>;

  if (drawer) {
    return <>{overlays}<DrawerContent model={model} translateText={translateText} onRecordViolation={() => { setActionError(null); setPenaltyOpen(true); }} onRemovePenalty={() => { setActionError(null); setRemovePenaltyOpen(true); }} onReport={() => { setActionError(null); setReportOpen(true); }} /></>;
  }

  const tabContent = activeTab === "activity"
    ? <ActivityTab model={model} translateText={translateText} />
    : activeTab === "payouts"
      ? <PayoutsTab model={model} translateText={translateText} />
      : activeTab === "wallet-statement"
        ? <WalletStatementTab model={model} translateText={translateText} />
        : activeTab === "reviews"
          ? <ReviewsTab model={model} translateText={translateText} />
          : activeTab === "reports"
            ? <ReportsTab model={model} translateText={translateText} />
            : activeTab === "penalty-history"
              ? <PenaltyHistoryTab model={model} translateText={translateText} onAddNote={() => { setActionError(null); setNoteOpen(true); }} />
              : <OverviewTab model={model} translateText={translateText} onRecordViolation={() => { setActionError(null); setPenaltyOpen(true); }} onAddNote={() => { setActionError(null); setNoteOpen(true); }} onOpenReviews={() => router.push(memberTabHref(model.id, "reviews"))} />;

  return <>{overlays}<main className="admin-route-page user-detail-page" tabIndex={-1}><div className="user-detail-breadcrumb"><Link href={memberRoutes.list()}>{translateText("Members")}</Link><span>›</span><span>{model.title}</span></div><div className="page-head user-detail-page-head"><div><h1>{model.title}</h1><p>{translateText("Review Member information, activity, Payouts, and penalty history.")}</p>{model.source === "mock" && <p className="audit-note" data-member-fixture>{translateText("Mock data for UI review. It is not a server record.")}</p>}</div></div><MemberSummary model={model} translateText={translateText} /><DetailTabs model={model} activeTab={activeTab} translateText={translateText} />{tabContent}</main></>;
}

export function MemberDrawer({ memberId, initialModel, onClose }: { memberId: string; initialModel?: MemberModel | null; onClose: () => void }) {
  const { translateText } = useAdminShell();
  return <AdminDrawer ariaLabel={translateText("Close Member drawer")} title={memberId} titleId="member-drawer-title" subtitle={translateText("Member")} onClose={onClose}><MemberDetail memberId={memberId} initialModel={initialModel} drawer /></AdminDrawer>;
}

export function MemberDrawerRoute({ memberId, initialModel }: { memberId: string; initialModel?: MemberModel | null }) {
  const router = useRouter();
  return <MemberDrawer memberId={memberId} initialModel={initialModel} onClose={() => router.back()} />;
}
