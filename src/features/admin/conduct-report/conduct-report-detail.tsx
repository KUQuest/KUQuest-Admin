"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AdminActionReceipt, AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { formatAdminTimestamp } from "../date-format";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminRecordHeader } from "../../../components/admin/admin-record-header";
import { AdminRecordGrid } from "../../../components/admin/admin-record-grid";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { adminApi, type ReportDecision } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { AdminOverviewMeta } from "../../../components/admin/admin-overview-meta";
import {
  adminRecordCount,
  adminRecordFact,
  adminRecordFacts,
  adminRecordGroup,
  adminRecordHeader,
  adminRecordHeading,
  adminRecordPartyGrid,
  adminRecordSection,
  adminRecordSideFacts,
} from "../../../components/admin/admin-record-styles";
import { conductReportRoutes } from "../admin-routes";
import { questStateLabel } from "../domain/rulebook";
import { questStatusClass } from "../quest/quest-model";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
import { ModerationCaseWorkspace, ModerationHistoryPanel } from "../moderation-case/moderation-case-workspace";
import { hasModerationHistory } from "../moderation-case/moderation-case-context";
import {
  findConductReportFromMock,
  newConductReportIdempotencyKey,
  saveMockConductReportDecision,
} from "./conduct-report-adapter";
import {
  CONDUCT_REPORT_UPDATED_EVENT,
  conductReportReasonLabel,
  conductReportStatusLabel,
  conductReportDecisionFor,
  conductReportModelFromRecord,
  type ConductReportDecisionChoice,
  type ConductReportModel,
} from "./conduct-report-model";

type DecisionDialogProps = {
  open: boolean;
  choice: ConductReportDecisionChoice | null;
  busy: boolean;
  error: string | null;
  model: ConductReportModel;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

type ConductReportPresentation = "drawer" | "page";

function decisionDialogTitle(
  choice: ConductReportDecisionChoice | null,
  translateText: (value: string) => string,
): string {
  return choice === "confirmed-violation"
    ? translateText("Confirm violation")
    : translateText("Close report");
}

function decisionDialogDescription(
  choice: ConductReportDecisionChoice | null,
  modelId: string,
  translateText: (value: string) => string,
): string {
  if (choice === "confirmed-violation") {
    return `${translateText("This will uphold the Conduct Report and record a confirmed violation for")} ${modelId}.`;
  }
  return `${translateText("This will dismiss the Conduct Report without changing the reported Member status for")} ${modelId}.`;
}

function ConductReportDecisionDialog({
  open,
  choice,
  busy,
  error,
  model,
  translateText,
  onCancel,
  onConfirm,
}: DecisionDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [choice, open]);

  if (!open) return null;
  const title = decisionDialogTitle(choice, translateText);
  const description = decisionDialogDescription(choice, model.id, translateText);
  const nextState = choice === "confirmed-violation"
    ? "CONDUCT_REPORT_UPHELD"
    : "CONDUCT_REPORT_DISMISSED";
  const effect = choice === "confirmed-violation"
    ? "The Conduct Report is upheld and a permanent Misconduct strike is recorded. There is no restore path."
    : "The Conduct Report closes. No Misconduct strike or Member status change is made.";

  return (
    <AdminModalPortal open={open} onClose={onCancel}>
      <dialog
        open
        className="report-decision-dialog conduct-report-decision-dialog z-[60]"
        aria-modal="true"
        aria-labelledby="conduct-report-decision-title"
        tabIndex={-1}
      >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          const value = reason.trim();
          if (value.length < 8) return;
          onConfirm(value);
        }}
      >
        <div className="dialog-body p-5">
          <div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div>
          <h2 id="conduct-report-decision-title">{title}</h2>
          <p>{description}</p>
          {choice ? (
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Conduct Report")} ${model.id} · ${translateText("Quest")} ${model.questId ?? "—"}`}
              currentState={model.statusLabel}
              nextState={conductReportStatusLabel(nextState)}
              effect={translateText(effect)}
              reversibility={translateText(choice === "confirmed-violation" ? "This decision is final. Review the Quest record before confirming." : "The decision is retained as an immutable audit record.")}
              warning={translateText("Use the Quest, Assignment, and Proof Submission record as the decision evidence.")}
            />
          ) : null}
          <label htmlFor="conduct-report-decision-reason">
            {translateText("Reason for this decision")}
          </label>
          <textarea
            id="conduct-report-decision-reason"
            name="reason"
            rows={4}
            minLength={8}
            maxLength={500}
            required
            value={reason}
            aria-invalid={Boolean(error)}
            onChange={(event) => setReason(event.target.value)}
            placeholder={translateText("Enter the reason for the Conduct Report decision")}
          />
          <div className="mt-1.5 flex justify-between gap-3 text-[15px] leading-[1.4] text-admin-muted">
            <span>{translateText("Minimum 8 characters")}</span>
            <span>{reason.length}/500</span>
          </div>
          {error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div>
        <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
          <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>
            {translateText("Cancel")}
          </Button>
          <Button variant="danger" type="submit" disabled={busy || reason.trim().length < 8}>
            {busy ? translateText("Saving…") : translateText("Confirm decision")}
          </Button>
        </div>
      </form>
      </dialog>
    </AdminModalPortal>
  );
}

