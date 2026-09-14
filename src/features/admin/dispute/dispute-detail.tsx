"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { adminApi, type AdminDisputeReasonCode, type DisputeResolution } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { disputeRoutes, questRoutes } from "../admin-routes";
import {
  findDisputeCaseFromMock,
  newDisputeCaseIdempotencyKey,
  saveMockDisputeDecision,
} from "./dispute-adapter";
import {
  disputeCaseDecisionFor,
  disputeCaseModelFromRecord,
  DISPUTE_CASE_UPDATED_EVENT,
  type DisputeCaseDecisionChoice,
  type DisputeCaseModel,
} from "./dispute-model";

type DisputeCaseDetailProps = {
  disputeId: string;
  initialModel?: DisputeCaseModel | null;
  drawer?: boolean;
  onUpdated?: (model: DisputeCaseModel) => void;
};

type EvidenceState = {
  reference: string;
  value: unknown;
  error: string | null;
  loading: boolean;
};

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

function DisputeAlert({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  return (
    <div className={`dispute-page-alert ${model.isActionable ? "active" : "closed"}`}>
      <span aria-hidden="true">⚑</span>
      <div>
        <strong>{model.isActionable ? translateText("Active Dispute Case — review is required") : translateText("Closed Dispute Case — record retained")}</strong>
        <p>{model.isActionable
          ? translateText("The Quest is in QUEST_FAILED. Decide whether to dismiss the case or redirect the settlement to the Worker.")
          : translateText("This Dispute Case is closed and retained as a read-only audit record. The Quest State remains failed.")}</p>
      </div>
      <span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span>
    </div>
  );
}

function Overview({ model, translateText, compact = false }: { model: DisputeCaseModel; translateText: (value: string) => string; compact?: boolean }) {
  if (compact) {
    return (
      <>
        <section className="section"><h3>{translateText("Dispute overview")}</h3><div className="facts"><div className="fact"><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div className="fact"><span>{translateText("Category")}</span><strong>{model.category}</strong></div><div className="fact"><span>{translateText("Amount at risk")}</span><strong>{model.amountAtRiskLabel}</strong></div></div></section>
        <section className="section"><h3>{translateText("Dispute detail")}</h3><p>{model.detail}</p></section>
      </>
    );
  }

  return (
    <section className="record-panel dispute-overview">
      <div className="record-panel-head"><h2>{translateText("Dispute detail")}</h2><span className="badge">{model.category}</span></div>
      <p className="record-description dispute-description">{model.detail}</p>
      <dl className="overview-meta">
        <div><dt>{translateText("Quest")}</dt><dd><Link href={model.questHref ?? questRoutes.list()}>{model.questTitle}</Link></dd></div>
        <div><dt>{translateText("Quest State")}</dt><dd>{model.questState}</dd></div>
        <div><dt>{translateText("Opened")}</dt><dd>{model.submittedAt}</dd></div>
      </dl>
    </section>
  );
}

function PartyStatements({ model, translateText, compact = false }: { model: DisputeCaseModel; translateText: (value: string) => string; compact?: boolean }) {
  const content = (
    <>
      <div className="party-grid">
        <div><span>{translateText(model.filerRole)}</span><strong><MemberLink id={model.filerId} name={model.filerName} href={model.filerHref} /></strong>{model.filerId && <small>{model.filerId}</small>}</div>
        <div><span>{translateText(model.respondentRole)}</span><strong><MemberLink id={model.respondentId} name={model.respondentName} href={model.respondentHref} /></strong>{model.respondentId && <small>{model.respondentId}</small>}</div>
      </div>
      <div className="dispute-statements"><div className="overview-group"><span>{translateText("Filer statement")}</span><p>{model.filerStatement}</p></div><div className="overview-group"><span>{translateText("Respondent statement")}</span><p>{model.respondentStatement}</p></div></div>
    </>
  );
  return compact ? <section className="section"><h3>{translateText("Parties and statements")}</h3>{content}</section> : <section className="record-panel"><h2>{translateText("Parties and statements")}</h2>{content}</section>;
}

function EvidenceSection({ model, translateText, onOpen, compact = false }: { model: DisputeCaseModel; translateText: (value: string) => string; onOpen: (reference: string) => void; compact?: boolean }) {
  return (
    <section className={compact ? "section" : "record-panel"}>
      <div className="record-panel-head">{compact ? <h3>{translateText("Evidence")}</h3> : <h2>{translateText("Evidence")}</h2>}<span className="section-count">{model.evidence.length}</span></div>
      {model.evidence.length === 0 && <p className="audit-note">{translateText("No Evidence Reference was provided.")}</p>}
      {model.evidence.length > 0 && <div className="evidence-stack">{model.evidence.map((evidence) => evidence.reference
        ? <button key={evidence.reference} className="evidence-item" type="button" onClick={() => onOpen(evidence.reference as string)}><span className="evidence-state">✓</span><span><strong>{evidence.label}</strong><small>{translateText("Bounded Evidence Reference")}</small></span><span>{translateText("Open")}</span></button>
        : <div key={evidence.label} className="evidence-item evidence-unavailable"><span className="evidence-state pending">!</span><span><strong>{evidence.label}</strong><small>{translateText("Evidence Reference not available")}</small></span><span>{translateText("Unavailable")}</span></div>)}
      </div>}
    </section>
  );
}

function Timeline({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  const events = model.status === "DISPUTE_CASE_PENDING"
    ? [
      { title: "Dispute Case opened", time: model.submittedAt, detail: `${model.filerName} filed the Dispute Case.` },
      { title: "Awaiting Admin decision", time: translateText("Open"), detail: translateText("The Quest remains in QUEST_FAILED while the settlement is held.") },
    ]
    : [
      { title: "Dispute Case opened", time: model.submittedAt, detail: `${model.filerName} filed the Dispute Case.` },
      { title: "Dispute Case decision recorded", time: model.resolutionAt ?? model.closedAt ?? translateText("Time not provided"), detail: model.decisionReason ?? model.decisionLabel ?? translateText("Record retained for audit.") },
    ];
  return <section className="record-panel"><h2>{translateText("Dispute timeline")}</h2><ol className="timeline">{events.map((event) => <li key={`${event.title}-${event.time}`}><strong>{translateText(event.title)}</strong><time>{event.time}</time><span>{event.detail}</span></li>)}</ol></section>;
}

function DecisionDetails({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  if (!model.decisionReason && !model.resolution && !model.resolvedBy) return null;
  return <div className="overview-group"><span>{translateText("Reason for decision")}</span><p>{model.decisionReason ?? translateText("Reason not provided by the Admin API.")}</p><dl className="overview-meta dispute-resolution-meta"><div><dt>{translateText("Outcome")}</dt><dd>{model.decisionLabel ?? model.statusLabel}</dd></div>{model.resolvedAmountLabel && <div><dt>{translateText("Allocated")}</dt><dd>{model.resolvedAmountLabel}</dd></div>}{model.resolvedBy && <div><dt>{translateText("Resolved by")}</dt><dd>{model.resolvedBy}</dd></div>}</dl></div>;
}

function MemberSummary({ heading, id, name, href, translateText }: { heading: string; id: string | null; name: string; href: string | null; translateText: (value: string) => string }) {
  return <section className="record-panel"><h2>{translateText(heading)}</h2><div className="side-facts"><div><span>{translateText("Name")}</span><strong><MemberLink id={id} name={name} href={href} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{id ?? "—"}</strong></div></div>{href && <Link className="btn full-width" href={href}>{translateText("See Member profile")}</Link>}</section>;
}

function DecisionDialog({
  open,
  choice,
  busy,
  error,
  modelId,
  translateText,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  choice: DisputeCaseDecisionChoice | null;
  busy: boolean;
  error: string | null;
  modelId: string;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string, reasonCode: AdminDisputeReasonCode, amountSatang: number | null) => void;
}) {
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState<AdminDisputeReasonCode | "">("");
  const [amountSatang, setAmountSatang] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setReasonCode("");
      setAmountSatang("");
    }
  }, [choice, open]);

  if (!open) return null;
  const title = choice === "resolve" ? translateText("Confirm Worker allocation") : translateText("Dismiss Dispute Case");
  const description = choice === "resolve"
    ? `${translateText("This will record a positive Satang allocation to the Worker Earnings Balance for")} ${modelId}.`
    : `${translateText("This will dismiss the Dispute Case without money movement for")} ${modelId}.`;
  return (
    <dialog open className="dispute-decision-dialog" aria-modal="true" aria-labelledby="dispute-decision-title">
      <form method="dialog" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); const numericAmount = amountSatang === "" ? null : Number(amountSatang); if (value.length < 8 || !reasonCode || choice === "resolve" && (numericAmount === null || !Number.isInteger(numericAmount) || numericAmount <= 0)) return; onConfirm(value, reasonCode, numericAmount); }}>
        <div className="dialog-body"><div className="warning-icon" aria-hidden="true">!</div><h2 id="dispute-decision-title">{title}</h2><p>{description}</p>
          <label htmlFor="dispute-reason-code">{translateText("Reason code")}</label>
          <select id="dispute-reason-code" name="reasonCode" value={reasonCode} onChange={(event) => setReasonCode(event.target.value as AdminDisputeReasonCode | "")} required><option value="">{translateText("Select a reason code")}</option><option value="DISPUTE_EVIDENCE_REVIEW">{translateText("Evidence review")}</option><option value="DISPUTE_POLICY_REVIEW">{translateText("Policy review")}</option></select>
          {choice === "resolve" && <><label htmlFor="dispute-amount-satang">{translateText("Worker allocation in Satang")}</label><input id="dispute-amount-satang" name="amountSatang" type="number" min="1" step="1" inputMode="numeric" required value={amountSatang} onChange={(event) => setAmountSatang(event.target.value)} /><p className="field-help">{translateText("Enter the positive amount to allocate. Amount at risk is a historical snapshot.")}</p></>}
          <label htmlFor="dispute-decision-reason">{translateText("Reason for this decision")}</label><textarea id="dispute-decision-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} aria-invalid={Boolean(error)} onChange={(event) => setReason(event.target.value)} placeholder={translateText("Enter the reason for the Dispute Case decision")} /><div className="field-help"><span>{translateText("Minimum 8 characters")}</span><span>{reason.length}/500</span></div>{error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div><div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</button><button className="btn danger" type="submit" disabled={busy || reason.trim().length < 8 || !reasonCode || choice === "resolve" && (!Number.isInteger(Number(amountSatang)) || Number(amountSatang) <= 0)}>{busy ? translateText("Saving…") : translateText("Confirm decision")}</button></div>
      </form>
    </dialog>
  );
}

