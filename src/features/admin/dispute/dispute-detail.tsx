"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { AdminActionReceipt, AdminActionSummary } from "../../../components/admin/admin-action-feedback";
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
  adminRecordFact,
  adminRecordFacts,
  adminRecordGroup,
  adminRecordHeader,
  adminRecordHeading,
  adminRecordPartyGrid,
  adminRecordSection,
  adminRecordSideFacts,
} from "../../../components/admin/admin-record-styles";
import { adminApi, type AdminDisputeReasonCode, type DisputeResolution } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { disputeRoutes, questRoutes } from "../admin-routes";
import { ModerationCaseWorkspace, ModerationHistoryPanel } from "../moderation-case/moderation-case-workspace";
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
import { disputeCaseStatusLabel, questStateLabel } from "../domain/rulebook";
import { questStatusClass } from "../quest/quest-model";

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

const dialogFocusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDisputeModalFocus(
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  onCancel: () => void,
) {
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(dialogFocusableSelector)).filter((element) => element.getClientRects().length > 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      event.stopPropagation();
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }
      const current = document.activeElement;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (current === dialog || current === first || !dialog.contains(current))) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (current === last || !dialog.contains(current))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleCancel = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onCancelRef.current();
    };

    dialog.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("cancel", handleCancel);
    (focusableElements()[0] ?? dialog).focus({ preventScroll: true });

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      dialog.removeEventListener("cancel", handleCancel);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [dialogRef, open]);
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
      <>
        <Card as="section" className={adminRecordSection}>
          <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("Dispute overview")}</h3></CardHeader>
          <div className={adminRecordFacts}><div className={adminRecordFact}><span>{translateText("Status")}</span><strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong></div><div className={adminRecordFact}><span>{translateText("Category")}</span><strong>{translateText(model.category)}</strong></div><div className={adminRecordFact}><span>{translateText("Amount at risk")}</span><strong>{model.amountAtRiskLabel}</strong></div></div>
          <AdminOverviewMeta className="moderation-case-context-grid !grid-cols-2 max-[600px]:!grid-cols-1"><div><dt>{translateText("Case")}</dt><dd>{model.displayId}</dd></div><div><dt>{translateText("Case type")}</dt><dd>{translateText("Dispute Case")}</dd></div><div><dt>{translateText("Source")}</dt><dd>{translateText("Quest settlement")}</dd></div><div><dt>{translateText("Submitted")}</dt><dd>{model.submittedAt}</dd></div><div><dt>{translateText("Evidence References")}</dt><dd>{model.evidence.length || translateText("None")}</dd></div></AdminOverviewMeta>
          <div className={adminRecordGroup}><span>{translateText("Submitted detail")}</span><p>{model.detail}</p></div>
          <div className={adminRecordPartyGrid}><div><span>{translateText(model.filerRole)}</span><strong><MemberLink id={model.filerId} name={model.filerName} href={model.filerHref} interactive={false} /></strong><small>{model.filerId ?? "—"}</small></div><div><span>{translateText(model.respondentRole)}</span><strong><MemberLink id={model.respondentId} name={model.respondentName} href={model.respondentHref} interactive={false} /></strong><small>{model.respondentId ?? "—"}</small></div></div>
        </Card>
      </>
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

function PartyStatements({ model, translateText, compact = false, interactive = true }: { model: DisputeCaseModel; translateText: (value: string) => string; compact?: boolean; interactive?: boolean }) {
  const content = (
    <>
      <div className={adminRecordPartyGrid}>
        <div><span>{translateText(model.filerRole)}</span><strong><MemberLink id={model.filerId} name={model.filerName} href={model.filerHref} interactive={interactive} /></strong>{model.filerId && <small>{model.filerId}</small>}</div>
        <div><span>{translateText(model.respondentRole)}</span><strong><MemberLink id={model.respondentId} name={model.respondentName} href={model.respondentHref} interactive={interactive} /></strong>{model.respondentId && <small>{model.respondentId}</small>}</div>
      </div>
      <div className="dispute-statements mt-[18px] grid gap-[14px]"><div className={adminRecordGroup}><span>{translateText(model.filerRole === "Hirer" ? "Hirer statement" : "Worker statement")}</span><p>{model.filerStatement}</p></div><div className={adminRecordGroup}><span>{translateText(model.respondentRole === "Hirer" ? "Hirer statement" : "Worker statement")}</span><p>{model.respondentStatement}</p></div></div>
    </>
  );
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}>{compact ? <h3 className={adminRecordHeading}>{translateText("Parties and statements")}</h3> : <h2 className={adminRecordHeading}>{translateText("Parties and statements")}</h2>}</CardHeader>{content}</Card>;
}

