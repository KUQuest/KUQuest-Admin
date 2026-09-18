"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AdminActionReceipt, AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { formatAdminTimestamp } from "../date-format";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { adminApi, type AdminEvidence, type ReportDecision } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { reportRoutes } from "../admin-routes";
import { reportCaseStatusLabel } from "../domain/rulebook";
import { ModerationCaseWorkspace, ModerationHistoryPanel } from "../moderation-case/moderation-case-workspace";
import {
  findReportCaseFromMock,
  newReportCaseIdempotencyKey,
  saveMockReportDecision,
} from "./report-adapter";
import {
  REPORT_CASE_UPDATED_EVENT,
  reportCaseDecisionFor,
  reportCaseModelFromRecord,
  type ReportCaseDecisionChoice,
  type ReportCaseModel,
} from "./report-model";

type ReportCaseDetailProps = {
  reportId: string;
  initialModel?: ReportCaseModel | null;
  drawer?: boolean;
  onUpdated?: (model: ReportCaseModel) => void;
};

type DecisionDialogProps = {
  open: boolean;
  choice: ReportCaseDecisionChoice | null;
  busy: boolean;
  error: string | null;
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

type EvidenceState = {
  reference: string;
  evidence: AdminEvidence | null;
  error: string | null;
  loading: boolean;
};

function decisionDialogTitle(choice: ReportCaseDecisionChoice | null, translateText: (value: string) => string): string {
  if (choice === "confirmed-violation") return translateText("Confirm violation");
  if (choice === "restore") return translateText("Restore Message");
  return translateText("Close report");
}

function decisionDialogDescription(choice: ReportCaseDecisionChoice | null, modelId: string, translateText: (value: string) => string): string {
  if (choice === "confirmed-violation") return `${translateText("This will hide the Message and record a confirmed Report Case decision for")} ${modelId}.`;
  if (choice === "restore") return `${translateText("This will restore the Message and close the Report Case for")} ${modelId}.`;
  return `${translateText("This will dismiss the Report Case without changing the reported Member status for")} ${modelId}.`;
}

function ReportDecisionDialog({
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
  }, [open, choice]);

  if (!open) return null;
  const title = decisionDialogTitle(choice, translateText);
  const description = decisionDialogDescription(choice, model.id, translateText);
  const nextState = choice === "confirmed-violation"
    ? "REPORT_CASE_HIDDEN"
    : choice === "restore"
      ? "REPORT_CASE_RESTORED"
      : "REPORT_CASE_DISMISSED";
  const effect = choice === "confirmed-violation"
    ? "The Message and its Attachments are hidden. The Report Case stays open and creates a Misconduct strike."
    : choice === "restore"
      ? "The Message becomes visible again. The related Misconduct strike is reversed and the Report Case closes."
      : "The Report Case closes. The reported Message and Member status do not change.";
  const reversibility = choice === "confirmed-violation"
    ? "An Admin can restore the Message from the open Report Case."
    : choice === "restore"
      ? "The restored record is retained as an immutable decision history."
      : "The decision is retained as an immutable audit record.";

  return (
    <AdminModalPortal open={open} onClose={onCancel}>
      <dialog open className="report-decision-dialog" aria-modal="true" aria-labelledby="report-decision-title" tabIndex={-1}>
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          const value = reason.trim();
          if (value.length < 8) return;
          onConfirm(value);
        }}
      >
        <div className="dialog-body">
          <div className="warning-icon" aria-hidden="true">!</div>
          <h2 id="report-decision-title">{title}</h2>
          <p>{description}</p>
          {choice ? (
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Report Case")} ${model.id} · ${translateText("Message")}`}
              currentState={model.statusLabel}
              nextState={reportCaseStatusLabel(nextState)}
              effect={translateText(effect)}
              reversibility={translateText(reversibility)}
              warning={translateText("Read Message content only through the named Evidence Reference. The evidence read is logged as an Admin Action.")}
            />
          ) : null}
          <label htmlFor="report-decision-reason">{translateText("Reason for this decision")}</label>
          <textarea
            id="report-decision-reason"
            name="reason"
            rows={4}
            minLength={8}
            maxLength={500}
            required
            value={reason}
            aria-invalid={Boolean(error)}
            onChange={(event) => setReason(event.target.value)}
            placeholder={translateText("Enter the reason for the Report Case decision")}
          />
          <div className="field-help"><span>{translateText("Minimum 8 characters")}</span><span>{reason.length}/500</span></div>
          {error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div>
        <div className="dialog-actions">
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button>
          <button className="btn danger" type="submit" disabled={busy || reason.trim().length < 8}>
            {busy ? translateText("Saving…") : translateText("Confirm decision")}
          </button>
        </div>
      </form>
      </dialog>
    </AdminModalPortal>
  );
}