function EvidencePreview({ state, translateText, onClose }: { state: EvidenceState; translateText: (value: string) => string; onClose: () => void }) {
  let display = translateText("The Admin API did not return bounded Evidence Reference context.");
  if (state.value !== null && state.value !== undefined) {
    display = typeof state.value === "string" ? state.value : JSON.stringify(state.value, null, 2);
  }
  return <dialog open className="dispute-evidence-dialog" aria-modal="true" aria-labelledby="dispute-evidence-title"><div className="dialog-body"><div className="evidence-preview-head"><div><strong id="dispute-evidence-title">{translateText("Evidence Reference")}</strong><small>{state.reference}</small></div><button className="icon" type="button" aria-label={translateText("Close evidence")} onClick={onClose}><span className="close-lines" /></button></div>{state.loading && <p>{translateText("Loading Evidence Reference…")}</p>}{state.error && <p className="field-error" role="alert">{translateText(state.error)}</p>}{!state.loading && !state.error && <pre className="report-evidence-context">{display}</pre>}<div className="dialog-actions"><button className="btn" type="button" onClick={onClose}>{translateText("Close")}</button></div></div></dialog>;
}

function DecisionControls({ model, translateText, selectedChoice, commandError, onSelect, onStart }: { model: DisputeCaseModel; translateText: (value: string) => string; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelect: (choice: DisputeCaseDecisionChoice) => void; onStart: () => void }) {
  if (!model.isActionable) return <><p className="audit-note">{translateText("Decision recorded:")} <strong>{model.decisionLabel ?? model.statusLabel}</strong>.</p><DecisionDetails model={model} translateText={translateText} /></>;
  const workerAvailable = Boolean(model.workerId);
  return <><p className="audit-note">{translateText("The Quest remains in QUEST_FAILED. Choose the financial outcome, then provide a reason code, allocation, and reason.")}</p><fieldset className="report-decision-options dispute-decision-options"><legend className="visually-hidden">{translateText("Dispute Case decision")}</legend><div className={`report-decision-option ${selectedChoice === "dismiss" ? "selected" : ""}`}><input id={`dispute-decision-${model.id}-dismiss`} type="radio" name={`dispute-decision-${model.id}`} value="dismiss" data-dispute-decision="dismiss" checked={selectedChoice === "dismiss"} onChange={() => onSelect("dismiss")} /><label htmlFor={`dispute-decision-${model.id}-dismiss`}><strong>{translateText("Hirer wins")}</strong><small>{translateText("Dismiss the Dispute Case. No money movement.")}</small></label></div><div className={`report-decision-option ${selectedChoice === "resolve" ? "selected" : ""}`}><input id={`dispute-decision-${model.id}-resolve`} type="radio" name={`dispute-decision-${model.id}`} value="resolve" data-dispute-decision="resolve" checked={selectedChoice === "resolve"} onChange={() => onSelect("resolve")} disabled={!workerAvailable} /><label htmlFor={`dispute-decision-${model.id}-resolve`}><strong>{translateText("Worker wins")}</strong><small>{workerAvailable ? translateText("Enter the explicit positive Satang allocation in the confirmation form.") : translateText("Worker ID was not provided by the Admin API.")}</small></label></div></fieldset>{commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}<button className="btn danger full-width" type="button" data-dispute-resolve="Resolve Dispute Case" onClick={onStart} disabled={model.version === undefined}>{translateText("Record Dispute Case decision")}</button>{model.version === undefined && <p className="field-error" role="alert">{translateText("The current Dispute Case version was not provided by the Admin API.")}</p>}</>;
}

