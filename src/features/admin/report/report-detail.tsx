"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AdminActionReceipt } from "../../../components/admin/admin-action-feedback";
import { formatAdminTimestamp } from "../date-format";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminRecordHeader } from "../../../components/admin/admin-record-header";
import { AdminRecordGrid } from "../../../components/admin/admin-record-grid";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { AdminOverviewMeta } from "../../../components/admin/admin-overview-meta";
import {
  adminRecordCount,
  adminRecordDescription,
  adminRecordFact,
  adminRecordFacts,
  adminRecordGroup,
  adminRecordHeader,
  adminRecordHeading,
  adminRecordPartyGrid,
  adminRecordSection,
  adminRecordSideFacts,
} from "../../../components/admin/admin-record-styles";
import { type AdminEvidence, type ReportDecision } from "../api/admin-api";
import { adminApiProvider, isAdminApiEnabled } from "../api/admin-provider";
import { reportRoutes } from "../admin-routes";
import { ModerationCaseWorkspace, ModerationHistoryPanel } from "../moderation-case/moderation-case-workspace";
import {
  newReportCaseIdempotencyKey,
  saveMockReportDecision,
} from "./report-adapter";
import { ReportDecisionDialog } from "./report-decision-dialog";
import {
  REPORT_CASE_UPDATED_EVENT,
  reportCaseDecisionFor,
  reportCaseModelFromRecord,
  type ReportCaseDecisionChoice,
  type ReportCaseModel,
} from "./report-model";
import { useReportDetailQuery, useReportEvidenceQuery } from "./report-query";

type ReportCaseDetailProps = {
  reportId: string;
  initialModel?: ReportCaseModel | null;
  drawer?: boolean;
  onUpdated?: (model: ReportCaseModel) => void;
};

type EvidenceState = {
  reference: string;
  evidence: AdminEvidence | null;
  error: string | null;
  loading: boolean;
};

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
      <div className="dialog-body p-5">
        <div className="sticky top-0 z-[2] flex items-center justify-between border-b border-admin-border bg-admin-surface/95 px-4 py-3 backdrop-blur-sm">
          <div><strong id="report-evidence-title" className="block">{translateText("Evidence Reference")}</strong><small className="block text-[13px] text-admin-muted">{state.reference}</small></div>
          <button className="icon" type="button" aria-label={translateText("Close evidence")} onClick={onClose}><span className="close-lines" /></button>
        </div>
        {state.loading && <p>{translateText("Loading Evidence Reference…")}</p>}
        {state.error && <p className="field-error" role="alert">{translateText(state.error)}</p>}
        {!state.loading && !state.error && (
          <pre className="report-evidence-context max-h-[50vh] overflow-auto rounded-lg bg-admin-soft p-3 text-sm [overflow-wrap:anywhere]">{evidenceContext(state.evidence?.context, translateText)}</pre>
        )}
        <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5"><Button variant="outline" type="button" onClick={onClose}>{translateText("Close")}</Button></div>
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
    <AdminStatusAlert
      tone={model.isActionable ? "warning" : "success"}
      title={model.isActionable ? translateText("Active Report Case — review is required") : translateText("Closed Report Case — record retained")}
      description={model.isActionable ? activeMessage : translateText("This Report Case is closed and retained as a read-only audit record.")}
      badge={translateText(model.statusLabel)}
      badgeClassName={model.badgeClass}
      className="dispute-page-alert report-page-alert"
    />
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
      <Card as="section" className={adminRecordSection}>
          <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("Report overview")}</h3></CardHeader>
          <div className={adminRecordFacts}><div className={adminRecordFact}><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div className={adminRecordFact}><span>{translateText("Report type")}</span><strong>{translateText(model.reportType)}</strong></div><div className={adminRecordFact}><span>{translateText("Reported")}</span><strong>{formatAdminTimestamp(model.submittedAt)}</strong></div></div>
          <AdminOverviewMeta className="moderation-case-context-grid !grid-cols-2 max-[600px]:!grid-cols-1"><div><dt>{translateText("Case")}</dt><dd>{model.id}</dd></div><div><dt>{translateText("Case type")}</dt><dd>{translateText("Report Case")}</dd></div><div><dt>{translateText("Source")}</dt><dd>{translateText("Message")}</dd></div><div><dt>{translateText("Submitted")}</dt><dd>{formatAdminTimestamp(model.submittedAt)}</dd></div><div><dt>{translateText("Evidence References")}</dt><dd>{model.evidence.length || translateText("None")}</dd></div></AdminOverviewMeta>
          <div className={adminRecordGroup}><span>{translateText("Submitted detail")}</span><p>{model.detail}</p></div>
          <div className={`${adminRecordFacts} report-overview-parties`}><div className={adminRecordFact}><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} interactive={false} /></strong><small>{model.reportedMemberId ?? "—"}</small></div><div className={adminRecordFact}><span>{translateText("Reporting Member")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} interactive={false} /></strong><small>{model.reporterId ?? "—"}</small></div></div>
      </Card>
    );
  }

  return (
    <Card as="section" className={`${adminRecordSection} report-overview`}>
      <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Report detail")}</h2></CardHeader>
      <p className={adminRecordDescription}>{model.detail}</p>
      <AdminOverviewMeta className="mt-[18px]">
        <div><dt>{translateText("Report type")}</dt><dd>{translateText(model.reportType)}</dd></div>
        <div><dt>{translateText("Submitted by")}</dt><dd><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></dd></div>
        <div><dt>{translateText("Reported Member")}</dt><dd><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></dd></div>
      </AdminOverviewMeta>
    </Card>
  );
}

