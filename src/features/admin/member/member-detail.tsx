"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminLoading } from "../../../components/admin/admin-feedback";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { adminApi } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { memberRoutes } from "../admin-routes";
import { filterReviews, type ReviewFilter } from "../user-reviews/review-model";
import {
  findMemberFromMock,
  recordMemberViolation,
  saveMemberNote,
  submitMemberReport,
  toggleMemberReview,
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

function MemberSummary({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <section className="user-summary-panel">
      <div className="user-summary-grid">
        <div className="user-summary-identity">
          <span className="user-profile-avatar">{initials(model)}</span>
          <div>
            <div className="user-summary-name"><h2>{model.title}</h2>{statusBadge(model, translateText)}</div>
            <p>{model.faculty || translateText("Academic profile not recorded")}</p>
            <p>Kasetsart University</p>
            <a href={`mailto:${model.email}`}>{model.email}</a>
            <div className="user-detail-tags">{model.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </div>
        <div className="user-summary-stats">
          <div><strong>{averageRating(model)}</strong><span>{translateText("Rating")}</span></div>
          <div><strong>{reviewCount(model)}</strong><span>{translateText("Reviews")}</span></div>
          <div><strong>{completedQuestCount(model)}</strong><span>{translateText("Completed quests")}</span></div>
        </div>
      </div>
    </section>
  );
}

function MemberAccountInfo({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const facts: Array<[string, React.ReactNode]> = [
    ["Member status", statusBadge(model, translateText)],
    ["Wallet status", walletBadge(model, translateText)],
    ["Email verified", model.source === "api" ? translateText("Not provided by the Admin API") : translateText("Yes")],
    ["Created", model.createdAt],
    ["Last active", model.lastActiveAt],
    ["Role", model.occupation || translateText("Student")],
    ["University", model.source === "api" ? translateText("Not provided by the Admin API") : "Kasetsart University"],
    ["Faculty", model.faculty || translateText("Not recorded")],
  ];
  return <section className="user-detail-panel"><h2>{translateText("Account Information")}</h2><dl className="user-facts">{facts.map(([label, value]) => <div key={label}><dt>{translateText(label)}</dt><dd>{value}</dd></div>)}</dl></section>;
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
    <section className="user-detail-panel">
      <h2>{translateText("Moderation Summary")}</h2>
      <div className="user-counter-list"><div><strong>{model.reports.length}</strong><span>{translateText("Reports received")}</span></div><div><strong>{model.confirmedViolationCount === null ? translateText("Not provided by the Admin API") : model.confirmedViolationCount}</strong><span>{translateText("Confirmed violations")}</span></div><div><strong>{activeWarnings}</strong><span>{translateText("Active Red Flags")}</span></div><div><strong>{suspensions}</strong><span>{translateText("Suspensions")}</span></div></div>
      <p className="audit-note">{translateText("Next outcome:")} <strong>{nextOutcome ? `${translateText(nextOutcome.label)}${nextOutcome.durationDays ? ` · ${nextOutcome.durationDays} ${translateText("days")}` : ""}` : translateText("Not provided by the Admin API")}</strong>{expiresAt ? ` · ${translateText("Expires")} ${expiresAt}` : ""}.</p>
      {model.statusReason && <p className="audit-note">{translateText("Reason")}: {model.statusReason}</p>}
      {canRecord && <button className="btn primary" type="button" onClick={onRecordViolation}>{translateText("Record violation")}</button>}
    </section>
  );
}

function MemberRecentReports({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return <section className="user-detail-panel"><div className="user-panel-heading"><h2>{translateText("Recent Reports")}</h2><span className="section-count">{model.reports.length}</span></div>{model.reportsError ? <p className="audit-note">{translateText(model.reportsError)}</p> : model.reports.length ? <div className="user-recent-reports">{model.reports.slice(0, 3).map((report) => <Link key={report.id} href={report.href}><span><strong>{report.id}</strong><small>{report.category}</small></span><span className="badge">{translateText(report.status)}</span></Link>)}</div> : <p className="audit-note">{translateText("No reports have been filed against this account.")}</p>}</section>;
}

function AdminNotes({ model, translateText, onAddNote }: { model: MemberModel; translateText: (value: string) => string; onAddNote: () => void }) {
  const unavailable = model.source === "api";
  return <section className="user-detail-panel"><div className="user-panel-heading"><div><h2>{translateText("Admin Notes")}</h2><span className="admin-only-label">{translateText("Admin only")}</span></div>{!unavailable && <button className="link" type="button" onClick={onAddNote}>{translateText("Add note")}</button>}</div>{unavailable ? <p className="audit-note">{translateText("Admin notes are not provided by the Admin API.")}</p> : model.adminNotes.length ? <div className="user-admin-notes">{model.adminNotes.slice(0, 2).map((note) => <article key={`${note.at}-${note.note}`}><strong>{note.at}</strong><small>{note.by}</small><p>{note.note}</p></article>)}</div> : <p className="audit-note">{translateText("No internal notes recorded.")}</p>}</section>;
}

function MemberAbout({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return (
    <>
      <section className="user-detail-panel"><h2>{translateText("About Me")}</h2><p className="user-about-copy">{model.bio || translateText("No profile description is available.")}</p></section>
      <section className="user-detail-panel">
        <h2>{translateText("Experience")}</h2>
        {model.source === "api" ? <p className="audit-note">{translateText("Experience detail is not provided by the Admin API.")}</p> : <div className="user-simple-list"><article><strong>{translateText("University marketplace participant")}</strong><span>KuQuest · {model.createdAt}</span><p>{translateText("Contributes reliable research, documentation, and project support through KuQuest.")}</p></article></div>}
      </section>
    </>
  );
}

function MemberPayoutPreview({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const payoutCount = model.source === "api" ? model.stats.payoutsCount : model.payouts.length;
  const total = model.payouts.length
    ? model.payouts.reduce((sum, payout) => sum + (payout.amountSatang || 0), 0)
    : model.stats.totalPaidOutSatang;
  return <section className="user-detail-panel"><div className="user-panel-heading"><div><h2>{translateText("Payouts")}</h2><p>{translateText("Payout records associated with this Member.")}</p></div><span className="section-count">{payoutCount}</span></div><div className="user-payout-stat-list"><div><strong>{payoutCount}</strong><span>{translateText("Payouts")}</span></div><div><strong>{formatMoneySatang(total)}</strong><span>{translateText("Total paid out")}</span></div></div>{model.payouts.length ? <div className="user-payout-list">{model.payouts.map((payout) => <div className="user-payout-row" key={payout.id}><span className="user-payout-primary"><strong>{payout.id}</strong><small>{payout.createdAt}</small></span><span className="user-payout-secondary"><strong>{payout.amountSatang === null ? "—" : formatMoneySatang(payout.amountSatang)}</strong><small>{translateText(payout.status)}</small></span></div>)}</div> : <p className="audit-note">{payoutCount ? translateText("Payout detail is not provided by the Admin API.") : translateText("No Payout records are available.")}</p>}</section>;
}

function MemberReviewPreview({ model, translateText, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onOpenReviews: () => void }) {
  return <section className="user-detail-panel"><div className="user-panel-heading"><div><h2>{translateText("Reviews")}</h2><div className="user-review-summary"><strong>{averageRating(model)} ★</strong><span className="user-review-count">({reviewCount(model)})</span></div></div><button className="link" type="button" onClick={onOpenReviews}>{translateText("View all")}</button></div><div className="user-review-preview">{model.reviews.slice(0, 5).map((review) => <div key={`${review.reviewer}-${review.date}`}><span><strong>{review.reviewer}</strong><small>{"★".repeat(review.rating)} · {review.date}</small></span><span className="badge">{translateText(review.status)}</span></div>)}</div></section>;
}

function OverviewTab({ model, translateText, onRecordViolation, onAddNote, onOpenReviews }: { model: MemberModel; translateText: (value: string) => string; onRecordViolation: () => void; onAddNote: () => void; onOpenReviews: () => void }) {
  return (
    <div className="user-detail-layout">
      <div className="user-detail-main-column">
        <MemberAbout model={model} translateText={translateText} />
        <MemberPayoutPreview model={model} translateText={translateText} />
        <section className="user-detail-panel"><h2>{translateText("Certificates")}</h2>{model.source === "api" ? <p className="audit-note">{translateText("Certificate detail is not provided by the Admin API.")}</p> : <div className="user-certificate-list"><div><strong>{translateText("University marketplace orientation")}</strong><span>KuQuest · {model.createdAt}</span></div></div>}</section>
        <MemberReviewPreview model={model} translateText={translateText} onOpenReviews={onOpenReviews} />
      </div>
      <aside className="user-detail-side-column"><MemberAccountInfo model={model} translateText={translateText} /><MemberModerationSummary model={model} translateText={translateText} onRecordViolation={onRecordViolation} /><MemberRecentReports model={model} translateText={translateText} /><AdminNotes model={model} translateText={translateText} onAddNote={onAddNote} /></aside>
    </div>
  );
}

function ActivityTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const completed = completedQuestCount(model);
  return <section className="user-detail-panel user-tab-panel"><div className="user-panel-heading"><div><h2>{translateText("Quest history")}</h2><p>{translateText("All connected Quests")} · {completed} {translateText("completed")}</p></div><span className="section-count">{model.quests.length}</span></div>{model.quests.length ? <div className="user-quest-history-list">{model.quests.map((quest) => <Link className="user-quest-history-row" key={quest.id} href={quest.href}><div className="user-quest-history-primary"><div className="user-quest-history-title"><strong>{quest.title}</strong><span>{quest.id}</span></div><div className="user-quest-history-fields"><div className="user-quest-history-field"><span>{translateText("Role")}</span><strong>{translateText(quest.role)}</strong></div><div className="user-quest-history-field"><span>{translateText("Status")}</span><strong>{translateText(quest.status)}</strong></div><div className="user-quest-history-field"><span>{translateText("Created")}</span><strong>{quest.createdAt}</strong></div></div></div></Link>)}</div> : <p className="audit-note">{translateText("Quest history is not provided by the Admin API.")}</p>}</section>;
}

function PayoutsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return <section className="user-detail-panel user-tab-panel"><h2>{translateText("Payouts")}</h2><MemberPayoutPreview model={model} translateText={translateText} /></section>;
}

function WalletStatementTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const [filters, setFilters] = useState({ eventType: "", from: "", to: "" });
  const [visibleCount, setVisibleCount] = useState(25);
  const rows = walletStatementRows(model, filters, visibleCount);
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
    return <section className="user-detail-panel user-tab-panel" data-user-wallet-statement><h2>{translateText("Wallet Statement")}</h2><p className="audit-note">{translateText(model.walletStatementError)}</p></section>;
  }
  return <section className="user-detail-panel user-tab-panel" data-user-wallet-statement><div className="user-panel-heading"><div><h2>{translateText("Wallet Statement")}</h2><p>{translateText("Committed and sealed Ledger Transactions affecting this Wallet.")}</p></div></div>{model.walletBalances ? <div className="wallet-statement-balance-grid"><div className="wallet-statement-balance"><span>{translateText("Spending Balance")}</span><strong>{formatMoneySatang(model.walletBalances.spendingBalanceSatang)}</strong></div><div className="wallet-statement-balance"><span>{translateText("Earnings Balance")}</span><strong>{formatMoneySatang(model.walletBalances.earningsBalanceSatang)}</strong></div><div className="wallet-statement-balance"><span>{translateText("Funding Reserved")}</span><strong>{formatMoneySatang(model.walletBalances.fundingReservedSatang)}</strong></div><div className="wallet-statement-balance"><span>{translateText("Reserved For Payouts")}</span><strong>{formatMoneySatang(model.walletBalances.reservedForPayoutsSatang)}</strong></div></div> : <p className="audit-note">{translateText("No Wallet is linked to this Member.")}</p>}<form className="wallet-statement-filters" onSubmit={submit}><label>{translateText("Event type")}<select name="eventType" aria-label={translateText("Event type")} defaultValue=""><option value="">{translateText("All event types")}</option><option value="TOP_UP">TOP_UP</option><option value="PAYOUT">PAYOUT</option><option value="EARNINGS_CONVERSION">EARNINGS_CONVERSION</option></select></label><label>{translateText("From ICT date")}<input name="from" type="date" aria-label={translateText("From ICT date")} /></label><label>{translateText("To ICT date")}<input name="to" type="date" aria-label={translateText("To ICT date")} /></label><button className="btn primary" type="submit">{translateText("Apply filters")}</button><button className="btn" type="button" onClick={() => { setFilters({ eventType: "", from: "", to: "" }); setVisibleCount(25); }}>{translateText("Clear")}</button></form>{rows.length ? <div className="table-wrap" role="region" aria-label={translateText("Wallet Statement table")}><table className="data wallet-statement-table"><caption>{translateText("Wallet Statement")}</caption><thead><tr><th>{translateText("Date")}</th><th>{translateText("Event type")}</th><th>{translateText("Signed amount")}</th><th>{translateText("Compartment movement")}</th><th>{translateText("Resulting Wallet balance")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.transaction.id}><td><time dateTime={row.transaction.createdAt}>{formatWalletDate(row.transaction.createdAt)}</time><small>{row.transaction.description}</small></td><td><strong>{row.transaction.eventType}</strong><small>{row.transaction.businessReference}</small></td><td className="money">{formatMoneySatang(row.signedAmountSatang, true)}</td><td className="wallet-statement-movement">{row.movement.map((movement) => <span key={movement.accountType}>{movement.accountType}: {formatMoneySatang(movement.amountSatang, true)}</span>)}</td><td className="money">{formatMoneySatang(row.resultingWalletBalanceSatang)}</td></tr>)}</tbody></table></div> : <p className="audit-note">{translateText("No sealed Ledger Transactions match these filters.")}</p>}{model.source === "api" && model.apiError && <p className="audit-note">{translateText(model.apiError)}</p>}{model.walletStatement.length > rows.length && <button className="btn" type="button" onClick={() => setVisibleCount((count) => count + 25)}>{translateText("Load more")}</button>}</section>;
}