function FullSections({ model, translateText, onOpenEvidence, selectedChoice, commandError, onSelectChoice, onStartDecision }: { model: DisputeCaseModel; translateText: (value: string) => string; onOpenEvidence: (reference: string) => void; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelectChoice: (choice: DisputeCaseDecisionChoice) => void; onStartDecision: () => void }) {
  return <div className="full-record-grid"><div className="record-primary"><Overview model={model} translateText={translateText} /><PartyStatements model={model} translateText={translateText} /><EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} /><Timeline model={model} translateText={translateText} /></div><aside className="record-side"><MemberSummary heading="Filer" id={model.filerId} name={model.filerName} href={model.filerHref} translateText={translateText} /><MemberSummary heading="Worker" id={model.workerId} name={model.workerName} href={model.workerHref} translateText={translateText} /><section className="record-panel"><h2>{translateText("Related Quest")}</h2><div className="side-facts"><div><span>{translateText("Quest")}</span><strong>{model.questTitle}</strong></div><div><span>{translateText("Quest State")}</span><strong>{model.questState}</strong></div><div><span>{translateText("Failed at")}</span><strong>{model.questFailedAt ? model.questFailedAt : translateText("Not provided by the Admin API.")}</strong></div></div><Link className="btn full-width" href={model.questHref ?? questRoutes.list()}>{translateText("Open Quest detail")}</Link></section><section className="record-panel dispute-decision-panel"><h2>{model.isActionable ? translateText("Dispute decision") : translateText("Recorded outcome")}</h2><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></section></aside></div>;
}

