"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatAdminTimestamp } from "../date-format";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminRecordHeader } from "../../../components/admin/admin-record-header";
import { AdminRecordGrid } from "../../../components/admin/admin-record-grid";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
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
import { type AdminDisputeEvidence, type AdminDisputeReasonCode, type DisputeResolution } from "../api/admin-api";
import { disputeRoutes, questRoutes } from "../admin-routes";
import { ModerationCaseWorkspace, ModerationHistoryPanel } from "../moderation-case/moderation-case-workspace";
import { newDisputeCaseIdempotencyKey } from "./dispute-service";
import { useDisputeBoardStore } from "./dispute-board-store";
import {
  disputeCaseDecisionFor,
  DISPUTE_CASE_UPDATED_EVENT,
  type DisputeCaseDecisionChoice,
  type DisputeCaseModel,
} from "./dispute-model";
import { questStateLabel } from "../domain/rulebook";
import { questStatusClass } from "../quest/quest-model";
import { displayAdminId } from "../display-admin-id";
import { activityLogValueLabel } from "../activity-log/activity-log-model";
import { DisputeDecisionDialog } from "./dispute-decision-dialog";
import { useDisputeDecisionMutation, useDisputeDetailQuery, useDisputeEvidenceQuery } from "./dispute-query";

type DisputeCaseDetailProps = {
  disputeId: string;
  initialModel?: DisputeCaseModel | null;
  drawer?: boolean;
  onUpdated?: (model: DisputeCaseModel) => void;
};

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

function DisputeAlert({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  return (
    <AdminStatusAlert
      tone={model.isActionable ? "danger" : "success"}
      title={model.isActionable ? translateText("Active Dispute Case — review is required") : translateText("Closed Dispute Case — record retained")}
      description={model.isActionable
        ? translateText("The Quest is Failed. Decide whether to dismiss the case or redirect the settlement to the Worker.")
        : translateText("This Dispute Case is closed and retained as a read-only audit record. The Quest State remains failed.")}
      badge={translateText(model.statusLabel)}
      badgeClassName={model.badgeClass}
      className="dispute-page-alert"
    />
  );
}

function Overview({ model, translateText, compact = false }: { model: DisputeCaseModel; translateText: (value: string) => string; compact?: boolean }) {
  if (compact) {
    return (
      <Card as="section" className={adminRecordSection}>
          <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("Dispute overview")}</h3></CardHeader>
          <div className={adminRecordFacts}><div className={adminRecordFact}><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div className={adminRecordFact}><span>{translateText("Category")}</span><strong>{translateText(model.category)}</strong></div><div className={adminRecordFact}><span>{translateText("Amount at risk")}</span><strong>{model.amountAtRiskLabel}</strong></div></div>
          <AdminOverviewMeta className="moderation-case-context-grid !grid-cols-2 max-[600px]:!grid-cols-1"><div><dt>{translateText("Case")}</dt><dd>{model.displayId}</dd></div><div><dt>{translateText("Case type")}</dt><dd>{translateText("Dispute Case")}</dd></div><div><dt>{translateText("Source")}</dt><dd>{translateText("Quest settlement")}</dd></div><div><dt>{translateText("Submitted")}</dt><dd>{model.submittedAt}</dd></div><div><dt>{translateText("Evidence References")}</dt><dd>{model.evidence.length || translateText("None")}</dd></div></AdminOverviewMeta>
          <div className={adminRecordGroup}><span>{translateText("Submitted detail")}</span><p>{model.detail}</p></div>
          <div className={adminRecordPartyGrid}><div><span>{translateText(model.filerRole)}</span><strong><MemberLink id={model.filerId} name={model.filerName} href={model.filerHref} interactive={false} /></strong><small>{model.filerDisplayId ?? "—"}</small></div><div><span>{translateText(model.respondentRole)}</span><strong><MemberLink id={model.respondentId} name={model.respondentName} href={model.respondentHref} interactive={false} /></strong><small>{model.respondentDisplayId ?? "—"}</small></div></div>
      </Card>
    );
  }

  return (
    <Card as="section" className={`${adminRecordSection} dispute-overview grid !grid-cols-1 gap-[18px]`}>
      <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Dispute detail")}</h2><span className="badge">{translateText(model.category)}</span></CardHeader>
      <p className="m-0 whitespace-pre-wrap text-base text-admin-text">{model.detail}</p>
      <AdminOverviewMeta>
        <div><dt>{translateText("Quest")}</dt><dd><Link href={model.questHref ?? questRoutes.list()}>{model.questTitle}</Link></dd></div>
          <div><dt>{translateText("Quest State")}</dt><dd>{translateText(questStateLabel(model.questState))}</dd></div>
        <div><dt>{translateText("Opened")}</dt><dd>{model.submittedAt}</dd></div>
      </AdminOverviewMeta>
    </Card>
  );
}

