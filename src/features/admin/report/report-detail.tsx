"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { adminApi, type AdminEvidence, type ReportDecision } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { reportRoutes } from "../admin-routes";
import { isReportCaseStatus } from "../domain/rulebook";
import {
  findReportCaseFromMock,
  newReportCaseIdempotencyKey,
  saveMockReportDecision,
  type ReportCaseCommand,
} from "./report-adapter";
import {
  isReportCaseRecord,
  reportCaseDecisionFor,
  reportCaseModelFromRecord,
  type ReportCaseDecisionChoice,
  type ReportCaseModel,
  type ReportCaseRecord,
} from "./report-model";

type ReportCaseDetailProps = {
  reportId: string;
  initialRecord?: ReportCaseRecord | null;
  drawer?: boolean;
  onUpdated?: (record: ReportCaseRecord) => void;
};

type DecisionDialogProps = {
  open: boolean;
  choice: ReportCaseDecisionChoice | null;
  busy: boolean;
  error: string | null;
  modelId: string;
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
  modelId,
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
  const description = decisionDialogDescription(choice, modelId, translateText);

  return (
    <dialog open className="report-decision-dialog" aria-modal="true" aria-labelledby="report-decision-title">
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
  );
}

function evidenceContext(value: unknown, translateText: (value: string) => string): string {
  if (value === null || value === undefined || value === "") {
    return translateText("The Admin API did not return bounded Evidence Reference context.");
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
    <dialog open className="report-evidence-dialog" aria-modal="true" aria-labelledby="report-evidence-title">
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
  );
}