function DrawerSections({ model, translateText, onOpenEvidence, selectedChoice, commandError, onSelectChoice, onStartDecision }: { model: DisputeCaseModel; translateText: (value: string) => string; onOpenEvidence: (reference: string) => void; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelectChoice: (choice: DisputeCaseDecisionChoice) => void; onStartDecision: () => void }) {
  return <div className="drawer-body dispute-case-drawer-detail"><div className="drawer-title"><span className="att-icon warning" aria-hidden="true">⚑</span><div><h2>{model.title}</h2><p>{translateText("Dispute Case")} {model.displayId}</p></div></div><DisputeAlert model={model} translateText={translateText} /><Overview model={model} translateText={translateText} compact /><PartyStatements model={model} translateText={translateText} compact /><EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} compact /><section className="section dispute-decision-panel"><h3>{model.isActionable ? translateText("Dispute decision") : translateText("Resolution")}</h3><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></section><div className="drawer-actions">{model.questHref && <Link className="btn" href={model.questHref}>{translateText("Quest detail")}</Link>}<a className="btn primary" href={disputeRoutes.detail(model.id)}>{translateText("Open full Dispute Case")}</a></div></div>;
}

export function DisputeCaseDetail({ disputeId, initialModel = null, drawer = false, onUpdated }: DisputeCaseDetailProps) {
  const { translateText } = useAdminShell();
  const [disputeModel, setDisputeModel] = useState<DisputeCaseModel | null>(initialModel);
  const [loading, setLoading] = useState(!initialModel);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<DisputeCaseDecisionChoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [evidenceState, setEvidenceState] = useState<EvidenceState | null>(null);

  useEffect(() => {
    if (initialModel && !drawer) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const request = isAdminApiEnabled() ? adminApi.getDispute(disputeId) : Promise.resolve(findDisputeCaseFromMock(localStorage, disputeId));
    void request.then((record) => {
      if (cancelled) return;
      const nextModel = disputeCaseModelFromRecord(record, isAdminApiEnabled() ? "api" : "mock");
      if (!nextModel || nextModel.id !== disputeId) {
        setDisputeModel(null);
        setLoadError("The Dispute Case was not found.");
      } else setDisputeModel(nextModel);
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "The Dispute Case could not load.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [disputeId, drawer, initialModel]);

  const model = disputeModel;
  if (loading && !model) return <AdminLoading message={translateText("Loading Dispute Case…")} />;
  if (!model) return <main className={drawer ? "drawer-body" : "admin-feedback"}><section className="panel"><h1>{translateText("Dispute Case not found")}</h1><p>{translateText(loadError ?? "The requested Dispute Case was not found.")}</p>{!drawer && <Link className="btn primary" href={disputeRoutes.list()}>{translateText("Return to Dispute Cases")}</Link>}</section></main>;

  const openEvidence = async (reference: string) => {
    setEvidenceState({ reference, value: null, error: null, loading: true });
    try {
      const value = isAdminApiEnabled()
        ? await adminApi.getDisputeEvidence(model.id, { idempotencyKey: newDisputeCaseIdempotencyKey(model.id) })
        : { evidenceRef: reference };
      setEvidenceState({ reference, value, error: null, loading: false });
    } catch (error: unknown) {
      setEvidenceState({ reference, value: null, error: error instanceof Error ? error.message : "Evidence Reference could not load.", loading: false });
    }
  };

  const startDecision = () => {
    if (!model.isActionable) return;
    if (!selectedChoice) {
      setCommandError("Choose Hirer wins or Worker wins before recording the decision.");
      return;
    }
    setCommandError(null);
    setDialogOpen(true);
  };

  const confirmDecision = async (reason: string, reasonCode: AdminDisputeReasonCode, amountSatang: number | null) => {
    if (!selectedChoice) return;
    if (model.version === undefined) {
      setCommandError("The current Dispute Case version was not provided by the Admin API.");
      return;
    }
    const command = disputeCaseDecisionFor(selectedChoice);
    if (command === "DISPUTE_CASE_RESOLVED" && (!model.workerId || amountSatang === null || amountSatang <= 0)) {
      setCommandError("Worker allocation requires a Worker and a positive Satang amount.");
      return;
    }
    setCommandBusy(true);
    setCommandError(null);
    const options: DisputeResolution = {
      outcome: command,
      reasonCode,
      expectedVersion: model.version,
      idempotencyKey: newDisputeCaseIdempotencyKey(model.id),
      ...(command === "DISPUTE_CASE_RESOLVED" && model.workerId && amountSatang !== null
        ? { workerId: model.workerId, amountSatang }
        : {}),
    };
    try {
      let updatedRecord: Record<string, unknown> | null;
      let resourceVersion: number | undefined;
      if (isAdminApiEnabled()) {
        const result = await adminApi.resolveDispute(model.id, options);
        updatedRecord = result.resourceSummary;
        resourceVersion = result.resourceVersion;
      } else {
        updatedRecord = saveMockDisputeDecision(localStorage, model.id, command, reason, options);
        resourceVersion = typeof updatedRecord?.version === "number" ? updatedRecord.version : undefined;
      }
      const updatedModel = disputeCaseModelFromRecord({
        ...model,
        ...updatedRecord,
        status: command,
        disputeCaseStatus: command,
        decisionReason: reason,
        ...(command === "DISPUTE_CASE_RESOLVED"
          ? { resolvedWorkerId: model.workerId, resolvedAmountSatang: amountSatang }
          : { resolvedWorkerId: null, resolvedAmountSatang: null }),
        ...(resourceVersion !== undefined && { version: resourceVersion }),
      }, isAdminApiEnabled() ? "api" : "mock");
      if (!updatedModel || updatedModel.id !== model.id) throw new Error("The Admin API returned an invalid Dispute Case.");
      setDisputeModel(updatedModel);
      window.dispatchEvent(new CustomEvent(DISPUTE_CASE_UPDATED_EVENT, { detail: updatedModel }));
      onUpdated?.(updatedModel);
      setDialogOpen(false);
      setSelectedChoice(null);
    } catch (error: unknown) {
      setCommandError(error instanceof Error ? error.message : "The Dispute Case decision could not be saved.");
    } finally {
      setCommandBusy(false);
    }
  };

  const overlays = <><DecisionDialog modelId={model.id} open={dialogOpen} choice={selectedChoice} busy={commandBusy} error={commandError} translateText={translateText} onCancel={() => { if (!commandBusy) { setDialogOpen(false); setCommandError(null); } }} onConfirm={confirmDecision} />{evidenceState && <EvidencePreview state={evidenceState} translateText={translateText} onClose={() => setEvidenceState(null)} />}</>;
  const content = <><DisputeAlert model={model} translateText={translateText} /><div className="record-status-bar"><div><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div><span>{translateText("Category")}</span><strong>{model.category}</strong></div><div><span>{translateText("Opened")}</span><strong>{model.submittedAt}</strong></div><div><span>{translateText("Amount at risk")}</span><strong>{model.amountAtRiskLabel}</strong></div><div><span>{translateText("Evidence")}</span><strong>{model.evidence.length || translateText("None")}</strong></div></div><FullSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} /></>;

  if (drawer) return <><DrawerSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} />{overlays}</>;
  return <main className="admin-route-page dispute-case-detail" tabIndex={-1}><div className="record-breadcrumb"><Link href={disputeRoutes.list()}>{translateText("Dispute Cases")}</Link><span>›</span><span>{model.displayId}</span></div><div className="full-record-head"><div><div className="record-id">{model.displayId}</div><h1>{model.title}</h1><p>{model.category} · {translateText("opened")} {model.submittedAt}</p></div><div className="full-record-actions"><Link className="btn" href={disputeRoutes.list()}>{translateText("Back to Dispute Cases")}</Link>{model.isActionable && <button className="btn danger" type="button" data-dispute-resolve="Resolve Dispute Case" onClick={startDecision}>{translateText("Record decision")}</button>}</div></div>{content}{overlays}</main>;
}

export function DisputeCaseDrawer({ disputeId, initialModel, onClose, onUpdated }: { disputeId: string; initialModel?: DisputeCaseModel | null; onClose: () => void; onUpdated?: (model: DisputeCaseModel) => void }) {
  const { translateText } = useAdminShell();
  return <><button className="scrim" type="button" aria-label={translateText("Close Dispute Case drawer")} onClick={onClose} /><dialog open className="drawer open" aria-modal="true" aria-label={translateText("Dispute Case details")}><div className="drawer-top"><div><strong>{disputeId}</strong><small>{translateText("Dispute Case")}</small></div><button className="icon" type="button" aria-label={translateText("Close drawer")} onClick={onClose}><span className="close-lines" /></button></div><DisputeCaseDetail disputeId={disputeId} initialModel={initialModel} drawer onUpdated={onUpdated} /></dialog></>;
}

export function DisputeCaseDrawerRoute({ disputeId, initialModel }: { disputeId: string; initialModel?: DisputeCaseModel | null }) {
  const router = useRouter();
  return <DisputeCaseDrawer disputeId={disputeId} initialModel={initialModel} onClose={() => router.back()} onUpdated={() => router.refresh()} />;
}