function evidenceContext(value: unknown, translateText: (value: string) => string): string {
  if (value === null || value === undefined || value === "") {
    return translateText("Bounded Evidence Reference context was not provided.");
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return translateText("The bounded Evidence Reference context could not be displayed.");
  }
}

function EvidencePreview({
  state,
  translateText,
  onClose,
}: {
  state: EvidenceState;
  translateText: (value: string) => string;
  onClose: () => void;
}) {
  return (
    <AdminModalPortal open onClose={onClose}>
      <dialog open className="report-evidence-dialog" aria-modal="true" aria-labelledby="report-evidence-title" tabIndex={-1}>
      <div className="dialog-body">
        <div className="evidence-preview-head">
          <div><strong id="report-evidence-title">{translateText("Evidence Reference")}</strong><small>{state.reference}</small></div>
          <button className="icon" type="button" aria-label={translateText("Close evidence")} onClick={onClose}><span className="close-lines" /></button>
        </div>
        {state.loading && <p>{translateText("Loading Evidence Reference…")}</p>}
        {state.error && <p className="field-error" role="alert">{translateText(state.error)}</p>}
        {!state.loading && !state.error && (
          <pre className="report-evidence-context">{evidenceContext(state.evidence?.context, translateText)}</pre>
        )}
        <div className="dialog-actions"><button className="btn" type="button" onClick={onClose}>{translateText("Close")}</button></div>
      </div>
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

function ReportAlert({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  const activeMessage = model.status === "REPORT_CASE_HIDDEN"
    ? translateText("The Message is hidden. Re-evaluate this Report Case or restore the Message.")
    : translateText("Review the submitted details and Evidence References before deciding this Report Case.");
  return (
    <div className={`dispute-page-alert report-page-alert ${model.isActionable ? "open" : "closed"}`}>
      <span aria-hidden="true">⚑</span>
      <div>
        <strong>{model.isActionable ? translateText("Active Report Case — review is required") : translateText("Closed Report Case — record retained")}</strong>
        <p>{model.isActionable ? activeMessage : translateText("This Report Case is closed and retained as a read-only audit record.")}</p>
      </div>
      <span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span>
    </div>
  );
}

function ReportOverview({
  model,
  translateText,
  compact = false,
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <>
        <Card as="section" className="section">
          <h3>{translateText("Report overview")}</h3>
          <div className="facts"><div className="fact"><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div className="fact"><span>{translateText("Report type")}</span><strong>{translateText(model.reportType)}</strong></div><div className="fact"><span>{translateText("Reported")}</span><strong>{formatAdminTimestamp(model.submittedAt)}</strong></div></div>
          <dl className="overview-meta moderation-case-context-grid"><div><dt>{translateText("Case")}</dt><dd>{model.id}</dd></div><div><dt>{translateText("Case type")}</dt><dd>{translateText("Report Case")}</dd></div><div><dt>{translateText("Source")}</dt><dd>{translateText("Message")}</dd></div><div><dt>{translateText("Submitted")}</dt><dd>{formatAdminTimestamp(model.submittedAt)}</dd></div><div><dt>{translateText("Evidence References")}</dt><dd>{model.evidence.length || translateText("None")}</dd></div></dl>
          <div className="overview-group"><span>{translateText("Submitted detail")}</span><p>{model.detail}</p></div>
          <div className="facts report-overview-parties"><div className="fact"><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} interactive={false} /></strong><small>{model.reportedMemberId ?? "—"}</small></div><div className="fact"><span>{translateText("Reporting Member")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} interactive={false} /></strong><small>{model.reporterId ?? "—"}</small></div></div>
        </Card>
      </>
    );
  }

  return (
    <Card as="section" className="record-panel report-overview">
      <div className="record-panel-head"><h2>{translateText("Report detail")}</h2></div>
      <p className="record-description">{model.detail}</p>
      <dl className="overview-meta">
        <div><dt>{translateText("Report type")}</dt><dd>{translateText(model.reportType)}</dd></div>
        <div><dt>{translateText("Submitted by")}</dt><dd><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></dd></div>
        <div><dt>{translateText("Reported Member")}</dt><dd><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></dd></div>
      </dl>
    </Card>
  );
}

function RelatedQuestPanel({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  if (!model.relatedQuestId && !model.relatedQuestTitle) return null;
  return (
    <Card as="section" className="section related-quest-panel">
      <div className="record-panel-head"><h3>{translateText("Related Quest")}</h3></div>
      <div className="side-facts">
        <div><span>{translateText("Quest")}</span><strong>{model.relatedQuestTitle ?? translateText("Not provided.")}</strong></div>
        <div><span>{translateText("Quest ID")}</span><strong>{model.relatedQuestId ?? "—"}</strong></div>
      </div>
      {model.relatedQuestHref && <Link className="btn full-width" href={model.relatedQuestHref}>{translateText("Open Quest detail")}</Link>}
    </Card>
  );
}

function PeopleInvolved({
  model,
  translateText,
  compact = false,
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Card as="section" className="section">
        <h3>{translateText("People involved")}</h3>
        <div className="facts"><div className="fact"><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} interactive={!compact} /></strong><small>{model.reportedMemberId}</small></div><div className="fact"><span>{translateText("Reported by")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} interactive={!compact} /></strong><small>{model.reporterId ?? "—"}</small></div></div>
      </Card>
    );
  }

  return (
    <Card as="section" className="record-panel">
      <h2>{translateText("People involved")}</h2>
      <div className="party-grid report-parties">
        <div><span>{translateText("Reporting Member")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></strong>{model.reporterId && <small>{model.reporterId}</small>}</div>
        <div><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></strong>{model.reportedMemberId && <small>{model.reportedMemberId}</small>}</div>
      </div>
    </Card>
  );
}

function EvidenceSection({
  model,
  translateText,
  onOpen,
  compact = false,
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onOpen: (reference: string) => void;
  compact?: boolean;
}) {
  const content = <>
    <div className="record-panel-head">{compact ? <h3>{translateText("Evidence")}</h3> : <h2>{translateText("Evidence")}</h2>}<span className="section-count">{model.evidence.length}</span></div>
    {model.evidence.length === 0 && <p className="audit-note">{translateText("No Evidence Reference was provided.")}</p>}
    {model.evidence.length > 0 && (
      <div className="evidence-stack">
        {model.evidence.map((evidence) => (
          evidence.reference
            ? <button key={evidence.reference} className="evidence-item" type="button" onClick={() => { const reference = evidence.reference; if (reference) onOpen(reference); }}><span className="evidence-state">✓</span><span><strong>{evidence.label}</strong><small>{translateText("Bounded Evidence Reference")}</small></span><span>{translateText("Open")}</span></button>
            : <div key={evidence.label} className="evidence-item evidence-unavailable"><span className="evidence-state pending">!</span><span><strong>{evidence.label}</strong><small>{translateText("Evidence Reference not available")}</small></span><span>{translateText("Unavailable")}</span></div>
        ))}
      </div>
    )}
  </>;
  return (
    compact ? <Card as="section" className="section">{content}</Card> : <Card as="section" className="record-panel">{content}</Card>
  );
}

function MemberSummaryPanel({
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
    <Card as="section" className="record-panel">
      <h2>{translateText(heading)}</h2>
      <div className="side-facts"><div><span>{translateText("Name")}</span><strong><MemberLink id={id} name={name} href={href} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{id || "—"}</strong></div></div>
      {href && <Link className="btn full-width" href={href}>{translateText("See Member profile")}</Link>}
    </Card>
  );
}

function ResolutionDetails({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  const details = [
    ["Resolution", model.resolution],
    ["Resolved by", model.resolvedBy],
    ["Resolution time", model.resolutionAt ? formatAdminTimestamp(model.resolutionAt) : null],
    ["Closed at", model.closedAt ? formatAdminTimestamp(model.closedAt) : null],
  ] as const;
  return (
    <>
      {model.decisionReason && <div className="overview-group"><span>{translateText("Reason for decision")}</span><p>{model.decisionReason}</p></div>}
      {details.some(([, value]) => value) && (
        <dl className="overview-meta report-resolution-meta">
          {details.flatMap(([label, value]) => value ? [<div key={label}><dt>{translateText(label)}</dt><dd>{value}</dd></div>] : [])}
        </dl>
      )}
    </>
  );
}

function ReportTimeline({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  const events = model.status === "REPORT_CASE_PENDING"
    ? [
      { title: "Report submitted", time: formatAdminTimestamp(model.submittedAt), detail: `${model.reporterName} reported ${model.reportedMemberName}` },
      { title: "Awaiting Admin decision", time: translateText("Open"), detail: translateText("Review the submitted details and Evidence References.") },
    ]
    : model.status === "REPORT_CASE_HIDDEN"
      ? [
        { title: "Report submitted", time: formatAdminTimestamp(model.submittedAt), detail: `${model.reporterName} reported ${model.reportedMemberName}` },
        { title: "Message hidden", time: model.resolutionAt || model.closedAt ? formatAdminTimestamp(model.resolutionAt ?? model.closedAt) : translateText("Time not provided"), detail: translateText("The Report Case remains open for re-evaluation.") },
      ]
      : [
        { title: "Report submitted", time: formatAdminTimestamp(model.submittedAt), detail: `${model.reporterName} reported ${model.reportedMemberName}` },
        { title: "Report Case decision recorded", time: model.resolutionAt || model.closedAt ? formatAdminTimestamp(model.resolutionAt ?? model.closedAt) : translateText("Time not provided"), detail: model.decisionReason ?? model.decisionLabel ?? translateText("Record retained for audit.") },
      ];

  return (
    <Card as="section" className="record-panel">
      <h2>{translateText("Report timeline")}</h2>
      <ol className="timeline">
        {events.map((event) => <li key={`${event.title}-${event.time}`}><strong>{translateText(event.title)}</strong><time>{event.time}</time><span>{translateText(event.detail)}</span></li>)}
      </ol>
    </Card>
  );
}

function DecisionControls({
  model,
  translateText,
  selectedChoice,
  commandError,
  onSelect,
  onStart,
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  selectedChoice: ReportCaseDecisionChoice | null;
  commandError: string | null;
  onSelect: (choice: ReportCaseDecisionChoice) => void;
  onStart: () => void;
}) {
  if (!model.isActionable) {
    return (
      <>
        <p className="audit-note">{translateText("Decision recorded:")} <strong>{translateText(model.decisionLabel ?? model.statusLabel)}</strong>.</p>
        <ResolutionDetails model={model} translateText={translateText} />
      </>
    );
  }

  if (model.status === "REPORT_CASE_HIDDEN") {
    return (
      <>
        <p className="audit-note">{translateText("This Message is hidden. A reason is required before the Admin restores it.")}</p>
        <ResolutionDetails model={model} translateText={translateText} />
        {commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}
        <button className="btn primary full-width" type="button" data-report-decision="restore" onClick={() => { onSelect("restore"); onStart(); }}>
          {translateText("Restore Message")}
        </button>
      </>
    );
  }

  return (
    <>
      <p className="audit-note">{translateText("Decide whether the submitted Evidence confirms an actual policy violation. The Report Case reason is required.")}</p>
      <fieldset className="report-decision-options">
        <legend className="visually-hidden">{translateText("Report decision")}</legend>
        <div className={`report-decision-option ${selectedChoice === "no-violation" ? "selected" : ""}`}>
          <input id={`report-decision-${model.id}-no-violation`} type="radio" name={`report-decision-${model.id}`} value="no-violation" data-report-decision="no-violation" checked={selectedChoice === "no-violation"} onChange={() => onSelect("no-violation")} />
          <label htmlFor={`report-decision-${model.id}-no-violation`}><strong>{translateText("No violation")}</strong><small>{translateText("Dismiss the Report Case without changing the reported Member status.")}</small></label>
        </div>
        <div className={`report-decision-option ${selectedChoice === "confirmed-violation" ? "selected" : ""}`}>
          <input id={`report-decision-${model.id}-confirmed-violation`} type="radio" name={`report-decision-${model.id}`} value="confirmed-violation" data-report-decision="confirmed-violation" checked={selectedChoice === "confirmed-violation"} onChange={() => onSelect("confirmed-violation")} />
          <label htmlFor={`report-decision-${model.id}-confirmed-violation`}><strong>{translateText("Confirm violation")}</strong><small>{translateText("Hide the Message and record the confirmed Report Case decision.")}</small></label>
        </div>
      </fieldset>
      {commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}
      <button className="btn danger full-width" type="button" data-report-close="Close report" onClick={onStart}>{translateText("Close report")}</button>
    </>
  );
}

function ReportCaseSections({
  model,
  translateText,
  onOpenEvidence,
  selectedChoice,
  commandError,
  onSelectChoice,
  onStartDecision,
  actionReceipt,
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onOpenEvidence: (reference: string) => void;
  selectedChoice: ReportCaseDecisionChoice | null;
  commandError: string | null;
  onSelectChoice: (choice: ReportCaseDecisionChoice) => void;
  onStartDecision: () => void;
  actionReceipt?: ReactNode;
}) {
  const decisionPanel = (
    <DecisionControls
      model={model}
      translateText={translateText}
      selectedChoice={selectedChoice}
      commandError={commandError}
      onSelect={onSelectChoice}
      onStart={onStartDecision}
    />
  );

  return (
    <>
      <div className="full-record-grid">
        <div className="record-primary">
          <ReportOverview model={model} translateText={translateText} />
          <PeopleInvolved model={model} translateText={translateText} />
          <EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} />
          <ReportTimeline model={model} translateText={translateText} />
        </div>
        <aside className="record-side">
          <MemberSummaryPanel heading="Reported Member" id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} translateText={translateText} />
          <MemberSummaryPanel heading="Submitted by" id={model.reporterId} name={model.reporterName} href={model.reporterHref} translateText={translateText} />
          <Card as="section" className="record-panel report-decision-panel">
            <h2>{model.isActionable ? translateText("Report decision") : translateText("Recorded outcome")}</h2>
            {decisionPanel}
          </Card>
        </aside>
      </div>
      {actionReceipt}
    </>
  );
}

function DrawerSections({
  model,
  translateText,
  onOpenEvidence,
  selectedChoice,
  commandError,
  onSelectChoice,
  onStartDecision,
  actionReceipt,
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onOpenEvidence: (reference: string) => void;
  selectedChoice: ReportCaseDecisionChoice | null;
  commandError: string | null;
  onSelectChoice: (choice: ReportCaseDecisionChoice) => void;
  onStartDecision: () => void;
  actionReceipt?: ReactNode;
}) {
  return (
    <div className="report-case-drawer-detail">
      <ReportAlert model={model} translateText={translateText} />
      <ModerationCaseWorkspace
        kind="Report Case"
        caseId={model.id}
        statusLabel={model.statusLabel}
        badgeClass={model.badgeClass}
        submittedAt={formatAdminTimestamp(model.submittedAt)}
        source="Message"
        detail={model.detail}
        reportedMember={{ id: model.reportedMemberId, name: model.reportedMemberName, href: model.reportedMemberHref, role: "Reported Member" }}
        reporter={{ id: model.reporterId, name: model.reporterName, href: model.reporterHref, role: "Reporting Member" }}
        relatedRecord={model.relatedQuestId ? { id: model.relatedQuestId, title: model.relatedQuestTitle, href: model.relatedQuestHref } : null}
        evidenceCount={model.evidence.length}
        moderationHistory={model.moderationHistory}
        policyNote="Admin may read Message content only through the named Evidence Reference. Every evidence read is logged as an Admin Action."
        translateText={translateText}
        showDecisionContext={false}
        showModerationHistory={false}
        showRelatedRecord={false}
        compact
      >
        <ReportOverview model={model} translateText={translateText} compact />
        <EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} compact />
        <RelatedQuestPanel model={model} translateText={translateText} />
        <PeopleInvolved model={model} translateText={translateText} compact />
        <ModerationHistoryPanel
          summary={model.moderationHistory}
          translateText={translateText}
          compact
          member={{ id: model.reportedMemberId, name: model.reportedMemberName, href: model.reportedMemberHref }}
        />
        <Card as="section" className="section report-decision-panel"><h3>{model.isActionable ? translateText("Report decision") : translateText("Resolution")}</h3><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></Card>
      </ModerationCaseWorkspace>
      {actionReceipt}
      <div className="drawer-actions">{model.reportedMemberHref && <Button asChild size="lg" variant="outline"><Link href={model.reportedMemberHref}>{translateText("Member profile")}</Link></Button>}<Button asChild size="lg" variant="primary"><a href={reportRoutes.detail(model.id)}>{translateText("Open full Report Case")}</a></Button></div>
    </div>
  );
}

