"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { adminApi, type ReportDecision } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import {
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
  modelId: string;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

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
  modelId,
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
  const description = decisionDialogDescription(choice, modelId, translateText);

  return (
    <dialog
      open
      className="report-decision-dialog conduct-report-decision-dialog"
      aria-modal="true"
      aria-labelledby="conduct-report-decision-title"
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
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
}) {
  return (
    <section className="section">
      <h3>{translateText("People involved")}</h3>
      <div className="facts">
        <div className="fact">
          <span>{translateText("Reported Member")}</span>
          <strong><MemberLink id={model.reportedMemberId} name={model.reportedMemberName} href={model.reportedMemberHref} /></strong>
          <small>{model.reportedMemberId || "—"}</small>
        </div>
        <div className="fact">
          <span>{translateText("Reported by")}</span>
          <strong><MemberLink id={model.reporterId} name={model.reporterName} href={model.reporterHref} /></strong>
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
}: {
  model: ConductReportModel;
  translateText: (value: string) => string;
  selectedChoice: ConductReportDecisionChoice | null;
  commandError: string | null;
  onSelectChoice: (choice: ConductReportDecisionChoice) => void;
  onStartDecision: () => void;
}) {
  return (
    <div className="drawer-body conduct-report-drawer-detail">
      <div className="drawer-title">
        <span className="att-icon warning" aria-hidden="true">⚑</span>
        <div>
          <h2>{model.title}</h2>
          <p>{translateText("Quest")}: {model.questTitle}</p>
        </div>
      </div>
      <ConductReportAlert model={model} translateText={translateText} />
      <ConductReportOverview model={model} translateText={translateText} />
      <section className="section">
        <h3>{translateText("Conduct Report detail")}</h3>
        <p>{model.detail}</p>
      </section>
      <QuestRecordSection model={model} translateText={translateText} />
      <PeopleInvolved model={model} translateText={translateText} />
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
      <div className="drawer-actions">
        {model.reportedMemberHref && (
          <Link className="btn" href={model.reportedMemberHref}>
            {translateText("Member profile")}
          </Link>
        )}
      </div>
    </div>
  );
}

export function ConductReportDrawer({
  model,
  onClose,
  onUpdated,
}: {
  model: ConductReportModel;
  onClose: () => void;
  onUpdated?: (model: ConductReportModel) => void;
}) {
  const { translateText } = useAdminShell();
  const [reportModel, setReportModel] = useState(model);
  const [selectedChoice, setSelectedChoice] = useState<ConductReportDecisionChoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  useEffect(() => {
    setReportModel(model);
  }, [model]);

  const startDecision = () => {
    if (!reportModel.isActionable) return;
    if (!selectedChoice) {
      setCommandError("Choose No violation or Confirm violation before closing the Conduct Report.");
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
    } catch (error: unknown) {
      setCommandError(error instanceof Error ? error.message : "The Conduct Report decision could not be saved.");
    } finally {
      setCommandBusy(false);
    }
  };

  return (
    <>
      <button
        className="scrim"
        type="button"
        aria-label={translateText("Close Conduct Report drawer")}
        onClick={onClose}
      />
      <dialog open className="drawer open" aria-modal="true" aria-label={translateText("Conduct Report details")}>
        <div className="drawer-top">
          <div>
            <strong>{reportModel.id}</strong>
            <small>{translateText("Conduct Report")}</small>
          </div>
          <button className="icon" type="button" aria-label={translateText("Close drawer")} onClick={onClose}>
            <span className="close-lines" />
          </button>
        </div>
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
        />
      </dialog>
      <ConductReportDecisionDialog
        modelId={reportModel.id}
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
    </>
  );
}