function RelatedQuestPanel({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  if (!model.relatedQuestId && !model.relatedQuestTitle) return null;
  return (
    <Card as="section" className={`${adminRecordSection} related-quest-panel`}>
      <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("Related Quest")}</h3></CardHeader>
      <div className={adminRecordSideFacts}>
        <div><span>{translateText("Quest")}</span><strong>{model.relatedQuestTitle ?? translateText("Not provided.")}</strong></div>
        <div><span>{translateText("Quest ID")}</span><strong>{model.relatedQuestId ?? "—"}</strong></div>
      </div>
      {model.relatedQuestHref && <Button asChild variant="outline" className="mt-3 w-full"><Link href={model.relatedQuestHref}>{translateText("Open Quest detail")}</Link></Button>}
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
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("People involved")}</h3></CardHeader>
        <div className={adminRecordFacts}><div className={adminRecordFact}><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} interactive={!compact} /></strong><small>{model.reportedMemberId}</small></div><div className={adminRecordFact}><span>{translateText("Reported by")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} interactive={!compact} /></strong><small>{model.reporterId ?? "—"}</small></div></div>
      </Card>
    );
  }

  return (
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("People involved")}</h2></CardHeader>
      <div className={`${adminRecordPartyGrid} report-parties`}>
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
    <CardHeader flush className={adminRecordHeader}>{compact ? <h3 className={adminRecordHeading}>{translateText("Evidence")}</h3> : <h2 className={adminRecordHeading}>{translateText("Evidence")}</h2>}<span className={adminRecordCount}>{model.evidence.length}</span></CardHeader>
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
    <Card as="section" className={adminRecordSection}>{content}</Card>
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
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText(heading)}</h2></CardHeader>
      <div className={adminRecordSideFacts}><div><span>{translateText("Name")}</span><strong><MemberLink id={id} name={name} href={href} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{id || "—"}</strong></div></div>
      {href && <Button asChild variant="outline" className="mt-3 w-full"><Link href={href}>{translateText("See Member profile")}</Link></Button>}
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
      {model.decisionReason && <div className={adminRecordGroup}><span>{translateText("Reason for decision")}</span><p>{model.decisionReason}</p></div>}
      {details.some(([, value]) => value) && (
        <AdminOverviewMeta className="report-resolution-meta">
          {details.flatMap(([label, value]) => value ? [<div key={label}><dt>{translateText(label)}</dt><dd>{value}</dd></div>] : [])}
        </AdminOverviewMeta>
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
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Report timeline")}</h2></CardHeader>
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
        <Button variant="primary" className="w-full" type="button" data-report-decision="restore" onClick={() => { onSelect("restore"); onStart(); }}>
          {translateText("Restore Message")}
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="audit-note">{translateText("Decide whether the submitted Evidence confirms an actual policy violation. The Report Case reason is required.")}</p>
      <fieldset className="report-decision-options mt-3.5 grid gap-2 border-0 p-0">
        <legend className="visually-hidden">{translateText("Report decision")}</legend>
        <div className={`report-decision-option grid w-full grid-cols-[18px_1fr] items-start gap-x-2 gap-y-0.5 rounded-[9px] border border-admin-border bg-admin-surface px-3 py-[11px] text-left transition-colors hover:bg-admin-hover ${selectedChoice === "no-violation" ? "border-admin-accent bg-admin-accent-soft shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
          <input className="mt-0.5" id={`report-decision-${model.id}-no-violation`} type="radio" name={`report-decision-${model.id}`} value="no-violation" data-report-decision="no-violation" checked={selectedChoice === "no-violation"} onChange={() => onSelect("no-violation")} />
          <label className="grid cursor-pointer gap-0.5" htmlFor={`report-decision-${model.id}-no-violation`}><strong className="text-sm leading-[1.35]">{translateText("No violation")}</strong><small className="text-[13px] leading-[1.45] text-admin-muted">{translateText("Dismiss the Report Case without changing the reported Member status.")}</small></label>
        </div>
        <div className={`report-decision-option grid w-full grid-cols-[18px_1fr] items-start gap-x-2 gap-y-0.5 rounded-[9px] border border-admin-border bg-admin-surface px-3 py-[11px] text-left transition-colors hover:bg-admin-hover ${selectedChoice === "confirmed-violation" ? "border-admin-accent bg-admin-accent-soft shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
          <input className="mt-0.5" id={`report-decision-${model.id}-confirmed-violation`} type="radio" name={`report-decision-${model.id}`} value="confirmed-violation" data-report-decision="confirmed-violation" checked={selectedChoice === "confirmed-violation"} onChange={() => onSelect("confirmed-violation")} />
          <label className="grid cursor-pointer gap-0.5" htmlFor={`report-decision-${model.id}-confirmed-violation`}><strong className="text-sm leading-[1.35]">{translateText("Confirm violation")}</strong><small className="text-[13px] leading-[1.45] text-admin-muted">{translateText("Hide the Message and record the confirmed Report Case decision.")}</small></label>
        </div>
      </fieldset>
      {commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}
      <Button variant="danger" className="w-full" type="button" data-report-close="Close report" onClick={onStart}>{translateText("Close report")}</Button>
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
      <AdminRecordGrid
        primary={<>
          <ReportOverview model={model} translateText={translateText} />
          <PeopleInvolved model={model} translateText={translateText} />
          <EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} />
          <ReportTimeline model={model} translateText={translateText} />
        </>}
        side={<>
          <MemberSummaryPanel heading="Reported Member" id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} translateText={translateText} />
          <MemberSummaryPanel heading="Submitted by" id={model.reporterId} name={model.reporterName} href={model.reporterHref} translateText={translateText} />
          <Card as="section" className={`${adminRecordSection} report-decision-panel pb-[18px]`}>
            <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{model.isActionable ? translateText("Report decision") : translateText("Recorded outcome")}</h2></CardHeader>
            {decisionPanel}
          </Card>
        </>}
      />
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
    <div className="report-case-drawer-detail admin-drawer-content-flow grid min-w-0 content-start gap-[18px]">
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
        <Card as="section" className={`${adminRecordSection} report-decision-panel pb-[18px]`}><CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{model.isActionable ? translateText("Report decision") : translateText("Resolution")}</h3></CardHeader><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></Card>
      </ModerationCaseWorkspace>
      {actionReceipt}
      <div className="admin-drawer-actions sticky bottom-[-28px] z-[4] m-[18px_-24px_-28px] flex flex-wrap gap-2 border-t border-admin-border bg-admin-surface/95 px-6 py-3.5 shadow-[0_-6px_18px_rgba(0,0,0,0.09)] [&>*]:min-h-11 [&>*]:flex-[1_1_180px] [&>*]:text-center max-[720px]:bottom-[-24px] max-[720px]:m-[18px_-16px_-24px] max-[720px]:px-4 max-[720px]:[&>*]:basis-full">{model.reportedMemberHref && <Button asChild size="lg" variant="outline"><Link href={model.reportedMemberHref}>{translateText("Member profile")}</Link></Button>}<Button asChild size="lg" variant="primary"><a href={reportRoutes.detail(model.id)}>{translateText("Open full Report Case")}</a></Button></div>
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
  const { data: reportModel, isPending, error } = useReportDetailQuery(reportId, initialModel);
  const [selectedChoice, setSelectedChoice] = useState<ReportCaseDecisionChoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [evidenceReference, setEvidenceReference] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<{
    action: string;
    status: string;
    reason: string;
    occurredAt: string;
  } | null>(null);

  const model = reportModel;
  const evidenceQuery = useReportEvidenceQuery(evidenceReference);

  if (isPending && !model) return <AdminLoading message={translateText("Loading Report Case…")} />;
  if (!model) {
    return (
      <main className={drawer ? "drawer-body" : "admin-feedback"}>
      <Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Report Case not found")}</h1></CardHeader><CardContent className="space-y-4"><p>{translateText(error instanceof Error ? error.message : "The requested Report Case was not found.")}</p>{!drawer && <Button asChild variant="primary"><Link href={reportRoutes.list()}>{translateText("Return to Report Cases")}</Link></Button>}</CardContent></Card>
      </main>
    );
  }

  const openEvidence = (reference: string) => setEvidenceReference(reference);

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
        ? await adminApiProvider.commands.decideReport(model.id, options)
        : saveMockReportDecision(localStorage, model.id, decision, reason);
      const updatedModel = reportCaseModelFromRecord(updated);
      if (!updatedModel || updatedModel.id !== model.id) {
        throw new Error(isAdminApiEnabled() ? "The Admin API returned an invalid Report Case." : "The Report Case record is invalid.");
      }
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

  const evidenceState: EvidenceState | null = evidenceReference ? {
    reference: evidenceReference,
    evidence: evidenceQuery.data ?? null,
    error: evidenceQuery.error instanceof Error ? evidenceQuery.error.message : evidenceQuery.error ? "Evidence Reference could not load." : null,
    loading: evidenceQuery.isPending,
  } : null;
  const overlays = (
    <>
      <ReportDecisionDialog model={model} open={dialogOpen} choice={selectedChoice} busy={commandBusy} error={commandError} translateText={translateText} onCancel={() => { if (!commandBusy) { setDialogOpen(false); setCommandError(null); } }} onConfirm={confirmDecision} />
      {evidenceState && <EvidencePreview state={evidenceState} translateText={translateText} onClose={() => setEvidenceReference(null)} />}
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
      <AdminRecordHeader
        breadcrumbHref={reportRoutes.list()}
        breadcrumbLabel={translateText("Report Cases")}
        recordId={model.id}
        title={translateText(model.title)}
        subtitle={`${translateText(model.reportType)} · ${translateText("submitted")} ${formatAdminTimestamp(model.submittedAt)}`}
        actions={<Button asChild size="lg" variant="outline"><Link href={reportRoutes.list()}>{translateText("Back to Report Cases")}</Link></Button>}
      />
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