function MemberLink({
  id,
  name,
  href,
  interactive = true,
}: {
  id: string | null;
  name: string;
  href: string | null;
  interactive?: boolean;
}) {
  return interactive && href && id ? <Link href={href}>{name}</Link> : <span>{name}</span>;
}

function ConductReportAlert({
  model,
  translateText,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
}) {
  return (
    <AdminStatusAlert
      tone={model.isActionable ? "warning" : "success"}
      title={model.isActionable ? translateText("Active Conduct Report — review is required") : translateText("Closed Conduct Report — record retained")}
      description={model.isActionable
        ? translateText("Review the Quest record and submitted details before deciding this Conduct Report.")
        : translateText("This Conduct Report is closed and retained as a read-only audit record.")}
      badge={translateText(model.statusLabel)}
      badgeClassName={model.badgeClass}
      className="dispute-page-alert report-page-alert"
    />
  );
}

function ConductReportOverview({
  model,
  translateText,
  compact = false,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
  compact?: boolean;
}) {
  return (
    <Card as="section" className={`${adminRecordSection} conduct-report-overview`}>
      {compact ? (
        <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("Conduct Report overview")}</h3></CardHeader>
      ) : (
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Conduct Report detail")}</h2><span className="badge">{translateText(model.reason)}</span></CardHeader>
      )}
      <div className={adminRecordFacts}>
        <div className={adminRecordFact}>
          <span>{translateText("Status")}</span>
          <strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong>
        </div>
        <div className={adminRecordFact}>
          <span>{translateText("Reason")}</span>
          <strong>{translateText(model.reason)}</strong>
        </div>
        <div className={adminRecordFact}>
          <span>{translateText("Reported")}</span>
          <strong>{formatAdminTimestamp(model.submittedAt)}</strong>
        </div>
      </div>
      <AdminOverviewMeta className="moderation-case-context-grid !grid-cols-2 max-[600px]:!grid-cols-1">
        <div><dt>{translateText("Case")}</dt><dd>{model.id}</dd></div>
        <div><dt>{translateText("Case type")}</dt><dd>{translateText("Conduct Report")}</dd></div>
        <div><dt>{translateText("Source")}</dt><dd>{translateText("Quest record")}</dd></div>
        <div><dt>{translateText("Submitted")}</dt><dd>{formatAdminTimestamp(model.submittedAt)}</dd></div>
        <div><dt>{translateText("Evidence")}</dt><dd>{model.questRecord ? translateText("Quest record") : translateText("None")}</dd></div>
        <div><dt>{translateText("Reason code")}</dt><dd>{model.reasonCode ? translateText(conductReportReasonLabel(model.reasonCode)) : "—"}</dd></div>
      </AdminOverviewMeta>
      <div className={adminRecordGroup}>
        <span>{translateText("Submitted detail")}</span>
        <p>{model.detail}</p>
      </div>
      <div className={`${adminRecordPartyGrid} moderation-case-parties conduct-report-overview-parties`}>
        <div>
          <span>{translateText("Reported Member")}</span>
          <strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} interactive={!compact} /></strong>
          <small>{model.reportedMemberId || "—"}</small>
        </div>
        <div>
          <span>{translateText("Reported by")}</span>
          <strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} interactive={!compact} /></strong>
          <small>{model.reporterId || "—"}</small>
        </div>
      </div>
    </Card>
  );
}

