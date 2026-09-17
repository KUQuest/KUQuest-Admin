"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AdminActionReceipt, AdminActionSummary } from "../../../components/admin/admin-action-feedback";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { adminApi, type ReportDecision } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { conductReportRoutes } from "../admin-routes";
import { AdminLoading } from "../../../components/admin/admin-feedback";
import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { ModerationCaseWorkspace } from "../moderation-case/moderation-case-workspace";
import {
  findConductReportFromMock,
  newConductReportIdempotencyKey,
  saveMockConductReportDecision,
} from "./conduct-report-adapter";
import {
  CONDUCT_REPORT_UPDATED_EVENT,
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
        className="report-decision-dialog conduct-report-decision-dialog"
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
        <div className="dialog-body">
          <div className="warning-icon" aria-hidden="true">!</div>
          <h2 id="conduct-report-decision-title">{title}</h2>
          <p>{description}</p>
          {choice ? (
            <AdminActionSummary
              title={translateText("Before you confirm")}
              affected={`${translateText("Conduct Report")} ${model.id} · ${translateText("Quest")} ${model.questId ?? "—"}`}
              currentState={model.status}
              nextState={nextState}
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
          <div className="field-help">
            <span>{translateText("Minimum 8 characters")}</span>
            <span>{reason.length}/500</span>
          </div>
          {error && <p className="field-error" role="alert">{translateText(error)}</p>}
        </div>
        <div className="dialog-actions">
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>
            {translateText("Cancel")}
          </button>
          <button className="btn danger" type="submit" disabled={busy || reason.trim().length < 8}>
            {busy ? translateText("Saving…") : translateText("Confirm decision")}
          </button>
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
    <div className={`dispute-page-alert report-page-alert ${model.isActionable ? "open" : "closed"}`}>
      <span aria-hidden="true">⚑</span>
      <div>
        <strong>
          {model.isActionable
            ? translateText("Active Conduct Report — review is required")
            : translateText("Closed Conduct Report — record retained")}
        </strong>
        <p>
          {model.isActionable
            ? translateText("Review the Quest record and submitted details before deciding this Conduct Report.")
            : translateText("This Conduct Report is closed and retained as a read-only audit record.")}
        </p>
      </div>
      <span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span>
    </div>
  );
}

function ConductReportOverview({
  model,
  translateText,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
}) {
  return (
    <section className="section">
      <h3>{translateText("Conduct Report overview")}</h3>
      <div className="facts">
        <div className="fact">
          <span>{translateText("Status")}</span>
          <strong><span className={`badge ${model.badgeClass}`}>{translateText(model.statusLabel)}</span></strong>
        </div>
        <div className="fact">
          <span>{translateText("Reason")}</span>
          <strong>{model.reason}</strong>
        </div>
        <div className="fact">
          <span>{translateText("Reported")}</span>
          <strong>{model.submittedAt}</strong>
        </div>
      </div>
    </section>
  );
}

function QuestRecordSection({
  model,
  translateText,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
}) {
  return (
    <section className="section">
      <h3>{translateText("Quest record")}</h3>
      <div className="facts">
        <div className="fact">
          <span>{translateText("Quest title")}</span>
          <strong>{model.questTitle}</strong>
        </div>
        <div className="fact">
          <span>{translateText("Quest ID")}</span>
          <strong>{model.questId ?? "—"}</strong>
        </div>
      </div>
      {model.questRecord && <p className="conduct-report-quest-record">{model.questRecord}</p>}
    </section>
  );
}

function PeopleInvolved({
  model,
  translateText,
  interactive = true,
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
  interactive?: boolean;
}) {
  return (
    <section className="section">
      <h3>{translateText("People involved")}</h3>
      <div className="facts">
        <div className="fact">
          <span>{translateText("Reported Member")}</span>
          <strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} interactive={interactive} /></strong>
          <small>{model.reportedMemberId || "—"}</small>
        </div>
        <div className="fact">
          <span>{translateText("Reported by")}</span>
          <strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} interactive={interactive} /></strong>
          <small>{model.reporterId ?? "—"}</small>
        </div>
      </div>
    </section>
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
    ["Resolution time", model.resolutionAt],
    ["Closed at", model.closedAt],
  ] as const;

  return (
    <>
      {model.decisionReason && (
        <div className="overview-group">
          <span>{translateText("Reason for decision")}</span>
          <p>{model.decisionReason}</p>
        </div>
      )}
      {details.some(([, value]) => value) && (
        <dl className="overview-meta report-resolution-meta">
          {details.flatMap(([label, value]) => value
            ? [<div key={label}><dt>{translateText(label)}</dt><dd>{value}</dd></div>]
            : [])}
        </dl>
      )}
    </>
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
          {translateText("Decision recorded:")} <strong>{model.decisionLabel ?? model.statusLabel}</strong>.
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
      <fieldset className="report-decision-options">
        <legend className="visually-hidden">{translateText("Conduct Report decision")}</legend>
        <div className={`report-decision-option ${selectedChoice === "no-violation" ? "selected" : ""}`}>
          <input
            id={`conduct-report-decision-${model.id}-no-violation`}
            type="radio"
            name={`conduct-report-decision-${model.id}`}
            value="no-violation"
            data-conduct-report-decision="no-violation"
            checked={selectedChoice === "no-violation"}
            onChange={() => onSelect("no-violation")}
          />
          <label htmlFor={`conduct-report-decision-${model.id}-no-violation`}>
            <strong>{translateText("No violation")}</strong>
            <small>{translateText("Dismiss the Conduct Report without changing the reported Member status.")}</small>
          </label>
        </div>
        <div className={`report-decision-option ${selectedChoice === "confirmed-violation" ? "selected" : ""}`}>
          <input
            id={`conduct-report-decision-${model.id}-confirmed-violation`}
            type="radio"
            name={`conduct-report-decision-${model.id}`}
            value="confirmed-violation"
            data-conduct-report-decision="confirmed-violation"
            checked={selectedChoice === "confirmed-violation"}
            onChange={() => onSelect("confirmed-violation")}
          />
          <label htmlFor={`conduct-report-decision-${model.id}-confirmed-violation`}>
            <strong>{translateText("Confirm violation")}</strong>
            <small>{translateText("Uphold the Conduct Report and apply the Member Misconduct ladder.")}</small>
          </label>
        </div>
      </fieldset>
      {commandError && <p className="field-error" role="alert">{translateText(commandError)}</p>}
      <button
        className="btn danger full-width"
        type="button"
        data-conduct-report-close="Close report"
        onClick={onStart}
      >
        {translateText("Close report")}
      </button>
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
  return (
    <div className={compact ? "conduct-report-drawer-detail" : "conduct-report-detail-body"}>
      <div className="drawer-title">
        <span className="att-icon warning" aria-hidden="true">⚑</span>
        <div>
          <h2>{model.title}</h2>
          <p>{translateText("Quest")}: {model.questTitle}</p>
        </div>
      </div>
      {compact && <ConductReportAlert model={model} translateText={translateText} />}
      <ModerationCaseWorkspace
        kind="Conduct Report"
        caseId={model.id}
        statusLabel={model.statusLabel}
        badgeClass={model.badgeClass}
        submittedAt={model.submittedAt}
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
        compact={compact}
      >
        <ConductReportOverview model={model} translateText={translateText} />
        <section className="section">
          <h3>{translateText("Conduct Report detail")}</h3>
          <p>{model.detail}</p>
        </section>
        <QuestRecordSection model={model} translateText={translateText} />
        <PeopleInvolved model={model} translateText={translateText} interactive={!compact} />
        <section className="section report-decision-panel">
          <h3>{model.isActionable ? translateText("Conduct Report decision") : translateText("Resolution")}</h3>
          <DecisionControls
            model={model}
            translateText={translateText}
            selectedChoice={selectedChoice}
            commandError={commandError}
            onSelect={onSelectChoice}
            onStart={onStartDecision}
          />
        </section>
      </ModerationCaseWorkspace>
      {actionReceipt}
      <div className={compact ? "drawer-actions" : "full-record-actions"}>
        {model.reportedMemberHref && (
          <Link className="btn" href={model.reportedMemberHref}>
            {translateText("Member profile")}
          </Link>
        )}
        {model.questHref && (
          <Link className="btn" href={model.questHref}>
            {translateText("Quest detail")}
          </Link>
        )}
        {showFullLink && <a className="btn primary" href={conductReportRoutes.detail(model.id)}>{translateText("Open full Conduct Report")}</a>}
      </div>
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
        throw new Error("The Admin API returned an invalid Conduct Report.");
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
      actionReceipt={actionReceipt ? <AdminActionReceipt action={actionReceipt.action} resource="Conduct Report" resourceId={reportModel.id} status={actionReceipt.status} occurredAt={actionReceipt.occurredAt} mock details={<p>Reason: {actionReceipt.reason}</p>} /> : null}
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
        <div className="record-breadcrumb"><Link href={conductReportRoutes.list()}>{translateText("Conduct Reports")}</Link><span>›</span><span>{reportModel.id}</span></div>
        <div className="full-record-head">
          <div><div className="record-id">{reportModel.id}</div><h1>{reportModel.title}</h1><p>{reportModel.reason} · {translateText("reported")} {reportModel.submittedAt}</p></div>
          <div className="full-record-actions"><Link className="btn" href={conductReportRoutes.list()}>{translateText("Back to Conduct Reports")}</Link></div>
        </div>
        <ConductReportAlert model={reportModel} translateText={translateText} />
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
        title={<><span aria-hidden="true">{reportModel.id}</span><span className="visually-hidden">{translateText("Conduct Report details")}</span></>}
        titleId="conduct-report-drawer-title"
        subtitle={translateText("Conduct Report")}
        className="conduct-report-drawer"
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
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "The Conduct Report could not load.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [initialModel, reportId]);

  if (loading && !reportModel) return <AdminLoading message={translateText("Loading Conduct Report…")} />;
  if (!reportModel) {
    return <main className="admin-feedback"><section className="panel"><h1>{translateText("Conduct Report not found")}</h1><p>{translateText(loadError ?? "The requested Conduct Report was not found.")}</p>{presentation === "page" && <Link className="btn primary" href={conductReportRoutes.list()}>{translateText("Return to Conduct Reports")}</Link>}</section></main>;
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