function EvidenceSection({ model, translateText, onOpen, compact = false }: { model: DisputeCaseModel; translateText: (value: string) => string; onOpen: (reference: string) => void; compact?: boolean }) {
  const content = <>
    <CardHeader flush className={adminRecordHeader}>{compact ? <h3 className={adminRecordHeading}>{translateText("Evidence")}</h3> : <h2 className={adminRecordHeading}>{translateText("Evidence")}</h2>}<span className={adminRecordCount}>{model.evidence.length}</span></CardHeader>
    {model.evidence.length === 0 && <p className="audit-note">{translateText("No Evidence Reference was provided.")}</p>}
    {model.evidence.length > 0 && <div className="evidence-stack">{model.evidence.map((evidence) => evidence.reference
      ? <button key={evidence.reference} className="evidence-item" type="button" onClick={() => onOpen(evidence.reference as string)}><span className="evidence-state">✓</span><span><strong>{evidence.label}</strong><small>{translateText("Bounded Evidence Reference")}</small></span><span>{translateText("Open")}</span></button>
      : <div key={evidence.label} className="evidence-item evidence-unavailable"><span className="evidence-state pending">!</span><span><strong>{evidence.label}</strong><small>{translateText("Evidence Reference not available")}</small></span><span>{translateText("Unavailable")}</span></div>)}
    </div>}
  </>;
  return (
    <Card as="section" className={adminRecordSection}>{content}</Card>
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
      { title: "Dispute Case decision recorded", time: model.resolutionAt ?? model.closedAt ?? translateText("Time not provided"), detail: model.decisionReason ?? model.decisionLabel ?? translateText("Record retained for audit.") },
    ];
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Dispute timeline")}</h2></CardHeader><ol className="timeline">{events.map((event) => <li key={`${event.title}-${event.time}`}><strong>{translateText(event.title)}</strong><time>{event.time}</time><span>{translateText(event.detail)}</span></li>)}</ol></Card>;
}

function DecisionDetails({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  if (!model.decisionReason && !model.resolution && !model.resolvedBy) return null;
  return <div className={adminRecordGroup}><span>{translateText("Reason for decision")}</span><p>{model.decisionReason ?? translateText("Reason not provided.")}</p><AdminOverviewMeta className="dispute-resolution-meta !grid-cols-2 mt-[14px] max-[700px]:!grid-cols-1"><div><dt>{translateText("Outcome")}</dt><dd>{translateText(model.decisionLabel ?? model.statusLabel)}</dd></div>{model.resolvedAmountLabel && <div><dt>{translateText("Transferred")}</dt><dd>{model.resolvedAmountLabel}</dd></div>}{model.resolvedBy && <div><dt>{translateText("Resolved by")}</dt><dd>{model.resolvedBy}</dd></div>}</AdminOverviewMeta></div>;
}

function MemberSummary({ heading, id, name, href, translateText }: { heading: string; id: string | null; name: string; href: string | null; translateText: (value: string) => string }) {
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText(heading)}</h2></CardHeader><div className={adminRecordSideFacts}><div><span>{translateText("Name")}</span><strong><MemberLink id={id} name={name} href={href} /></strong></div><div><span>{translateText("Member ID")}</span><strong>{id ?? "—"}</strong></div></div>{href && <Button asChild variant="outline" className="mt-3 w-full"><Link href={href}>{translateText("See Member profile")}</Link></Button>}</Card>;
}

function RelatedQuestPanel({ model, translateText }: { model: DisputeCaseModel; translateText: (value: string) => string }) {
  return (
    <Card as="section" className={`${adminRecordSection} related-quest-panel`}>
      <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{translateText("Related Quest")}</h3><span className={`badge ${questStatusClass(model.questState)}`}>{translateText(questStateLabel(model.questState))}</span></CardHeader>
      <div className={adminRecordSideFacts}>
        <div><span>{translateText("Quest")}</span><strong>{model.questTitle}</strong></div>
        <div><span>{translateText("Quest ID")}</span><strong>{model.questId}</strong></div>
        <div><span>{translateText("Quest State")}</span><strong>{translateText(questStateLabel(model.questState))}</strong></div>
        <div><span>{translateText("Failed at")}</span><strong>{model.questFailedAt ? formatAdminTimestamp(model.questFailedAt) : translateText("Not provided.")}</strong></div>
      </div>
      <Button asChild variant="outline" className="mt-3 w-full"><Link href={model.questHref ?? questRoutes.list()}>{translateText("Open Quest detail")}</Link></Button>
    </Card>
  );
}