function MemberLink({
  id,
  name,
  href,
}: {
  id: string | null;
  name: string;
  href: string | null;
}) {
  return href && id ? <Link href={href}>{name}</Link> : <span>{name}</span>;
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

function ReportOverview({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  return (
    <section className="record-panel report-overview">
      <div className="record-panel-head"><h2>{translateText("Report detail")}</h2></div>
      <p className="record-description">{model.detail}</p>
      <dl className="overview-meta">
        <div><dt>{translateText("Report type")}</dt><dd>{model.reportType}</dd></div>
        <div><dt>{translateText("Submitted by")}</dt><dd><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></dd></div>
        <div><dt>{translateText("Reported Member")}</dt><dd><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></dd></div>
      </dl>
    </section>
  );
}

function PeopleInvolved({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  return (
    <section className="record-panel">
      <h2>{translateText("People involved")}</h2>
      <div className="party-grid report-parties">
        <div><span>{translateText("Reporting Member")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></strong>{model.reporterId && <small>{model.reporterId}</small>}</div>
        <div><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></strong>{model.reportedMemberId && <small>{model.reportedMemberId}</small>}</div>
      </div>
    </section>
  );
}

function EvidenceSection({
  model,
  translateText,
  onOpen,
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onOpen: (reference: string) => void;
}) {
  return (
    <section className="record-panel">
      <div className="record-panel-head"><h2>{translateText("Evidence")}</h2><span className="section-count">{model.evidence.length}</span></div>
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
    </section>
  );
}

function ReportTimeline({ model, translateText }: { model: ReportCaseModel; translateText: (value: string) => string }) {
  const events = model.status === "REPORT_CASE_PENDING"
    ? [
      { title: "Report submitted", time: model.submittedAt, detail: `${model.reporterName} reported ${model.reportedMemberName}` },
      { title: "Awaiting Admin decision", time: translateText("Open"), detail: translateText("Review the submitted details and Evidence References.") },
    ]
    : model.status === "REPORT_CASE_HIDDEN"
      ? [
        { title: "Report submitted", time: model.submittedAt, detail: `${model.reporterName} reported ${model.reportedMemberName}` },
        { title: "Message hidden", time: model.resolutionAt ?? model.closedAt ?? translateText("Time not provided"), detail: translateText("The Report Case remains open for re-evaluation.") },
      ]
      : [
        { title: "Report submitted", time: model.submittedAt, detail: `${model.reporterName} reported ${model.reportedMemberName}` },
        { title: "Report Case decision recorded", time: model.resolutionAt ?? model.closedAt ?? translateText("Time not provided"), detail: model.decisionReason ?? model.decisionLabel ?? translateText("Record retained for audit.") },
      ];

  return (
    <section className="record-panel">
      <h2>{translateText("Report timeline")}</h2>
      <ol className="timeline">
        {events.map((event) => <li key={`${event.title}-${event.time}`}><strong>{translateText(event.title)}</strong><time>{event.time}</time><span>{event.detail}</span></li>)}
      </ol>
    </section>
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
        <p className="audit-note">{translateText("Decision recorded:")} <strong>{model.decisionLabel ?? model.statusLabel}</strong>.</p>
        {model.decisionReason && <div className="overview-group"><span>{translateText("Reason for decision")}</span><p>{model.decisionReason}</p></div>}
      </>
    );
  }

  if (model.status === "REPORT_CASE_HIDDEN") {
    return (
      <>
        <p className="audit-note">{translateText("This Message is hidden. A reason is required before the Admin restores it.")}</p>
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
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onOpenEvidence: (reference: string) => void;
  selectedChoice: ReportCaseDecisionChoice | null;
  commandError: string | null;
  onSelectChoice: (choice: ReportCaseDecisionChoice) => void;
  onStartDecision: () => void;
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
    <div className="full-record-grid">
      <div className="record-primary">
        <ReportOverview model={model} translateText={translateText} />
        <PeopleInvolved model={model} translateText={translateText} />
        <EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} />
        <ReportTimeline model={model} translateText={translateText} />
      </div>
      <aside className="record-side">
        <section className="record-panel">
          <h2>{translateText("Reported Member")}</h2>
          <div className="side-facts"><div><span>{translateText("Name")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{model.reportedMemberId || "—"}</strong></div></div>
          {model.reportedMemberHref && <Link className="btn full-width" href={model.reportedMemberHref}>{translateText("See Member profile")}</Link>}
        </section>
        <section className="record-panel">
          <h2>{translateText("Submitted by")}</h2>
          <div className="side-facts"><div><span>{translateText("Name")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{model.reporterId || "—"}</strong></div></div>
          {model.reporterHref && <Link className="btn full-width" href={model.reporterHref}>{translateText("See Member profile")}</Link>}
        </section>
        <section className="record-panel report-decision-panel">
          <h2>{model.isActionable ? translateText("Report decision") : translateText("Recorded outcome")}</h2>
          {decisionPanel}
        </section>
      </aside>
    </div>
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
}: {
  model: ReportCaseModel;
  translateText: (value: string) => string;
  onOpenEvidence: (reference: string) => void;
  selectedChoice: ReportCaseDecisionChoice | null;
  commandError: string | null;
  onSelectChoice: (choice: ReportCaseDecisionChoice) => void;
  onStartDecision: () => void;
}) {
  return (
    <div className="drawer-body report-case-drawer-detail">
      <div className="drawer-title"><span className="att-icon warning" aria-hidden="true">⚑</span><div><h2>{model.title}</h2><p>{translateText("Submitted by")} {model.reporterName}</p></div></div>
      <ReportAlert model={model} translateText={translateText} />
      <section className="section"><h3>{translateText("Report overview")}</h3><div className="facts"><div className="fact"><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div className="fact"><span>{translateText("Report type")}</span><strong>{model.reportType}</strong></div><div className="fact"><span>{translateText("Reported")}</span><strong>{model.submittedAt}</strong></div></div></section>
      <section className="section"><h3>{translateText("Report detail")}</h3><p>{model.detail}</p></section>
      <section className="section"><h3>{translateText("People involved")}</h3><div className="facts"><div className="fact"><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></strong><small>{model.reportedMemberId}</small></div><div className="fact"><span>{translateText("Reported by")}</span><strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></strong><small>{model.reporterId ?? "—"}</small></div></div></section>
      <section className="section"><EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} /></section>
      <section className="section report-decision-panel"><h3>{model.isActionable ? translateText("Report decision") : translateText("Resolution")}</h3><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></section>
      <div className="drawer-actions">{model.reportedMemberHref && <Link className="btn" href={model.reportedMemberHref}>{translateText("Member profile")}</Link>}<Link className="btn primary" href={reportRoutes.detail(model.id)}>{translateText("Open full Report Case")}</Link></div>
    </div>
  );
}

export function ReportCaseDetail({
  reportId,
  initialRecord = null,
  drawer = false,
  onUpdated,
}: ReportCaseDetailProps) {
  const { translateText } = useAdminShell();
  const [record, setRecord] = useState<ReportCaseRecord | null>(initialRecord);
  const [loading, setLoading] = useState(!initialRecord);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<ReportCaseDecisionChoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [evidenceState, setEvidenceState] = useState<EvidenceState | null>(null);

  useEffect(() => {
    if (initialRecord && !drawer) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const request = isAdminApiEnabled()
      ? adminApi.getReport(reportId)
      : Promise.resolve(findReportCaseFromMock(localStorage, reportId));

    void request.then((nextRecord) => {
      if (cancelled) return undefined;
      if (!nextRecord || !isReportCaseRecord(nextRecord) || nextRecord.id !== reportId) {
        setRecord(null);
        setLoadError("The Report Case was not found.");
      } else {
        setRecord(nextRecord);
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
  }, [drawer, initialRecord, reportId]);

  const model = reportCaseModelFromRecord(record);

  if (loading && !model) return <AdminLoading message={translateText("Loading Report Case…")} />;
  if (!model) {
    return (
      <main className={drawer ? "drawer-body" : "admin-feedback"}>
        <section className="panel"><h1>{translateText("Report Case not found")}</h1><p>{translateText(loadError ?? "The requested Report Case was not found.")}</p>{!drawer && <Link className="btn primary" href={reportRoutes.list()}>{translateText("Return to Report Cases")}</Link>}</section>
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
        : saveMockReportDecision(localStorage, model.id, decision as ReportCaseCommand, reason);
      if (!updated || !isReportCaseRecord(updated) || !isReportCaseStatus(updated.status)) {
        throw new Error("The Admin API returned an invalid Report Case.");
      }
      setRecord(updated);
      onUpdated?.(updated);
      setDialogOpen(false);
      setSelectedChoice(null);
    } catch (error: unknown) {
      setCommandError(error instanceof Error ? error.message : "The Report Case decision could not be saved.");
    } finally {
      setCommandBusy(false);
    }
  };

  const overlays = (
    <>
      <ReportDecisionDialog modelId={model.id} open={dialogOpen} choice={selectedChoice} busy={commandBusy} error={commandError} translateText={translateText} onCancel={() => { if (!commandBusy) { setDialogOpen(false); setCommandError(null); } }} onConfirm={confirmDecision} />
      {evidenceState && <EvidencePreview state={evidenceState} translateText={translateText} onClose={() => setEvidenceState(null)} />}
    </>
  );

  const content = (
    <>
      <ReportAlert model={model} translateText={translateText} />
      <div className="record-status-bar"><div><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div><span>{translateText("Report type")}</span><strong>{model.reportType}</strong></div><div><span>{translateText("Submitted")}</span><strong>{model.submittedAt}</strong></div><div><span>{translateText("Reported Member")}</span><strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></strong></div><div><span>{translateText("Evidence")}</span><strong>{model.evidence.length || translateText("None")}</strong></div></div>
      <ReportCaseSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} />
    </>
  );

  if (drawer) {
    return <><DrawerSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} />{overlays}</>;
  }

  return (
    <main className="admin-route-page report-case-detail" tabIndex={-1}>
      <div className="record-breadcrumb"><Link href={reportRoutes.list()}>{translateText("Report Cases")}</Link><span>›</span><span>{model.id}</span></div>
      <div className="full-record-head"><div><div className="record-id">{model.id}</div><h1>{model.title}</h1><p>{model.reportType} · {translateText("submitted")} {model.submittedAt}</p></div><div className="full-record-actions"><Link className="btn" href={reportRoutes.list()}>{translateText("Back to Report Cases")}</Link>{model.isActionable && model.status === "REPORT_CASE_PENDING" && <button className="btn danger" type="button" data-report-close="Close report" onClick={startDecision}>{translateText("Close report")}</button>}{model.isActionable && model.status === "REPORT_CASE_HIDDEN" && <button className="btn primary" type="button" data-report-decision="restore" onClick={() => { setSelectedChoice("restore"); setCommandError(null); setDialogOpen(true); }}>{translateText("Restore Message")}</button>}</div></div>
      {content}
      {overlays}
    </main>
  );
}

export function ReportCaseDrawer({
  reportId,
  initialRecord,
  onClose,
  onUpdated,
}: {
  reportId: string;
  initialRecord: ReportCaseRecord;
  onClose: () => void;
  onUpdated: (record: ReportCaseRecord) => void;
}) {
  const { translateText } = useAdminShell();
  return (
    <>
      <button className="scrim" type="button" aria-label={translateText("Close Report Case drawer")} onClick={onClose} />
      <dialog open className="drawer open" aria-modal="true" aria-label={translateText("Report Case details")}>
        <div className="drawer-top"><div><strong>{reportId}</strong><small>{translateText("Report Case")}</small></div><button className="icon" type="button" aria-label={translateText("Close drawer")} onClick={onClose}><span className="close-lines" /></button></div>
        <ReportCaseDetail reportId={reportId} initialRecord={initialRecord} drawer onUpdated={onUpdated} />
      </dialog>
    </>
  );
}