function ConductEvidenceSection({
  model,
  translateText,
  compact = false,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
  compact?: boolean;
}) {
  return (
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}>
        {compact ? <h3 className={adminRecordHeading}>{translateText("Evidence")}</h3> : <h2 className={adminRecordHeading}>{translateText("Evidence")}</h2>}
        <span className={adminRecordCount}>{model.questRecord ? 1 : 0}</span>
      </CardHeader>
      <div className={adminRecordGroup}>
        <span>{translateText("Quest record")}</span>
        <p>{model.questRecord ?? translateText("No Quest record evidence was provided.")}</p>
      </div>
      <p className="audit-note">{translateText("Use the Assignment, Proof Submission, and Quest timestamps as the decision evidence.")}</p>
    </Card>
  );
}

function RelatedQuestPanel({
  model,
  translateText,
  compact = false,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
  compact?: boolean;
}) {
  return (
    <Card as="section" className={`${adminRecordSection} related-quest-panel`}>
      <CardHeader flush className={adminRecordHeader}>
        {compact ? <h3 className={adminRecordHeading}>{translateText("Related Quest")}</h3> : <h2 className={adminRecordHeading}>{translateText("Related Quest")}</h2>}
        {model.questState && <span className={`badge ${questStatusClass(model.questState)}`}>{translateText(questStateLabel(model.questState))}</span>}
      </CardHeader>
      <div className={adminRecordSideFacts}>
        <div><span>{translateText("Quest")}</span><strong>{model.questTitle}</strong></div>
        <div><span>{translateText("Quest ID")}</span><strong>{model.questId ?? "—"}</strong></div>
        <div><span>{translateText("Quest State")}</span><strong>{model.questState ? translateText(questStateLabel(model.questState)) : translateText("Not provided.")}</strong></div>
        <div><span>{translateText("Failed at")}</span><strong>{model.questFailedAt ? formatAdminTimestamp(model.questFailedAt) : translateText("Not provided.")}</strong></div>
      </div>
      {model.questHref
        ? <Button asChild variant="outline" className="mt-3 w-full"><Link href={model.questHref}>{translateText("Open Quest detail")}</Link></Button>
        : <p className="audit-note">{translateText("Related Quest was not provided.")}</p>}
    </Card>
  );
}

function ConductMemberSummaryPanel({
  heading,
  id,
  name,
  href,
  translateText,
}: {
  heading: string;
  id: string | null;
  name: string;
  href: string | null;
  translateText: (value: string) => string;
}) {
  return (
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText(heading)}</h2></CardHeader>
      <div className={adminRecordSideFacts}><div><span>{translateText("Name")}</span><strong><MemberLink id={id} name={name} href={href} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{id || "—"}</strong></div></div>
      {href && <Button asChild variant="outline" className="mt-3 w-full"><Link href={href}>{translateText("See Member profile")}</Link></Button>}
    </Card>
  );
}