function DecisionDialog({
  open,
  choice,
  busy,
  error,
  model,
  translateText,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  choice: DisputeCaseDecisionChoice | null;
  busy: boolean;
  error: string | null;
  model: DisputeCaseModel;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [choice, open]);

  useDisputeModalFocus(dialogRef, open, onCancel);

  if (!open) return null;
  const title = choice === "resolve" ? translateText("Confirm Worker wins") : translateText("Confirm Hirer wins");
  const description = choice === "resolve"
    ? `${translateText("This will transfer the full remaining Dispute Case amount to the Worker Earnings Balance for")} ${model.id}.`
    : `${translateText("This will keep the full held amount with the Hirer and close the Dispute Case for")} ${model.id}.`;
  const nextState = choice === "resolve" ? "DISPUTE_CASE_RESOLVED" : "DISPUTE_CASE_DISMISSED";
  const effect = choice === "resolve"
    ? `${translateText("Transfer the full remaining amount from the Hirer side of the held Funding Reservation to")} ${model.workerName} ${translateText("Earnings Balance")} (${model.sharedCapLabel}).`
    : translateText("Keep the full held amount with the Hirer. No money moves and the Quest remains Failed.");
  return (
    <AdminModalPortal open onClose={onCancel}>
      <dialog ref={dialogRef} open className="dispute-decision-dialog z-[60]" aria-modal="true" aria-labelledby="dispute-decision-title" tabIndex={-1}>
      <form method="dialog" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); const fullAmountUnavailable = choice === "resolve" && (!model.workerId || model.sharedCapSatang === null || model.sharedCapSatang <= 0); if (value.length < 8 || fullAmountUnavailable) return; onConfirm(value); }}>
        <div className="dialog-body p-5"><div className="warning-icon grid size-[38px] place-items-center rounded-[10px] bg-admin-danger-soft font-bold text-admin-danger" aria-hidden="true">!</div><h2 id="dispute-decision-title">{title}</h2><p>{description}</p>
          {choice ? <AdminActionSummary
            title={translateText("Before you confirm")}
            affected={`${translateText("Dispute Case")} ${model.displayId} · ${translateText("Quest")} ${model.questId}`}
            currentState={model.statusLabel}
            nextState={disputeCaseStatusLabel(nextState)}
            effect={translateText(effect)}
            reversibility={translateText(choice === "resolve" ? "The first confirmed decision is final. The money movement cannot be reversed by another Dispute Case decision." : "The decision is retained as an immutable audit record.")}
            warning={translateText(choice === "resolve"
              ? model.sharedCapSatang === null
                ? "The full remaining amount is not provided. Verify the Funding Reservation before resolving."
                : "Worker wins transfers the full remaining amount. A partial amount cannot be entered."
              : "Hirer wins keeps the full held amount with the Hirer. No money moves.")}
          /> : null}
          {choice === "resolve" && <div className="decision-amount-summary mt-4 flex items-baseline justify-between gap-3 rounded-lg border border-admin-border bg-admin-soft px-3 py-2.5"><span className="text-sm text-admin-muted">{translateText("Worker outcome")}</span><strong className="text-right text-base">{translateText("Full remaining amount")} · {model.sharedCapLabel}</strong></div>}
          <label htmlFor="dispute-decision-reason">{translateText("Reason for this decision")}</label><textarea id="dispute-decision-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} aria-invalid={Boolean(error)} onChange={(event) => setReason(event.target.value)} placeholder={translateText("Enter the reason for the Dispute Case decision")} /><div className="mt-1.5 flex justify-between gap-3 text-[15px] leading-[1.4] text-admin-muted"><span>{translateText("Minimum 8 characters")}</span><span>{reason.length}/500</span></div>{error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div><div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5"><Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</Button><Button variant="danger" type="submit" disabled={busy || reason.trim().length < 8 || choice === "resolve" && (!model.workerId || model.sharedCapSatang === null || model.sharedCapSatang <= 0)}>{busy ? translateText("Saving…") : translateText("Confirm decision")}</Button></div>
      </form>
      </dialog>
    </AdminModalPortal>
  );
}