function PartyStatements({ model, translateText, compact = false }: { model: DisputeCaseModel; translateText: (value: string) => string; compact?: boolean }) {
  const content = (
    <>
      <div className="dispute-statements mt-[18px] grid gap-[14px]"><div className={adminRecordGroup}><span>{translateText(model.filerRole === "Worker" ? "Worker statement" : "Hirer statement")}</span><p>{model.filerStatement}</p></div><div className={adminRecordGroup}><span>{translateText(model.respondentRole === "Hirer" ? "Hirer statement" : "Worker statement")}</span><p>{model.respondentStatement}</p></div></div>
    </>
  );
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}>{compact ? <h3 className={adminRecordHeading}>{translateText("Statements")}</h3> : <h2 className={adminRecordHeading}>{translateText("Statements")}</h2>}</CardHeader>{content}</Card>;
}

function evidenceStatusLabel(value: string): string {
  return value.trim()
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function evidenceFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(size)} ${units[unitIndex]}`;
}

function EvidenceSection({ evidence, loading, error, translateText, compact = false }: {
  evidence: AdminDisputeEvidence | undefined;
  loading: boolean;
  error: string | null;
  translateText: (value: string) => string;
  compact?: boolean;
}) {
  const fileCount = evidence?.proofSubmissions.reduce((count, submission) => count + submission.files.length, 0) ?? 0;
  return (
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}>
        {compact ? <h3 className={adminRecordHeading}>{translateText("Evidence")}</h3> : <h2 className={adminRecordHeading}>{translateText("Evidence")}</h2>}
        <span className={adminRecordCount}>{loading ? "…" : error ? "—" : fileCount}</span>
      </CardHeader>
      {loading && <output className="audit-note">{translateText("Loading Dispute Case Evidence…")}</output>}
      {error && <p className="field-error" role="alert">{translateText(error)}</p>}
      {!loading && !error && evidence && <div className="grid gap-4">
        {evidence.truncated && <p className="audit-note">{translateText("The Admin API returned a partial Evidence record.")}</p>}
        {evidence.proofSubmissions.length ? <section className="grid gap-2" aria-labelledby="dispute-evidence-proofs-heading">
          <h3 id="dispute-evidence-proofs-heading" className="m-0 text-sm font-semibold">{translateText("Proof Submissions")} ({evidence.proofSubmissions.length})</h3>
          <ol className="m-0 grid list-none gap-2 p-0">{evidence.proofSubmissions.map((submission, index) => <li key={submission.id} className="grid gap-2 rounded-admin-sm bg-admin-soft p-3">
            <strong>{translateText("Proof Submission")} {index + 1}</strong>
            <div className={adminRecordFacts}>
              <div className={adminRecordFact}><span>{translateText("Submission status")}</span><strong>{translateText(evidenceStatusLabel(submission.submissionStatus))}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Submitted at")}</span><strong>{submission.submittedAt ? formatAdminTimestamp(submission.submittedAt) : translateText("Not provided.")}</strong></div>
              <div className={adminRecordFact}><span>{translateText("Files")}</span><strong>{submission.files.length}</strong></div>
            </div>
            {submission.files.length ? <ul className="m-0 grid list-none gap-1 border-t border-admin-border pt-2 pl-0">{submission.files.map((file, fileIndex) => <li key={file.fileId} className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
              <span>{translateText("File")} {fileIndex + 1} · {file.contentType}</span>
              <span className="text-admin-muted">{evidenceFileSize(file.sizeBytes)}</span>
            </li>)}</ul> : <p className="m-0 text-sm text-admin-muted">{translateText("No files were returned for this Proof Submission.")}</p>}
          </li>)}</ol>
        </section> : <p className="audit-note">{translateText("No evidence was given.")}</p>}
      </div>}
    </Card>
  );
}

function Timeline({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  const events = model.status === "DISPUTE_CASE_PENDING"
    ? [
      { title: "Dispute Case opened", time: model.submittedAt, detail: `${model.filerName} filed the Dispute Case.` },
      { title: "Awaiting Admin decision", time: translateText("Open"), detail: translateText("The Quest remains Failed while the settlement is held.") },
    ]
    : [
      { title: "Dispute Case opened", time: model.submittedAt, detail: `${model.filerName} filed the Dispute Case.` },
      { title: "Dispute Case decision recorded", time: model.resolutionAt ?? model.closedAt ?? translateText("Time not provided"), detail: model.decisionReasonCode ? activityLogValueLabel(model.decisionReasonCode) : model.decisionLabel ?? translateText("Record retained for audit.") },
    ];
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Dispute timeline")}</h2></CardHeader><ol className="timeline">{events.map((event) => <li key={`${event.title}-${event.time}`}><strong>{translateText(event.title)}</strong><time>{event.time}</time><span>{translateText(event.detail)}</span></li>)}</ol></Card>;
}

function DecisionDetails({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  if (!model.decisionReasonCode && !model.decisionReasonText && !model.resolution && !model.resolvedBy && !model.decisionReasonCodeWasReturned && !model.decisionReasonTextWasReturned) return null;
  const resolvedBy = displayAdminId(model.resolvedBy);
  const reasonCodeLabel = model.decisionReasonCode
    ? translateText(activityLogValueLabel(model.decisionReasonCode))
    : translateText(model.decisionReasonCodeWasReturned
      ? "No Admin decision reason code was recorded."
      : "Decision reason code was not returned by the Admin API.");
  const noteLabel = model.decisionReasonText ?? translateText(model.decisionReasonTextWasReturned
    ? "No Admin decision note was recorded."
    : "Admin decision note was not returned by the Admin API.");
  return <div className={adminRecordGroup}><span>{translateText("Decision reason code")}</span><p>{reasonCodeLabel}</p><span>{translateText("Admin decision note")}</span><p>{noteLabel}</p><AdminOverviewMeta className="dispute-resolution-meta !grid-cols-2 mt-[14px] max-[700px]:!grid-cols-1"><div><dt>{translateText("Outcome")}</dt><dd>{translateText(model.decisionLabel ?? model.statusLabel)}</dd></div>{model.resolvedAmountLabel && <div><dt>{translateText("Transferred")}</dt><dd>{model.resolvedAmountLabel}</dd></div>}{resolvedBy && <div><dt>{translateText("Resolved by")}</dt><dd>{resolvedBy}</dd></div>}</AdminOverviewMeta></div>;
}

function MemberSummary({ heading, id, displayId, name, href, translateText }: { heading: string; id: string | null; displayId: string | null; name: string; href: string | null; translateText: (value: string) => string }) {
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText(heading)}</h2></CardHeader><div className={adminRecordSideFacts}><div><span>{translateText("Name")}</span><strong><MemberLink id={id} name={name} href={href} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{displayId ?? "—"}</strong></div></div>{href && <Button asChild variant="outline" className="mt-3 w-full"><Link href={href}>{translateText("See Member profile")}</Link></Button>}</Card>;
}

function failedAtLabel(model: DisputeCaseModel, translateText: (value: string) => string): string {
  if (model.questFailedAt) return formatAdminTimestamp(model.questFailedAt);
  return translateText(model.questFailedAtWasReturned
    ? "No failure time recorded."
    : "Failure time was not returned by the Admin API.");
}

function RelatedQuestPanel({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className={`${adminRecordSection} related-quest-panel`}>
      <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("Related Quest")}</h3><span className={`badge ${questStatusClass(model.questState)}`}>{translateText(questStateLabel(model.questState))}</span></CardHeader>
      <div className={adminRecordSideFacts}>
        <div><span>{translateText("Quest")}</span><strong>{model.questTitle}</strong></div>
        <div><span>{translateText("Quest ID")}</span><strong>{model.questDisplayId ?? "—"}</strong></div>
        <div><span>{translateText("Quest State")}</span><strong>{translateText(questStateLabel(model.questState))}</strong></div>
        <div><span>{translateText("Failed at")}</span><strong>{failedAtLabel(model, translateText)}</strong></div>
      </div>
      <Button asChild variant="outline" className="mt-3 w-full"><Link href={model.questHref ?? questRoutes.list()}>{translateText("Open Quest detail")}</Link></Button>
    </Card>
  );
}

function DecisionControls({ model, translateText, selectedChoice, commandError, onSelect, onStart }: { model: DisputeCaseModel; translateText: (value: string) => string; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelect: (choice: DisputeCaseDecisionChoice) => void; onStart: () => void }) {
  if (!model.isActionable) return <><p className="audit-note">{translateText("Decision recorded:")} <strong>{translateText(model.decisionLabel ?? model.statusLabel)}</strong>.</p><DecisionDetails model={model} translateText={translateText} /></>;
  const workerAvailable = Boolean(model.workerId);
  return <>
    <p className="audit-note">{translateText("The Quest remains Failed. Choose who receives the full held amount, then provide a reason.")}</p>
    <fieldset className="report-decision-options dispute-decision-options mt-3.5 grid gap-2 border-0 p-0">
      <legend className="visually-hidden">{translateText("Dispute Case decision")}</legend>
      <div className={`report-decision-option grid w-full grid-cols-[18px_1fr] items-start gap-x-2 gap-y-0.5 rounded-[9px] border border-admin-border bg-admin-surface px-3 py-[11px] text-left transition-colors hover:bg-admin-hover ${selectedChoice === "dismiss" ? "border-admin-accent bg-admin-accent-soft shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
        <input className="mt-0.5" id={`dispute-decision-${model.id}-dismiss`} type="radio" name={`dispute-decision-${model.id}`} value="dismiss" data-dispute-decision="dismiss" checked={selectedChoice === "dismiss"} onChange={() => onSelect("dismiss")} />
        <label className="grid cursor-pointer gap-0.5" htmlFor={`dispute-decision-${model.id}-dismiss`}><strong className="text-sm leading-[1.35]">{translateText("Dismissed")}</strong><small className="text-[13px] leading-[1.45] text-admin-muted">{translateText("Keep the full held amount with the Hirer. No money movement.")}</small></label>
      </div>
      <div className={`report-decision-option grid w-full grid-cols-[18px_1fr] items-start gap-x-2 gap-y-0.5 rounded-[9px] border border-admin-border bg-admin-surface px-3 py-[11px] text-left transition-colors hover:bg-admin-hover ${selectedChoice === "resolve" ? "border-admin-accent bg-admin-accent-soft shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
        <input className="mt-0.5" id={`dispute-decision-${model.id}-resolve`} type="radio" name={`dispute-decision-${model.id}`} value="resolve" data-dispute-decision="resolve" checked={selectedChoice === "resolve"} onChange={() => onSelect("resolve")} disabled={!workerAvailable} />
        <label className="grid cursor-pointer gap-0.5" htmlFor={`dispute-decision-${model.id}-resolve`}><strong className="text-sm leading-[1.35]">{translateText("Resolved")}</strong><small className="text-[13px] leading-[1.45] text-admin-muted">{workerAvailable ? translateText("Transfer the full remaining Dispute Case amount to the Worker.") : translateText("Worker information is not available.")}</small></label>
      </div>
    </fieldset>
    {commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}
    <Button variant="danger" className="w-full" type="button" data-dispute-resolve="Resolve Dispute Case" onClick={onStart} disabled={model.version === undefined}>{translateText("Record Dispute Case decision")}</Button>
    {model.version === undefined && <p className="field-error" role="alert">{translateText("The current Dispute Case version was not provided.")}</p>}
  </>;
}

function FullSections({ model, evidence, evidenceLoading, evidenceError, translateText, selectedChoice, commandError, onSelectChoice, onStartDecision }: { model: DisputeCaseModel; evidence: AdminDisputeEvidence | undefined; evidenceLoading: boolean; evidenceError: string | null; translateText: (value: string) => string; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelectChoice: (choice: DisputeCaseDecisionChoice) => void; onStartDecision: () => void }) {
  return <>
    <AdminRecordGrid
      primary={<><Overview model={model} translateText={translateText} /><PartyStatements model={model} translateText={translateText} /><EvidenceSection evidence={evidence} loading={evidenceLoading} error={evidenceError} translateText={translateText} /><Timeline model={model} translateText={translateText} /></>}
      side={<><MemberSummary heading={model.filerRole} id={model.filerId} displayId={model.filerDisplayId} name={model.filerName} href={model.filerHref} translateText={translateText} /><MemberSummary heading={model.respondentRole} id={model.respondentId} displayId={model.respondentDisplayId} name={model.respondentName} href={model.respondentHref} translateText={translateText} /><Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Related Quest")}</h2></CardHeader><div className={adminRecordSideFacts}><div><span>{translateText("Quest")}</span><strong>{model.questTitle}</strong></div><div><span>{translateText("Quest State")}</span><strong>{translateText(questStateLabel(model.questState))}</strong></div><div><span>{translateText("Failed at")}</span><strong>{failedAtLabel(model, translateText)}</strong></div></div><Button asChild variant="outline" className="mt-3 w-full"><a href={model.questHref ?? questRoutes.list()}>{translateText("Open Quest detail")}</a></Button></Card><Card as="section" className={`${adminRecordSection} dispute-decision-panel`}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{model.isActionable ? translateText("Dispute decision") : translateText("Recorded outcome")}</h2></CardHeader><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></Card></>}
    />
  </>;
}

function DrawerSections({ model, evidence, evidenceLoading, evidenceError, translateText, selectedChoice, commandError, onSelectChoice, onStartDecision }: { model: DisputeCaseModel; evidence: AdminDisputeEvidence | undefined; evidenceLoading: boolean; evidenceError: string | null; translateText: (value: string) => string; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelectChoice: (choice: DisputeCaseDecisionChoice) => void; onStartDecision: () => void }) {
  return <div className="dispute-case-drawer-detail admin-drawer-content-flow grid min-w-0 content-start gap-[18px]"><DisputeAlert model={model} translateText={translateText} /><ModerationCaseWorkspace
    kind="Dispute Case"
    caseId={model.displayId}
    statusLabel={model.statusLabel}
    badgeClass={model.badgeClass}
    submittedAt={model.submittedAt}
    source="Quest settlement"
    detail={model.detail}
    reportedMember={{ id: model.workerId, displayId: model.workerDisplayId, name: model.workerName, href: model.workerHref, role: "Worker" }}
    reporter={{ id: model.filerId, displayId: model.filerDisplayId, name: model.filerName, href: model.filerHref, role: model.filerRole }}
    relatedRecord={{ id: model.questId, displayId: model.questDisplayId, title: model.questTitle, href: model.questHref, state: model.questState }}
    evidenceCount={evidence?.proofSubmissions.length ?? 0}
    financialSummary={[{ label: "Amount at risk", value: model.amountAtRiskLabel }]}
    moderationHistory={model.moderationHistory}
    policyNote="Dispute Cases apply only to Failed Quests. The Funding Reservation remains in place; money can move only Hirer to Worker."
    translateText={translateText}
    showCaseMetadata={false}
    showModerationHistory={false}
    showRelatedRecord={false}
    showDecisionContext={false}
    compact
  >
    <Overview model={model} translateText={translateText} compact />
    <EvidenceSection evidence={evidence} loading={evidenceLoading} error={evidenceError} translateText={translateText} compact />
    <RelatedQuestPanel model={model} translateText={translateText} />
    <PartyStatements model={model} translateText={translateText} compact />
    <ModerationHistoryPanel
      summary={model.moderationHistory}
      translateText={translateText}
      compact
      member={{ id: model.respondentId, displayId: model.respondentDisplayId, name: model.respondentName, href: model.respondentHref }}
      memberLabel={model.respondentRole}
    />
    <Card as="section" className={`${adminRecordSection} dispute-decision-panel`}><CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{model.isActionable ? translateText("Dispute decision") : translateText("Resolution")}</h3></CardHeader><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></Card>
  </ModerationCaseWorkspace><div className="admin-drawer-actions sticky bottom-[-28px] z-[4] m-[18px_-24px_-28px] flex flex-wrap gap-2 border-t border-admin-border bg-admin-surface/95 px-6 py-3.5 shadow-[0_-6px_18px_rgba(0,0,0,0.09)] [&>*]:min-h-11 [&>*]:flex-[1_1_180px] [&>*]:text-center max-[720px]:bottom-[-24px] max-[720px]:m-[18px_-16px_-24px] max-[720px]:px-4 max-[720px]:[&>*]:basis-full">{model.questHref && <Button asChild size="lg" variant="outline"><Link href={model.questHref}>{translateText("Quest detail")}</Link></Button>}<Button asChild size="lg" variant="primary"><a href={disputeRoutes.detail(model.id)}>{translateText("Open full Dispute Case")}</a></Button></div></div>;
}

export function DisputeCaseDetail({ disputeId, initialModel = null, drawer = false, onUpdated }: DisputeCaseDetailProps) {
  const { translateText } = useAdminShell();
  const setBoardActiveTab = useDisputeBoardStore((state) => state.setActiveTab);
  const { data: disputeModel, isPending, error } = useDisputeDetailQuery(disputeId, initialModel);
  const [selectedChoice, setSelectedChoice] = useState<DisputeCaseDecisionChoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const decisionMutation = useDisputeDecisionMutation();

  const model = disputeModel;
  const evidenceQuery = useDisputeEvidenceQuery(model?.id ?? disputeId);
  if (isPending && !model) return <AdminLoading message={translateText("Loading Dispute Case…")} />;
  if (!model) return <main className={drawer ? "drawer-body" : "admin-feedback"}><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Dispute Case not found")}</h1></CardHeader><CardContent className="space-y-4"><p>{translateText(error instanceof Error ? error.message : "The requested Dispute Case was not found.")}</p>{!drawer && <Button asChild variant="primary"><Link href={disputeRoutes.list()}>{translateText("Return to Dispute Cases")}</Link></Button>}</CardContent></Card></main>;

  const startDecision = () => {
    if (!model.isActionable) return;
    if (!selectedChoice) {
      setCommandError("Choose Dismissed or Resolved before recording the decision.");
      return;
    }
    setCommandError(null);
    setDialogOpen(true);
  };

  const confirmDecision = async ({
    reasonCode,
    decisionReasonText,
  }: { reasonCode: AdminDisputeReasonCode; decisionReasonText?: string }) => {
    if (!selectedChoice) return;
    if (model.version === undefined) {
      setCommandError("The current Dispute Case version was not provided.");
      return;
    }
    const command = disputeCaseDecisionFor(selectedChoice);
    const amountSatang = command === "DISPUTE_CASE_RESOLVED" ? model.sharedCapSatang : null;
    if (command === "DISPUTE_CASE_RESOLVED" && (!model.workerId || amountSatang === null || amountSatang <= 0)) {
      setCommandError("Resolved requires a Worker and a full available Dispute Case amount.");
      return;
    }
    setCommandError(null);
    const options: DisputeResolution = {
      outcome: command,
      reasonCode,
      ...(decisionReasonText ? { decisionReasonText } : {}),
      expectedVersion: model.version,
      idempotencyKey: newDisputeCaseIdempotencyKey(model.id),
      ...(command === "DISPUTE_CASE_RESOLVED" && model.workerId && amountSatang !== null
        ? { workerId: model.workerId, amountSatang }
        : {}),
    };
    try {
      const updatedModel = await decisionMutation.mutateAsync({
        model,
        command,
        options,
      });
      if (updatedModel.status === "DISPUTE_CASE_RESOLVED") {
        setBoardActiveTab("resolved");
      } else if (updatedModel.status === "DISPUTE_CASE_DISMISSED") {
        setBoardActiveTab("dismissed");
      }
      window.dispatchEvent(new CustomEvent(DISPUTE_CASE_UPDATED_EVENT, { detail: updatedModel }));
      onUpdated?.(updatedModel);
      setDialogOpen(false);
      setSelectedChoice(null);
    } catch (caughtError: unknown) {
      setCommandError(caughtError instanceof Error ? caughtError.message : "The Dispute Case decision could not be saved.");
    }
  };

  const evidenceError = evidenceQuery.error instanceof Error
    ? evidenceQuery.error.message
    : evidenceQuery.error
      ? "Dispute Case Evidence could not load."
      : null;
  const evidenceSummary = evidenceQuery.isPending
    ? translateText("Loading")
    : evidenceError
      ? translateText("Unavailable")
      : evidenceQuery.data
        ? evidenceQuery.data.proofSubmissions.length
          ? `${evidenceQuery.data.proofSubmissions.length} ${translateText("Proof Submissions")}`
          : translateText("None")
        : translateText("None");
  const overlays = <DisputeDecisionDialog model={model} open={dialogOpen} choice={selectedChoice} busy={decisionMutation.isPending} error={commandError} translateText={translateText} onCancel={() => { if (!decisionMutation.isPending) { setDialogOpen(false); setCommandError(null); } }} onConfirm={confirmDecision} />;
  const content = <><DisputeAlert model={model} translateText={translateText} /><RecordStatusBar items={[{ id: "status", label: translateText("Status"), value: <span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span> }, { id: "category", label: translateText("Category"), value: translateText(model.category) }, { id: "opened", label: translateText("Opened"), value: model.submittedAt }, { id: "amount-at-risk", label: translateText("Amount at risk"), value: model.amountAtRiskLabel }, { id: "evidence", label: translateText("Evidence"), value: evidenceSummary }]} /><FullSections model={model} evidence={evidenceQuery.data} evidenceLoading={evidenceQuery.isPending} evidenceError={evidenceError} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} /></>;

  if (drawer) return <><DrawerSections model={model} evidence={evidenceQuery.data} evidenceLoading={evidenceQuery.isPending} evidenceError={evidenceError} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} />{overlays}</>;
  return <main className="admin-route-page dispute-case-detail" tabIndex={-1}><AdminRecordHeader breadcrumbHref={disputeRoutes.list()} breadcrumbLabel={translateText("Dispute Cases")} recordId={model.displayId} title={model.title} subtitle={`${translateText(model.category)} · ${translateText("opened")} ${model.submittedAt}`} actions={<Button asChild size="lg" variant="outline"><Link href={disputeRoutes.list()}>{translateText("Back to Dispute Cases")}</Link></Button>} />{content}{overlays}</main>;
}

export function DisputeCaseDrawer({ disputeId, initialModel, onClose, onUpdated }: { disputeId: string; initialModel?: DisputeCaseModel | null; onClose: () => void; onUpdated?: (model: DisputeCaseModel) => void }) {
  const { translateText } = useAdminShell();
  return <AdminDrawer
    ariaLabel={translateText("Close drawer")}
    title={<><span aria-hidden="true">{initialModel?.title ?? translateText("Dispute Case")}</span><span className="visually-hidden">{translateText("Dispute Case details")}</span></>}
    titleId="dispute-case-drawer-title"
    subtitle={<>{initialModel?.displayId ? <>{translateText("Dispute Case")} {initialModel.displayId} · </> : null}{translateText("Dispute Case detail drawer")}</>}
    className="dispute-case-drawer quest-style-drawer"
    openerAttribute="data-dispute-id"
    openerValue={disputeId}
    escapeDisabled={false}
    onClose={onClose}
  >
    <DisputeCaseDetail disputeId={disputeId} initialModel={initialModel} drawer onUpdated={onUpdated} />
  </AdminDrawer>;
}

export function DisputeCaseDrawerRoute({ disputeId, initialModel }: { disputeId: string; initialModel?: DisputeCaseModel | null }) {
  const router = useRouter();
  return <DisputeCaseDrawer disputeId={disputeId} initialModel={initialModel} onClose={() => router.back()} onUpdated={() => router.refresh()} />;
}