function ConductModerationContext({ model, translateText }: { model: ConductReportModel; translateText: (value: string) => string }) {
  const summary = model.moderationHistory;
  const fallback = translateText("Not provided.");
  const actionText = summary.previousActions.length ? summary.previousActions.map((action) => translateText(action)).join(" · ") : fallback;
  const noteText = summary.adminNotes.length ? summary.adminNotes.join(" · ") : fallback;

  return (
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Member moderation context")}</h2><span className={adminRecordCount}>{hasModerationHistory(summary) ? translateText("Available") : translateText("Partial")}</span></CardHeader>
      <AdminOverviewMeta className="moderation-case-history-grid !grid-cols-2 max-[600px]:!grid-cols-1">
        <div><dt>{translateText("Current Member status")}</dt><dd>{summary.currentMemberStatus ? translateText(summary.currentMemberStatus) : fallback}</dd></div>
        <div><dt>{translateText("Previous reports received")}</dt><dd>{summary.previousReportCount ?? fallback}</dd></div>
        <div><dt>{translateText("Confirmed previous violations")}</dt><dd>{summary.confirmedViolationCount ?? fallback}</dd></div>
      </AdminOverviewMeta>
      <div className={adminRecordGroup}><span>{translateText("Previous moderation actions")}</span><p>{actionText}</p></div>
      <div className={adminRecordGroup}><span>{translateText("Internal Admin notes")}</span><p>{noteText}</p></div>
      <div className={adminRecordGroup}><span>{translateText("Policy boundary")}</span><p>{translateText("Conduct Reports use the Quest record. Work Chat or Candidate Inquiry history may be opened only for this case, with an Admin Action log entry.")}</p></div>
    </Card>
  );
}

function ResolutionDetails({
  model,
  translateText,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
}) {
  const details = [
    ["Resolution", model.resolution],
    ["Resolved by", model.resolvedBy],
    ["Resolution time", model.resolutionAt ? formatAdminTimestamp(model.resolutionAt) : null],
    ["Closed at", model.closedAt ? formatAdminTimestamp(model.closedAt) : null],
  ] as const;

  return (
    <>
      {model.decisionReason && (
        <div className={adminRecordGroup}>
          <span>{translateText("Reason for decision")}</span>
          <p>{model.decisionReason}</p>
        </div>
      )}
      {details.some(([, value]) => value) && (
        <AdminOverviewMeta className="report-resolution-meta">
          {details.flatMap(([label, value]) => value
            ? [<div key={label}><dt>{translateText(label)}</dt><dd>{value}</dd></div>]
            : [])}
        </AdminOverviewMeta>
      )}
    </>
  );
}

function ConductReportTimeline({ model, translateText }: { model: ConductReportModel; translateText: (value: string) => string }) {
  const events = model.status === "CONDUCT_REPORT_PENDING"
    ? [
      { title: "Conduct Report submitted", time: formatAdminTimestamp(model.submittedAt), detail: `${model.reporterName} reported ${model.reportedMemberName}.` },
      { title: "Awaiting Admin decision", time: translateText("Open"), detail: translateText("Review the Quest record and submitted details.") },
    ]
    : [
      { title: "Conduct Report submitted", time: formatAdminTimestamp(model.submittedAt), detail: `${model.reporterName} reported ${model.reportedMemberName}.` },
      { title: "Conduct Report decision recorded", time: model.resolutionAt || model.closedAt ? formatAdminTimestamp(model.resolutionAt ?? model.closedAt) : translateText("Time not provided"), detail: model.decisionReason ?? model.decisionLabel ?? translateText("Record retained for audit.") },
    ];

  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Conduct Report timeline")}</h2></CardHeader><ol className="timeline">{events.map((event) => <li key={`${event.title}-${event.time}`}><strong>{translateText(event.title)}</strong><time>{event.time}</time><span>{translateText(event.detail)}</span></li>)}</ol></Card>;
}