function EvidencePreview({ state, translateText, onClose }: { state: EvidenceState; translateText: (value: string) => string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  let display = translateText("Bounded Evidence Reference context was not provided.");
  if (state.value !== null && state.value !== undefined) {
    display = typeof state.value === "string" ? state.value : JSON.stringify(state.value, null, 2);
  }
  useDisputeModalFocus(dialogRef, true, onClose);
  return <AdminModalPortal open onClose={onClose}><dialog ref={dialogRef} open className="dispute-evidence-dialog z-[60] w-[min(620px,calc(100vw-32px))]" aria-modal="true" aria-labelledby="dispute-evidence-title" tabIndex={-1}><div className="dialog-body p-5"><div className="sticky top-0 z-[2] flex items-center justify-between border-b border-admin-border bg-admin-surface/95 px-4 py-3 backdrop-blur-sm"><div><strong id="dispute-evidence-title" className="block">{translateText("Evidence Reference")}</strong><small className="block text-[13px] text-admin-muted">{state.reference}</small></div><button className="icon" type="button" aria-label={translateText("Close evidence")} onClick={onClose}><span className="close-lines" /></button></div>{state.loading && <p>{translateText("Loading Evidence Reference…")}</p>}{state.error && <p className="field-error" role="alert">{translateText(state.error)}</p>}{!state.loading && !state.error && <pre className="report-evidence-context max-h-[50vh] overflow-auto rounded-lg bg-admin-soft p-3 text-sm [overflow-wrap:anywhere]">{display}</pre>}<div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5"><Button variant="outline" type="button" onClick={onClose}>{translateText("Close")}</Button></div></div></dialog></AdminModalPortal>;
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
        <label className="grid cursor-pointer gap-0.5" htmlFor={`dispute-decision-${model.id}-dismiss`}><strong className="text-sm leading-[1.35]">{translateText("Hirer wins")}</strong><small className="text-[13px] leading-[1.45] text-admin-muted">{translateText("Keep the full held amount with the Hirer. No money movement.")}</small></label>
      </div>
      <div className={`report-decision-option grid w-full grid-cols-[18px_1fr] items-start gap-x-2 gap-y-0.5 rounded-[9px] border border-admin-border bg-admin-surface px-3 py-[11px] text-left transition-colors hover:bg-admin-hover ${selectedChoice === "resolve" ? "border-admin-accent bg-admin-accent-soft shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
        <input className="mt-0.5" id={`dispute-decision-${model.id}-resolve`} type="radio" name={`dispute-decision-${model.id}`} value="resolve" data-dispute-decision="resolve" checked={selectedChoice === "resolve"} onChange={() => onSelect("resolve")} disabled={!workerAvailable} />
        <label className="grid cursor-pointer gap-0.5" htmlFor={`dispute-decision-${model.id}-resolve`}><strong className="text-sm leading-[1.35]">{translateText("Worker wins")}</strong><small className="text-[13px] leading-[1.45] text-admin-muted">{workerAvailable ? translateText("Transfer the full remaining Dispute Case amount to the Worker.") : translateText("Worker ID was not provided.")}</small></label>
      </div>
    </fieldset>
    {commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}
    <Button variant="danger" className="w-full" type="button" data-dispute-resolve="Resolve Dispute Case" onClick={onStart} disabled={model.version === undefined}>{translateText("Record Dispute Case decision")}</Button>
    {model.version === undefined && <p className="field-error" role="alert">{translateText("The current Dispute Case version was not provided.")}</p>}
  </>;
}

function FullSections({ model, translateText, onOpenEvidence, selectedChoice, commandError, onSelectChoice, onStartDecision, actionReceipt }: { model: DisputeCaseModel; translateText: (value: string) => string; onOpenEvidence: (reference: string) => void; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelectChoice: (choice: DisputeCaseDecisionChoice) => void; onStartDecision: () => void; actionReceipt?: ReactNode }) {
  return <>
    <AdminRecordGrid
      primary={<><Overview model={model} translateText={translateText} /><PartyStatements model={model} translateText={translateText} /><EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} /><Timeline model={model} translateText={translateText} /></>}
      side={<><MemberSummary heading={model.filerRole} id={model.filerId} name={model.filerName} href={model.filerHref} translateText={translateText} /><MemberSummary heading={model.respondentRole} id={model.respondentId} name={model.respondentName} href={model.respondentHref} translateText={translateText} /><Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Related Quest")}</h2></CardHeader><div className={adminRecordSideFacts}><div><span>{translateText("Quest")}</span><strong>{model.questTitle}</strong></div><div><span>{translateText("Quest State")}</span><strong>{translateText(questStateLabel(model.questState))}</strong></div><div><span>{translateText("Failed at")}</span><strong>{model.questFailedAt ? formatAdminTimestamp(model.questFailedAt) : translateText("Not provided.")}</strong></div></div><Button asChild variant="outline" className="mt-3 w-full"><Link href={model.questHref ?? questRoutes.list()}>{translateText("Open Quest detail")}</Link></Button></Card><Card as="section" className={`${adminRecordSection} dispute-decision-panel`}><CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{model.isActionable ? translateText("Dispute decision") : translateText("Recorded outcome")}</h2></CardHeader><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></Card></>}
    />{actionReceipt}
  </>;
}

function DrawerSections({ model, translateText, onOpenEvidence, selectedChoice, commandError, onSelectChoice, onStartDecision, actionReceipt }: { model: DisputeCaseModel; translateText: (value: string) => string; onOpenEvidence: (reference: string) => void; selectedChoice: DisputeCaseDecisionChoice | null; commandError: string | null; onSelectChoice: (choice: DisputeCaseDecisionChoice) => void; onStartDecision: () => void; actionReceipt?: ReactNode }) {
  return <div className="dispute-case-drawer-detail admin-drawer-content-flow grid min-w-0 content-start gap-[18px]"><DisputeAlert model={model} translateText={translateText} /><ModerationCaseWorkspace
    kind="Dispute Case"
    caseId={model.displayId}
    statusLabel={model.statusLabel}
    badgeClass={model.badgeClass}
    submittedAt={model.submittedAt}
    source="Quest settlement"
    detail={model.detail}
    reportedMember={{ id: model.workerId, name: model.workerName, href: model.workerHref, role: "Worker" }}
    reporter={{ id: model.filerId, name: model.filerName, href: model.filerHref, role: model.filerRole }}
    relatedRecord={{ id: model.questId, title: model.questTitle, href: model.questHref, state: model.questState }}
    evidenceCount={model.evidence.length}
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
    <EvidenceSection model={model} translateText={translateText} onOpen={onOpenEvidence} compact />
    <RelatedQuestPanel model={model} translateText={translateText} />
    <PartyStatements model={model} translateText={translateText} compact interactive={false} />
    <ModerationHistoryPanel
      summary={model.moderationHistory}
      translateText={translateText}
      compact
      member={{ id: model.respondentId, name: model.respondentName, href: model.respondentHref }}
      memberLabel={model.respondentRole}
    />
    <Card as="section" className={`${adminRecordSection} dispute-decision-panel`}><CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{model.isActionable ? translateText("Dispute decision") : translateText("Resolution")}</h3></CardHeader><DecisionControls model={model} translateText={translateText} selectedChoice={selectedChoice} commandError={commandError} onSelect={onSelectChoice} onStart={onStartDecision} /></Card>
  </ModerationCaseWorkspace>{actionReceipt}<div className="admin-drawer-actions sticky bottom-[-28px] z-[4] m-[18px_-24px_-28px] flex flex-wrap gap-2 border-t border-admin-border bg-admin-surface/95 px-6 py-3.5 shadow-[0_-6px_18px_rgba(0,0,0,0.09)] [&>*]:min-h-11 [&>*]:flex-[1_1_180px] [&>*]:text-center max-[720px]:bottom-[-24px] max-[720px]:m-[18px_-16px_-24px] max-[720px]:px-4 max-[720px]:[&>*]:basis-full">{model.questHref && <Button asChild size="lg" variant="outline"><Link href={model.questHref}>{translateText("Quest detail")}</Link></Button>}<Button asChild size="lg" variant="primary"><a href={disputeRoutes.detail(model.id)}>{translateText("Open full Dispute Case")}</a></Button></div></div>;
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
  if (!model) return <main className={drawer ? "drawer-body" : "admin-feedback"}><Card as="section" className="overflow-hidden"><CardHeader><h1 className="text-lg font-semibold">{translateText("Dispute Case not found")}</h1></CardHeader><CardContent className="space-y-4"><p>{translateText(loadError ?? "The requested Dispute Case was not found.")}</p>{!drawer && <Button asChild variant="primary"><Link href={disputeRoutes.list()}>{translateText("Return to Dispute Cases")}</Link></Button>}</CardContent></Card></main>;

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

  const confirmDecision = async (reason: string) => {
    if (!selectedChoice) return;
    if (model.version === undefined) {
      setCommandError("The current Dispute Case version was not provided.");
      return;
    }
    const command = disputeCaseDecisionFor(selectedChoice);
    const reasonCode: AdminDisputeReasonCode = command === "DISPUTE_CASE_RESOLVED" ? "DISPUTE_EVIDENCE_REVIEW" : "DISPUTE_POLICY_REVIEW";
    const amountSatang = command === "DISPUTE_CASE_RESOLVED" ? model.sharedCapSatang : null;
    if (command === "DISPUTE_CASE_RESOLVED" && (!model.workerId || amountSatang === null || amountSatang <= 0)) {
      setCommandError("Worker wins requires a Worker and a full available Dispute Case amount.");
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
      if (!updatedModel || updatedModel.id !== model.id) throw new Error(isAdminApiEnabled() ? "The Admin API returned an invalid Dispute Case." : "The Dispute Case record is invalid.");
      setDisputeModel(updatedModel);
      window.dispatchEvent(new CustomEvent(DISPUTE_CASE_UPDATED_EVENT, { detail: updatedModel }));
      onUpdated?.(updatedModel);
      setDialogOpen(false);
      setSelectedChoice(null);
      if (!isAdminApiEnabled()) {
        setActionReceipt({
          action: command,
          status: updatedModel.statusLabel,
          reason,
          occurredAt: new Date().toISOString(),
        });
      }
    } catch (error: unknown) {
      setCommandError(error instanceof Error ? error.message : "The Dispute Case decision could not be saved.");
    } finally {
      setCommandBusy(false);
    }
  };

  const receipt = actionReceipt ? <AdminActionReceipt action={actionReceipt.action} resource="Dispute Case" resourceId={model.id} status={actionReceipt.status} occurredAt={actionReceipt.occurredAt} mock details={<p>{translateText("Reason")}: {actionReceipt.reason}</p>} /> : null;
  const overlays = <><DecisionDialog model={model} open={dialogOpen} choice={selectedChoice} busy={commandBusy} error={commandError} translateText={translateText} onCancel={() => { if (!commandBusy) { setDialogOpen(false); setCommandError(null); } }} onConfirm={confirmDecision} />{evidenceState && <EvidencePreview state={evidenceState} translateText={translateText} onClose={() => setEvidenceState(null)} />}</>;
  const content = <><DisputeAlert model={model} translateText={translateText} /><RecordStatusBar items={[{ id: "status", label: translateText("Status"), value: <span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span> }, { id: "category", label: translateText("Category"), value: translateText(model.category) }, { id: "opened", label: translateText("Opened"), value: model.submittedAt }, { id: "amount-at-risk", label: translateText("Amount at risk"), value: model.amountAtRiskLabel }, { id: "evidence", label: translateText("Evidence"), value: model.evidence.length || translateText("None") }]} /><FullSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} actionReceipt={receipt} /></>;

  if (drawer) return <><DrawerSections model={model} translateText={translateText} onOpenEvidence={openEvidence} selectedChoice={selectedChoice} commandError={commandError} onSelectChoice={(choice) => { setSelectedChoice(choice); setCommandError(null); }} onStartDecision={startDecision} actionReceipt={receipt} />{overlays}</>;
  return <main className="admin-route-page dispute-case-detail" tabIndex={-1}><AdminRecordHeader breadcrumbHref={disputeRoutes.list()} breadcrumbLabel={translateText("Dispute Cases")} recordId={model.displayId} title={model.title} subtitle={`${translateText(model.category)} · ${translateText("opened")} ${model.submittedAt}`} actions={<><Button asChild size="lg" variant="outline"><Link href={disputeRoutes.list()}>{translateText("Back to Dispute Cases")}</Link></Button>{model.isActionable && <Button size="lg" variant="danger" type="button" data-dispute-resolve="Resolve Dispute Case" onClick={startDecision}>{translateText("Record decision")}</Button>}</>} />{content}{overlays}</main>;
}

export function DisputeCaseDrawer({ disputeId, initialModel, onClose, onUpdated }: { disputeId: string; initialModel?: DisputeCaseModel | null; onClose: () => void; onUpdated?: (model: DisputeCaseModel) => void }) {
  const { translateText } = useAdminShell();
  return <AdminDrawer
    ariaLabel={translateText("Close drawer")}
    title={<><span aria-hidden="true">{initialModel?.title ?? disputeId}</span><span className="visually-hidden">{translateText("Dispute Case details")}</span></>}
    titleId="dispute-case-drawer-title"
    subtitle={<>{translateText("Dispute Case")} {initialModel?.displayId ?? disputeId} · {translateText("Dispute Case detail drawer")}</>}
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