function ReviewsTab({
  model,
  translateText,
  onToggleReview,
}: {
  model: MemberModel;
  translateText: (value: string) => string;
  onToggleReview: (index: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [rating, setRating] = useState<number | null>(null);
  const reviews = useMemo(
    () => filterReviews(model.reviews, { query, filter, rating }),
    [filter, model.reviews, query, rating],
  );
  if (model.source === "api" && model.stats.reviewsReceivedCount > 0 && !model.reviews.length) {
    return <section className="user-detail-panel user-tab-panel"><h2>{translateText("Reviews")}</h2><p className="audit-note">{translateText("Review detail is not provided by the Admin API.")}</p></section>;
  }

  return (
    <section className="user-detail-panel user-tab-panel">
      <div className="user-panel-heading">
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
      </div>
      <div className="user-review-toolbar">
        <div className="inline-search search-field">
          <input type="search" aria-label={translateText("Search reviews")} placeholder={translateText("Search reviews…")} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="user-review-filters" role="group" aria-label={translateText("Review filters")}>
          {(["all", "reported", "hidden"] as ReviewFilter[]).map((value) => (
            <button className={`tab ${filter === value ? "active" : ""}`} type="button" key={value} onClick={() => setFilter(value)}>
              {translateText(value[0].toUpperCase() + value.slice(1))}
            </button>
          ))}
        </div>
      </div>
      {reviews.length ? (
        <div className="table-wrap">
          <table className="data user-detail-table">
            <thead><tr><th>{translateText("Reviewer")}</th><th>{translateText("Rating")}</th><th>{translateText("Review")}</th><th>{translateText("Date")}</th><th>{translateText("Status")}</th><th>{translateText("Action")}</th></tr></thead>
            <tbody>{reviews.map((review) => {
              const index = model.reviews.indexOf(review);
              return <tr key={`${review.reviewer}-${review.date}`}><td>{review.reviewer}</td><td>{"★".repeat(review.rating)}</td><td>{review.review}</td><td>{review.date}</td><td>{translateText(review.status)}</td><td><button className="link" type="button" onClick={() => onToggleReview(index)}>{translateText(review.status === "Hidden" ? "Unhide" : "Hide")}</button></td></tr>;
            })}</tbody>
          </table>
        </div>
      ) : <p className="audit-note">{translateText("No reviews match these filters.")}</p>}
    </section>
  );
}

function ReportsTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  return <section className="user-detail-panel user-tab-panel"><div className="user-panel-heading"><div><h2>{translateText("Reports")}</h2><p>{translateText("Reports filed against this account.")}</p></div><span className="section-count">{model.reports.length}</span></div>{model.reportsError ? <p className="audit-note">{translateText(model.reportsError)}</p> : model.reports.length ? <div className="table-wrap"><table className="data user-detail-table"><thead><tr><th>{translateText("Report")}</th><th>{translateText("Type")}</th><th>{translateText("Reported by")}</th><th>{translateText("Reason")}</th><th>{translateText("Status")}</th><th>{translateText("Reported")}</th></tr></thead><tbody>{model.reports.map((report) => <tr key={report.id}><td><Link href={report.href}>{report.id}</Link></td><td>{report.category}</td><td>{report.reporterName}</td><td>{report.detail}</td><td>{translateText(report.status)}</td><td>{report.reportedAt}</td></tr>)}</tbody></table></div> : <p className="audit-note">{translateText("No reports have been filed against this account.")}</p>}</section>;
}

function PenaltyHistoryTab({ model, translateText }: { model: MemberModel; translateText: (value: string) => string }) {
  const unavailable = model.source === "api" && !model.penaltyHistory.length;
  return <section className="user-detail-panel user-tab-panel"><div className="user-panel-heading"><div><h2>{translateText("Penalty History")}</h2><p>{translateText("Penalty and moderation events recorded for this account.")}</p></div></div>{unavailable ? <p className="audit-note">{translateText("Penalty history is not provided by the Admin API.")}</p> : <div className="table-wrap"><table className="data user-detail-table"><thead><tr><th>{translateText("Date")}</th><th>{translateText("Admin")}</th><th>{translateText("Action")}</th><th>{translateText("Reason")}</th></tr></thead><tbody>{model.penaltyHistory.map((entry, index) => <tr key={`${entry.at}-${entry.event}-${index}`}><td>{entry.at}</td><td>{entry.by}</td><td>{entry.event}</td><td>{entry.reason || entry.outcome || "—"}</td></tr>)}</tbody></table></div>}</section>;
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
  return <dialog open className="party-chat-overlay" aria-modal="true" aria-label={translateText(`Confirm violation for ${model.title}`)}><form className="party-chat-modal penalty-modal" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); if (value.length < 8) { setValidationError("Enter at least 8 characters explaining this confirmed violation."); return; } onConfirm(value, note.trim()); }}><div className="chat-modal-head"><div><strong>{translateText("Confirm violation")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close penalty form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body"><p className="chat-intro">{translateText("Confirm that this account committed an actual policy violation. The SRS penalty ladder applies the next consequence automatically.")}</p><section className="penalty-policy-note" aria-label={translateText("Penalty ladder")}><strong>{translateText("Penalty ladder")}</strong><span>{translateText("Next outcome")} {translateText(outcome.label)}{outcome.durationDays ? ` · ${outcome.durationDays} ${translateText("days")}` : ""}</span></section><div className="penalty-preview"><div><span>{translateText("User")}</span><strong>{model.title}</strong></div><div><span>{translateText("Confirmed violations")}</span><strong>{model.confirmedViolationCount}</strong></div><div><span>{translateText("Next outcome")}</span><strong>{translateText(outcome.label)}</strong></div></div><label htmlFor="member-penalty-reason">{translateText("Reason for confirmed violation")}</label><textarea id="member-penalty-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} /><label htmlFor="member-penalty-note">{translateText("Internal admin note (optional)")}</label><textarea id="member-penalty-note" name="note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />{(validationError || error) && <p className="field-error" role="alert">{translateText(validationError || error || "")}</p>}</div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn danger" type="submit" disabled={busy}>{busy ? translateText("Saving…") : translateText("Confirm violation")}</button></div></form></dialog>;
}

function NoteDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: { model: MemberModel; open: boolean; busy: boolean; error: string | null; translateText: (value: string) => string; onCancel: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  useEffect(() => { if (open) setNote(""); }, [open, model.id]);
  if (!open) return null;
  return <dialog open className="party-chat-overlay" aria-modal="true" aria-label={translateText(`Add admin note for ${model.title}`)}><form className="party-chat-modal" onSubmit={(event) => { event.preventDefault(); if (note.trim().length < 4) return; onConfirm(note.trim()); }}><div className="chat-modal-head"><div><strong>{translateText("Add admin note")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close admin note form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body"><label htmlFor="member-admin-note">{translateText("Internal note")}</label><textarea id="member-admin-note" rows={4} minLength={4} maxLength={500} required value={note} onChange={(event) => setNote(event.target.value)} />{error && <p className="field-error" role="alert">{translateText(error)}</p>}</div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn primary" type="submit" disabled={busy || note.trim().length < 4}>{busy ? translateText("Saving…") : translateText("Save note")}</button></div></form></dialog>;
}

function ReportMemberDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: { model: MemberModel; open: boolean; busy: boolean; error: string | null; translateText: (value: string) => string; onCancel: () => void; onConfirm: (category: string, details: string) => void }) {
  const [category, setCategory] = useState("Harassment or abuse");
  const [details, setDetails] = useState("");
  useEffect(() => { if (open) { setCategory("Harassment or abuse"); setDetails(""); } }, [open, model.id]);
  if (!open) return null;
  return <dialog open className="party-chat-overlay" aria-modal="true" aria-label={translateText(`Report ${model.title}`)}><form className="party-chat-modal report-modal" onSubmit={(event) => { event.preventDefault(); if (details.trim().length < 20) return; onConfirm(category, details.trim()); }}><div className="chat-modal-head"><div><strong>{translateText("Report user")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close report form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body"><p className="chat-intro">{translateText("Record a report submitted by one KUQuest user about another. This report does not apply a penalty automatically.")}</p><div className="report-selected-user" role="group" aria-label={translateText("Reported user")}><span>{translateText("Reported user")}</span><strong>{model.title}</strong><small>Student ID · {model.studentId}</small></div><label htmlFor="member-report-category">{translateText("Report type")}</label><select id="member-report-category" aria-label={translateText("Report type")} value={category} onChange={(event) => setCategory(event.target.value)}><option>Harassment or abuse</option><option>Fraud or payment issue</option><option>Other policy concern</option></select><label htmlFor="member-report-details">{translateText("What happened?")}</label><textarea id="member-report-details" aria-label={translateText("What happened?")} minLength={20} maxLength={500} rows={5} required value={details} onChange={(event) => setDetails(event.target.value)} />{(error || (details.length > 0 && details.trim().length < 20)) && <p className="field-error" role="alert">{translateText(error || "Enter at least 20 characters describing the report.")}</p>}</div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn primary" type="submit" disabled={busy || details.trim().length < 20}>{busy ? translateText("Saving…") : translateText("Submit report")}</button></div></form></dialog>;
}

function DetailTabs({ model, activeTab, translateText }: { model: MemberModel; activeTab: MemberTab; translateText: (value: string) => string }) {
  const labels: Record<MemberTab, string> = { overview: "Overview", activity: "Activity", payouts: "Payouts", "wallet-statement": "Wallet Statement", reviews: "Reviews", reports: "Reports", "penalty-history": "Penalty History" };
  return <nav className="user-detail-tabs" aria-label={translateText("User detail sections")}>{Object.entries(labels).map(([value, label]) => <a className={activeTab === value ? "active" : ""} aria-current={activeTab === value ? "page" : undefined} key={value} href={memberTabHref(model.id, value as MemberTab)}>{translateText(label)}</a>)}</nav>;
}

function DrawerContent({ model, translateText, onRecordViolation, onReport }: { model: MemberModel; translateText: (value: string) => string; onRecordViolation: () => void; onReport: () => void }) {
  const canRecord = model.source === "mock"
    && model.confirmedViolationCount !== null
    && !["FROZEN", "SUSPENDED", "CLOSED"].includes(model.walletStatus || "");
  return (
    <div className="drawer-body user-drawer-detail">
      <div className="drawer-title"><span className="att-icon info" aria-hidden="true">◉</span><div><h2>{model.title}</h2><p>{model.email} · {model.studentId}</p></div></div>
      <section className="section"><h3>{translateText("Account")}</h3><div className="user-context-list"><div><span>{translateText("Student ID")}</span><strong>{model.studentId}</strong></div><div><span>{translateText("Member ID")}</span><strong>{model.id}</strong></div><div><span>{translateText("Created")}</span><strong>{model.createdAt}</strong></div></div></section>
      <section className="section"><h3>{translateText("Wallet")}</h3><div className="user-context-list"><div><span>{translateText("Wallet record")}</span><strong>{model.walletId || "—"}</strong></div><div><span>{translateText("Wallet Status")}</span><strong>{walletBadge(model, translateText)}</strong></div><div><span>{translateText("Current Wallet Balance")}</span><strong>{model.walletBalances ? formatMoneySatang(currentWalletBalance(model.walletBalances)) : "—"}</strong></div></div></section>
      <section className="section"><h3>{translateText("Moderation")}</h3><div className="user-context-list"><div><span>{translateText("User Status")}</span><strong>{statusBadge(model, translateText)}</strong></div><div><span>{translateText("Confirmed violations")}</span><strong>{model.confirmedViolationCount === null ? translateText("Not provided by the Admin API") : model.confirmedViolationCount}</strong></div><div><span>{translateText("Reason")}</span><strong>{model.statusReason || translateText("No reason recorded.")}</strong></div></div></section>
      <section className="section"><h3>{translateText("Activity summary")}</h3><div className="user-activity-list"><div><span>{translateText("Completed quests")}</span><strong>{completedQuestCount(model)}</strong></div><div><span>{translateText("Reports received")}</span><strong>{model.reports.length}</strong></div></div></section>
      <div className="drawer-actions"><button className="btn" type="button" onClick={onReport}>{translateText("Report user")}</button>{canRecord && <button className="btn primary" type="button" onClick={onRecordViolation}>{translateText("Record violation")}</button>}<a className="btn" href={memberRoutes.detail(model.id)}>{translateText("See full user profile")}</a></div>
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
      if (!nextModel) setLoadError("The requested User was not found.");
      setModel(nextModel);
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "The User could not load.");
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

  const toggleReview = (index: number) => {
    if (!model || isAdminApiEnabled()) return;
    const nextModel = toggleMemberReview(localStorage, model.id, index);
    updateModel(nextModel);
  };

  if (loading && !model) return <AdminLoading message={translateText("Loading User…")} />;
  if (!model) {
    return <main className={drawer ? "drawer-body" : "admin-feedback"}><section className="panel"><h1>{translateText("User not found")}</h1><p>{translateText(loadError || "No User record matches this identifier.")}</p>{!drawer && <Link className="btn primary" href={memberRoutes.list()}>{translateText("Return to Users")}</Link>}</section></main>;
  }

  const overlays = <><PenaltyDialog model={model} open={penaltyOpen} busy={actionBusy} error={actionError} translateText={translateText} onCancel={() => { if (!actionBusy) { setPenaltyOpen(false); setActionError(null); } }} onConfirm={confirmPenalty} /><NoteDialog model={model} open={noteOpen} busy={actionBusy} error={actionError} translateText={translateText} onCancel={() => { if (!actionBusy) { setNoteOpen(false); setActionError(null); } }} onConfirm={saveNote} /><ReportMemberDialog model={model} open={reportOpen} busy={actionBusy} error={actionError} translateText={translateText} onCancel={() => { if (!actionBusy) { setReportOpen(false); setActionError(null); } }} onConfirm={submitReport} /></>;

  if (drawer) {
    return <>{overlays}<DrawerContent model={model} translateText={translateText} onRecordViolation={() => { setActionError(null); setPenaltyOpen(true); }} onReport={() => { setActionError(null); setReportOpen(true); }} /></>;
  }

  const tabContent = activeTab === "activity"
    ? <ActivityTab model={model} translateText={translateText} />
    : activeTab === "payouts"
      ? <PayoutsTab model={model} translateText={translateText} />
      : activeTab === "wallet-statement"
        ? <WalletStatementTab model={model} translateText={translateText} />
        : activeTab === "reviews"
          ? <ReviewsTab model={model} translateText={translateText} onToggleReview={toggleReview} />
          : activeTab === "reports"
            ? <ReportsTab model={model} translateText={translateText} />
            : activeTab === "penalty-history"
              ? <PenaltyHistoryTab model={model} translateText={translateText} />
              : <OverviewTab model={model} translateText={translateText} onRecordViolation={() => { setActionError(null); setPenaltyOpen(true); }} onAddNote={() => { setActionError(null); setNoteOpen(true); }} onOpenReviews={() => router.push(memberTabHref(model.id, "reviews"))} />;

  return <>{overlays}<main className="admin-route-page user-detail-page" tabIndex={-1}><div className="user-detail-breadcrumb"><Link href={memberRoutes.list()}>{translateText("Users")}</Link><span>›</span><span>{model.title}</span></div><div className="page-head user-detail-page-head"><div><h1>{model.title}</h1><p>{translateText("Review user information, activity, payouts, and penalty history.")}</p></div></div><MemberSummary model={model} translateText={translateText} /><DetailTabs model={model} activeTab={activeTab} translateText={translateText} />{tabContent}</main></>;
}

export function MemberDrawer({ memberId, initialModel, onClose }: { memberId: string; initialModel?: MemberModel | null; onClose: () => void }) {
  const { translateText } = useAdminShell();
  return <><button className="scrim" type="button" aria-label={translateText("Close Member drawer")} onClick={onClose} /><dialog open className="drawer open" aria-modal="true" aria-label={translateText("Record details")}><div className="drawer-top"><div><strong>{memberId}</strong><small>{translateText("User")}</small></div><button className="icon" type="button" aria-label={translateText("Close drawer")} onClick={onClose}><span className="close-lines" /></button></div><MemberDetail memberId={memberId} initialModel={initialModel} drawer /></dialog></>;
}

export function MemberDrawerRoute({ memberId, initialModel }: { memberId: string; initialModel?: MemberModel | null }) {
  const router = useRouter();
  return <MemberDrawer memberId={memberId} initialModel={initialModel} onClose={() => router.back()} />;
}