export function ReportCaseDetail({
  reportId,
  initialModel = null,
  drawer = false,
  onUpdated,
}: ReportCaseDetailProps) {
  const { translateText } = useAdminShell();
  const [reportModel, setReportModel] = useState<ReportCaseModel | null>(initialModel);
  const [loading, setLoading] = useState(!initialModel);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<ReportCaseDecisionChoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [evidenceState, setEvidenceState] = useState<EvidenceState | null>(null);
  const [actionReceipt, setActionReceipt] = useState<{
    action: string;
    status: string;
    reason: string;
    occurredAt: string;
  } | null>(null);

  useEffect(() => {
    if (initialModel && !drawer) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const request = isAdminApiEnabled()
      ? adminApi.getReport(reportId)
      : Promise.resolve(findReportCaseFromMock(localStorage, reportId));

    void request.then((nextRecord) => {
      if (cancelled) return undefined;
      const nextModel = reportCaseModelFromRecord(nextRecord);
      if (!nextModel || nextModel.id !== reportId) {
        setReportModel(null);
        setLoadError("The Report Case was not found.");
      } else {
        setReportModel(nextModel);
      }
      return undefined;
    }).catch((error: unknown) => {
      if (cancelled) return undefined;
      setLoadError(error instanceof Error ? error.message : "The Report Case could not load.");
      return undefined;
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [drawer, initialModel, reportId]);

  const model = reportModel;

  if (loading && !model) return <AdminLoading message={translateText("Loading Report Case…")} />;
  if (!model) {
    return (
      <main className={drawer ? "drawer-body" : "admin-feedback"}>
        <Card as="section" className="panel"><h1>{translateText("Report Case not found")}</h1><p>{translateText(loadError ?? "The requested Report Case was not found.")}</p>{!drawer && <Link className="btn primary" href={reportRoutes.list()}>{translateText("Return to Report Cases")}</Link>}</Card>
      </main>
    );
  }

  const openEvidence = async (reference: string) => {
    setEvidenceState({ reference, evidence: null, error: null, loading: true });
    try {
      const evidence = isAdminApiEnabled()
        ? await adminApi.getEvidence(reference)
        : { evidenceRef: reference };
      setEvidenceState({ reference, evidence, error: null, loading: false });
    } catch (error: unknown) {
      setEvidenceState({ reference, evidence: null, error: error instanceof Error ? error.message : "Evidence Reference could not load.", loading: false });
    }
  };

  const startDecision = () => {
    if (!model.isActionable) return;
    if (model.status === "REPORT_CASE_PENDING" && !selectedChoice) {
      setCommandError("Choose No violation or Confirm violation before closing.");
      window.requestAnimationFrame(() => {
        document.getElementById(`report-decision-${model.id}-no-violation`)?.focus();
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
    const decision = reportCaseDecisionFor(selectedChoice);
    const options: ReportDecision = {
      decision,
      reason,
      idempotencyKey: newReportCaseIdempotencyKey(model.id),
      ...(model.version === undefined ? {} : { expectedVersion: model.version }),
    };

    try {
      const updated = isAdminApiEnabled()
        ? await adminApi.decideReport(model.id, options)
        : saveMockReportDecision(localStorage, model.id, decision, reason);
      const updatedModel = reportCaseModelFromRecord(updated);
      if (!updatedModel || updatedModel.id !== model.id) {
        throw new Error(isAdminApiEnabled() ? "The Admin API returned an invalid Report Case." : "The Report Case record is invalid.");
      }
      setReportModel(updatedModel);
      window.dispatchEvent(new CustomEvent(REPORT_CASE_UPDATED_EVENT, { detail: updatedModel }));
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
      setCommandError(error instanceof Error ? error.message : "The Report Case decision could not be saved.");
    } finally {
      setCommandBusy(false);
    }
  };

  const overlays = (
    <>
      <ReportDecisionDialog model={model} open={dialogOpen} choice={selectedChoice} busy={commandBusy} error={commandError} translateText={translateText} onCancel={() => { if (!commandBusy) { setDialogOpen(false); setCommandError(null); } }} onConfirm={confirmDecision} />
      {evidenceState && <EvidencePreview state={evidenceState} translateText={translateText} onClose={() => setEvidenceState(null)} />}
    </>
  );

  const content = (
    <>
      <ReportAlert model={model} translateText={translateText} />
      <RecordStatusBar items={[{ id: "status", label: translateText("Status"), value: <span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span> }, { id: "report-type", label: translateText("Report type"), value: translateText(model.reportType) }, { id: "submitted", label: translateText("Submitted"), value: formatAdminTimestamp(model.submittedAt) }, { id: "reported-member", label: translateText("Reported Member"), value: <MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /> }, { id: "evidence", label: translateText("Evidence"), value: model.evidence.length || translateText("None") }]} />
      <ReportCaseSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} actionReceipt={actionReceipt ? <AdminActionReceipt action={actionReceipt.action} resource="Report Case" resourceId={model.id} status={actionReceipt.status} occurredAt={actionReceipt.occurredAt} mock details={<p>{translateText("Reason")}: {actionReceipt.reason}</p>} /> : null} />
    </>
  );

  if (drawer) {
    return <><DrawerSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} actionReceipt={actionReceipt ? <AdminActionReceipt action={actionReceipt.action} resource="Report Case" resourceId={model.id} status={actionReceipt.status} occurredAt={actionReceipt.occurredAt} mock details={<p>{translateText("Reason")}: {actionReceipt.reason}</p>} /> : null} />{overlays}</>;
  }

  return (
    <main className="admin-route-page report-case-detail" tabIndex={-1}>
      <div className="record-breadcrumb"><Link href={reportRoutes.list()}>{translateText("Report Cases")}</Link><span>›</span><span>{model.id}</span></div>
      <div className="full-record-head"><div><div className="record-id">{model.id}</div><h1>{translateText(model.title)}</h1><p>{translateText(model.reportType)} · {translateText("submitted")} {formatAdminTimestamp(model.submittedAt)}</p></div><div className="full-record-actions"><Button asChild size="lg" variant="outline"><Link href={reportRoutes.list()}>{translateText("Back to Report Cases")}</Link></Button></div></div>
      {content}
      {overlays}
    </main>
  );
}

export function ReportCaseDrawer({
  reportId,
  initialModel,
  onClose,
  onUpdated,
}: {
  reportId: string;
  initialModel?: ReportCaseModel | null;
  onClose: () => void;
  onUpdated?: (model: ReportCaseModel) => void;
}) {
  const { translateText } = useAdminShell();
  return (
    <AdminDrawer
      ariaLabel={translateText("Close Report Case drawer")}
      closeButtonAriaLabel={translateText("Close drawer")}
      title={<><span aria-hidden="true">{initialModel?.title ?? reportId}</span><span className="visually-hidden">{translateText("Report Case details")}</span></>}
      titleId="report-case-drawer-title"
      subtitle={<>{translateText("Report Case")} {initialModel?.id ?? reportId} · {translateText("Report Case detail drawer")}</>}
      className="report-case-drawer quest-style-drawer"
      openerAttribute="data-report-id"
      openerValue={reportId}
      onClose={onClose}
    >
      <ReportCaseDetail reportId={reportId} initialModel={initialModel} drawer onUpdated={onUpdated} />
    </AdminDrawer>
  );
}

export function ReportCaseDrawerRoute({
  reportId,
  initialModel,
}: {
  reportId: string;
  initialModel?: ReportCaseModel | null;
}) {
  const router = useRouter();
  return (
    <ReportCaseDrawer
      reportId={reportId}
      initialModel={initialModel}
      onClose={() => router.back()}
      onUpdated={() => router.refresh()}
    />
  );
}