function DecisionControls({
  model,
  translateText,
  selectedChoice,
  commandError,
  onSelect,
  onStart,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
  selectedChoice: ConductReportDecisionChoice | null;
  commandError: string | null;
  onSelect: (choice: ConductReportDecisionChoice) => void;
  onStart: () => void;
}) {
  if (!model.isActionable) {
    return (
      <>
        <p className="audit-note">
          {translateText("Decision recorded:")} <strong>{translateText(model.decisionLabel ?? model.statusLabel)}</strong>.
        </p>
        <ResolutionDetails model={model} translateText={translateText} />
      </>
    );
  }

  return (
    <>
      <p className="audit-note">
        {translateText("Decide whether the Quest record confirms an actual conduct violation. The Conduct Report reason is required.")}
      </p>
      <fieldset className="report-decision-options mt-3.5 grid gap-2 border-0 p-0">
        <legend className="visually-hidden">{translateText("Conduct Report decision")}</legend>
        <div className={`report-decision-option grid w-full grid-cols-[18px_1fr] items-start gap-x-2 gap-y-0.5 rounded-[9px] border border-admin-border bg-admin-surface px-3 py-[11px] text-left transition-colors hover:bg-admin-hover ${selectedChoice === "no-violation" ? "border-admin-accent bg-admin-accent-soft shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
          <input
            className="mt-0.5"
            id={`conduct-report-decision-${model.id}-no-violation`}
            type="radio"
            name={`conduct-report-decision-${model.id}`}
            value="no-violation"
            data-conduct-report-decision="no-violation"
            checked={selectedChoice === "no-violation"}
            onChange={() => onSelect("no-violation")}
          />
          <label className="grid cursor-pointer gap-0.5" htmlFor={`conduct-report-decision-${model.id}-no-violation`}>
            <strong className="text-sm leading-[1.35]">{translateText("No violation")}</strong>
            <small className="text-[13px] leading-[1.45] text-admin-muted">{translateText("Dismiss the Conduct Report without changing the reported Member status.")}</small>
          </label>
        </div>
        <div className={`report-decision-option grid w-full grid-cols-[18px_1fr] items-start gap-x-2 gap-y-0.5 rounded-[9px] border border-admin-border bg-admin-surface px-3 py-[11px] text-left transition-colors hover:bg-admin-hover ${selectedChoice === "confirmed-violation" ? "border-admin-accent bg-admin-accent-soft shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
          <input
            className="mt-0.5"
            id={`conduct-report-decision-${model.id}-confirmed-violation`}
            type="radio"
            name={`conduct-report-decision-${model.id}`}
            value="confirmed-violation"
            data-conduct-report-decision="confirmed-violation"
            checked={selectedChoice === "confirmed-violation"}
            onChange={() => onSelect("confirmed-violation")}
          />
          <label className="grid cursor-pointer gap-0.5" htmlFor={`conduct-report-decision-${model.id}-confirmed-violation`}>
            <strong className="text-sm leading-[1.35]">{translateText("Confirm violation")}</strong>
            <small className="text-[13px] leading-[1.45] text-admin-muted">{translateText("Uphold the Conduct Report and apply the Member Misconduct ladder.")}</small>
          </label>
        </div>
      </fieldset>
      {commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}
      <Button
        variant="danger"
        className="w-full"
        type="button"
        data-conduct-report-close="Close report"
        onClick={onStart}
      >
        {translateText("Close report")}
      </Button>
    </>
  );
}

function ConductReportDrawerBody({
  model,
  translateText,
  selectedChoice,
  commandError,
  onSelectChoice,
  onStartDecision,
  compact = true,
  showFullLink = true,
  actionReceipt,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
  selectedChoice: ConductReportDecisionChoice | null;
  commandError: string | null;
  onSelectChoice: (choice: ConductReportDecisionChoice) => void;
  onStartDecision: () => void;
  compact?: boolean;
  showFullLink?: boolean;
  actionReceipt?: ReactNode;
}) {
  if (!compact) {
    return (
      <div className="conduct-report-detail-body">
        <AdminRecordGrid
          primary={<>
            <ConductReportOverview model={model} translateText={translateText} />
            <ConductEvidenceSection model={model} translateText={translateText} />
            <ConductReportTimeline model={model} translateText={translateText} />
          </>}
          side={<>
            <ConductMemberSummaryPanel heading="Reported Member" id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} translateText={translateText} />
            <ConductMemberSummaryPanel heading="Reported by" id={model.reporterId} name={model.reporterName} href={model.reporterHref} translateText={translateText} />
            <RelatedQuestPanel model={model} translateText={translateText} />
            <ConductModerationContext model={model} translateText={translateText} />
            <Card as="section" className={`${adminRecordSection} report-decision-panel`}>
              <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{model.isActionable ? translateText("Conduct Report decision") : translateText("Recorded outcome")}</h2></CardHeader>
              <DecisionControls
                model={model}
                translateText={translateText}
                selectedChoice={selectedChoice}
                commandError={commandError}
                onSelect={onSelectChoice}
                onStart={onStartDecision}
              />
            </Card>
          </>}
        />
        {actionReceipt}
      </div>
    );
  }

  return (
    <div className="conduct-report-drawer-detail admin-drawer-content-flow grid min-w-0 content-start gap-[18px]">
      <ConductReportAlert model={model} translateText={translateText} />
      <ModerationCaseWorkspace
        kind="Conduct Report"
        caseId={model.id}
        statusLabel={model.statusLabel}
        badgeClass={model.badgeClass}
        submittedAt={formatAdminTimestamp(model.submittedAt)}
        source="Quest record"
        detail={model.detail}
        reportedMember={{ id: model.reportedMemberId, name: model.reportedMemberName, href: model.reportedMemberHref, role: "Reported Member" }}
        reporter={{ id: model.reporterId, name: model.reporterName, href: model.reporterHref, role: "Reporting Member" }}
        relatedRecord={model.questId ? { id: model.questId, title: model.questTitle, href: model.questHref } : null}
        evidenceCount={model.questRecord ? 1 : 0}
        evidenceLabel="Quest record"
        moderationHistory={model.moderationHistory}
        policyNote="Conduct Reports use the Quest record. Work Chat or Candidate Inquiry history may be opened only for this case, with an Admin Action log entry."
        translateText={translateText}
        showDecisionContext={false}
        showModerationHistory={false}
        showRelatedRecord={false}
        compact={compact}
      >
        <ConductReportOverview model={model} translateText={translateText} compact />
        <ConductEvidenceSection model={model} translateText={translateText} compact />
        <RelatedQuestPanel model={model} translateText={translateText} compact />
        <ModerationHistoryPanel
          summary={model.moderationHistory}
          translateText={translateText}
          compact
          member={{ id: model.reportedMemberId, name: model.reportedMemberName, href: model.reportedMemberHref }}
        />
        <Card as="section" className={`${adminRecordSection} report-decision-panel`}>
          <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{model.isActionable ? translateText("Conduct Report decision") : translateText("Resolution")}</h3></CardHeader>
          <DecisionControls
            model={model}
            translateText={translateText}
            selectedChoice={selectedChoice}
            commandError={commandError}
            onSelect={onSelectChoice}
            onStart={onStartDecision}
          />
        </Card>
      </ModerationCaseWorkspace>
      {actionReceipt}
      {compact && (
        <div className="admin-drawer-actions sticky bottom-[-28px] z-[4] m-[18px_-24px_-28px] flex flex-wrap gap-2 border-t border-admin-border bg-admin-surface/95 px-6 py-3.5 shadow-[0_-6px_18px_rgba(0,0,0,0.09)] [&>*]:min-h-11 [&>*]:flex-[1_1_180px] [&>*]:text-center max-[720px]:bottom-[-24px] max-[720px]:m-[18px_-16px_-24px] max-[720px]:px-4 max-[720px]:[&>*]:basis-full">
          {model.reportedMemberHref && (
            <Button asChild size="lg" variant="outline">
              <Link href={model.reportedMemberHref}>
                {translateText("Member profile")}
              </Link>
            </Button>
          )}
          {model.questHref && (
            <Button asChild size="lg" variant="outline">
              <Link href={model.questHref}>{translateText("Quest detail")}</Link>
            </Button>
          )}
          {showFullLink && <Button asChild size="lg" variant="primary"><a href={conductReportRoutes.detail(model.id)}>{translateText("Open full Conduct Report")}</a></Button>}
        </div>
      )}
    </div>
  );
}

export function ConductReportDrawer({
  model,
  onClose,
  onUpdated,
  presentation = "drawer",
}: {
  model: ConductReportModel;
  onClose: () => void;
  onUpdated?: (model: ConductReportModel) => void;
  presentation?: ConductReportPresentation;
}) {
  const { translateText } = useAdminShell();
  const [reportModel, setReportModel] = useState(model);
  const [selectedChoice, setSelectedChoice] = useState<ConductReportDecisionChoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<{
    action: string;
    status: string;
    reason: string;
    occurredAt: string;
  } | null>(null);

  useEffect(() => {
    setReportModel(model);
  }, [model]);

  const startDecision = () => {
    if (!reportModel.isActionable) return;
    if (!selectedChoice) {
      setCommandError("Choose No violation or Confirm violation before closing the Conduct Report.");
      window.requestAnimationFrame(() => {
        document.getElementById(`conduct-report-decision-${reportModel.id}-no-violation`)?.focus();
      });
      return;
    }
    setCommandError(null);
    setDialogOpen(true);
  };

  const confirmDecision = async (reason: string) => {
    if (!selectedChoice) return;
    setCommandBusy(true);
    setCommandError(null);
    const decision = conductReportDecisionFor(selectedChoice);
    const options: ReportDecision = {
      decision,
      reason,
      idempotencyKey: newConductReportIdempotencyKey(reportModel.id),
      ...(reportModel.version === undefined ? {} : { expectedVersion: reportModel.version }),
    };

    try {
      const updated = isAdminApiEnabled()
        ? await adminApi.decideReport(reportModel.id, options)
        : saveMockConductReportDecision(localStorage, reportModel.id, decision, reason);
      const updatedModel = conductReportModelFromRecord(updated);
      if (!updatedModel || updatedModel.id !== reportModel.id) {
        throw new Error(isAdminApiEnabled() ? "The Admin API returned an invalid Conduct Report." : "The Conduct Report record is invalid.");
      }
      setReportModel(updatedModel);
      window.dispatchEvent(new CustomEvent(CONDUCT_REPORT_UPDATED_EVENT, { detail: updatedModel }));
      onUpdated?.(updatedModel);
      setDialogOpen(false);
      setSelectedChoice(null);
      if (!isAdminApiEnabled()) {
        setActionReceipt({
          action: decision,
          status: updatedModel.statusLabel,
          reason,
          occurredAt: new Date().toISOString(),
        });
      }
    } catch (error: unknown) {
      setCommandError(error instanceof Error ? error.message : "The Conduct Report decision could not be saved.");
    } finally {
      setCommandBusy(false);
    }
  };

  const body = (
    <ConductReportDrawerBody
      model={reportModel}
      translateText={translateText}
      selectedChoice={selectedChoice}
      commandError={commandError}
      onSelectChoice={(choice) => {
        setSelectedChoice(choice);
        setCommandError(null);
      }}
      onStartDecision={startDecision}
      compact={presentation === "drawer"}
      showFullLink={presentation === "drawer"}
      actionReceipt={actionReceipt ? <AdminActionReceipt action={actionReceipt.action} resource="Conduct Report" resourceId={reportModel.id} status={actionReceipt.status} occurredAt={actionReceipt.occurredAt} mock details={<p>{translateText("Reason")}: {actionReceipt.reason}</p>} /> : null}
    />
  );
  const decisionDialog = (
    <ConductReportDecisionDialog
      model={reportModel}
      open={dialogOpen}
      choice={selectedChoice}
      busy={commandBusy}
      error={commandError}
      translateText={translateText}
      onCancel={() => {
        if (!commandBusy) {
          setDialogOpen(false);
          setCommandError(null);
        }
      }}
      onConfirm={confirmDecision}
    />
  );

  if (presentation === "page") {
    return (
      <main className="admin-route-page conduct-report-detail" tabIndex={-1}>
        <AdminRecordHeader
          breadcrumbHref={conductReportRoutes.list()}
          breadcrumbLabel={translateText("Conduct Reports")}
          recordId={reportModel.id}
          title={translateText(reportModel.title)}
          subtitle={`${translateText(reportModel.reason)} · ${translateText("reported")} ${formatAdminTimestamp(reportModel.submittedAt)}`}
          actions={<Button asChild size="lg" variant="outline"><Link href={conductReportRoutes.list()}>{translateText("Back to Conduct Reports")}</Link></Button>}
        />
        <ConductReportAlert model={reportModel} translateText={translateText} />
        <RecordStatusBar className="conduct-report-record-status-bar" items={[{ id: "status", label: translateText("Status"), value: <span className={`badge ${reportModel.badgeClass}`}>{translateText(reportModel.statusLabel)}</span> }, { id: "reason", label: translateText("Reason"), value: translateText(reportModel.reason) }, { id: "reported", label: translateText("Reported"), value: formatAdminTimestamp(reportModel.submittedAt) }, { id: "reported-member", label: translateText("Reported Member"), value: <MemberLink id={reportModel.reportedMemberId} name={reportModel.reportedMemberName} href={reportModel.reportedMemberHref} /> }, { id: "quest", label: translateText("Quest"), value: reportModel.questId ?? translateText("Not provided.") }]} />
        {body}
        {decisionDialog}
      </main>
    );
  }

  return (
    <>
      <AdminDrawer
        ariaLabel={translateText("Close Conduct Report drawer")}
        closeButtonAriaLabel={translateText("Close drawer")}
        title={<><span aria-hidden="true">{translateText(reportModel.title)}</span><span className="visually-hidden">{translateText("Conduct Report details")}</span></>}
        titleId="conduct-report-drawer-title"
        subtitle={<>{translateText("Conduct Report")} {reportModel.id} · {translateText("Conduct Report detail drawer")}</>}
        className="conduct-report-drawer quest-style-drawer"
        openerAttribute="data-conduct-report-id"
        openerValue={reportModel.id}
        onClose={onClose}
      >
        {body}
      </AdminDrawer>
      {decisionDialog}
    </>
  );
}

export function ConductReportDetail({
  reportId,
  initialModel = null,
  presentation = "page",
  onClose,
  onUpdated,
}: {
  reportId: string;
  initialModel?: ConductReportModel | null;
  presentation?: ConductReportPresentation;
  onClose?: () => void;
  onUpdated?: (model: ConductReportModel) => void;
}) {
  const { translateText } = useAdminShell();
  const [reportModel, setReportModel] = useState<ConductReportModel | null>(initialModel);
  const [loading, setLoading] = useState(!initialModel);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialModel) return;
    let cancelled = false;
    const request = isAdminApiEnabled()
      ? adminApi.getReport(reportId)
      : Promise.resolve(findConductReportFromMock(localStorage, reportId));
    void request.then((record) => {
      if (cancelled) return;
      const nextModel = conductReportModelFromRecord(record);
      if (!nextModel || nextModel.id !== reportId) {
        setLoadError("The Conduct Report was not found.");
        setReportModel(null);
      } else {
        setReportModel(nextModel);
      }
      return undefined;
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "The Conduct Report could not load.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [initialModel, reportId]);

  if (loading && !reportModel) return <AdminLoading message={translateText("Loading Conduct Report…")} />;
  if (!reportModel) {
    return <main className="admin-feedback"><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Conduct Report not found")}</h1></CardHeader><CardContent className="space-y-4"><p>{translateText(loadError ?? "The requested Conduct Report was not found.")}</p>{presentation === "page" && <Button asChild variant="primary"><Link href={conductReportRoutes.list()}>{translateText("Return to Conduct Reports")}</Link></Button>}</CardContent></Card></main>;
  }

  return <ConductReportDrawer model={reportModel} presentation={presentation} onClose={onClose ?? (() => undefined)} onUpdated={onUpdated} />;
}

export function ConductReportDrawerRoute({
  reportId,
  initialModel,
}: {
  reportId: string;
  initialModel?: ConductReportModel | null;
}) {
  const router = useRouter();
  return <ConductReportDetail reportId={reportId} initialModel={initialModel} presentation="drawer" onClose={() => router.back()} onUpdated={() => router.refresh()} />;
}
