"use client";

import { useEffect, useState } from "react";

import { AdminModalPortal } from "../../../components/admin/admin-modal-portal";
import { Button, Card } from "../../../components/ui";
import { MEMBER_PENALTY_CHOICES, memberPenaltyForChoice, memberStatusText, nextPenaltyFor, type MemberModel, type MemberPenaltyChoice } from "./member-model";

type MemberActionDialogProps = {
  model: MemberModel;
  open: boolean;
  busy: boolean;
  error: string | null;
  translateText: (value: string) => string;
  onCancel: () => void;
  onConfirm: (reason: string, note: string, penalty: MemberPenaltyChoice | null) => void;
};
export function PenaltyDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: MemberActionDialogProps) {
  const [reason, setReason] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState<MemberPenaltyChoice | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const automaticOutcome = nextPenaltyFor(model);
  const outcome = selectedPenalty ? memberPenaltyForChoice(model, selectedPenalty) : automaticOutcome;
  useEffect(() => {
    if (open) {
      setReason("");
      setSelectedPenalty(null);
      setValidationError(null);
    }
  }, [open, model.id]);
  if (!open) return null;
  return (
    <AdminModalPortal open onClose={onCancel}>
      <dialog open className="member-action-dialog" aria-modal="true" aria-label={translateText(`Confirm violation for ${model.title}`)}>
        <form
          className="party-chat-modal penalty-modal flex max-h-[min(720px,90vh)] w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] bg-admin-surface shadow-admin"
          onSubmit={(event) => {
            event.preventDefault();
            const value = reason.trim();
            if (value.length < 8) {
              setValidationError("Enter at least 8 characters explaining this confirmed violation.");
              return;
            }
            if (automaticOutcome.exempted) {
              onConfirm(value, "", null);
              return;
            }
            if (!selectedPenalty) {
              setValidationError("Select a penalty to apply.");
              return;
            }
            onConfirm(value, "", selectedPenalty);
          }}
        >
          <div className="chat-modal-head">
            <div>
              <strong>{translateText("Confirm violation")}</strong>
              <small>{model.title} · {model.id}</small>
            </div>
            <button className="icon" type="button" aria-label={translateText("Close penalty form")} onClick={onCancel}>
              <span className="close-lines" />
            </button>
          </div>
          <div className="dialog-body grid gap-3 p-5">
            <p className="chat-intro -mt-[5px] mb-0 text-admin-muted">
              {translateText(automaticOutcome.exempted
                ? "Confirm that this account committed an actual policy violation. Its exemption prevents a penalty."
                : "Confirm that this account committed an actual policy violation. Select the penalty to apply.")}
            </p>
            <Card as="section" className="penalty-policy-note grid gap-1 rounded-[10px] border border-admin-border bg-admin-accent-soft p-3" aria-label={translateText("Penalty guidance")}>
              <strong>{translateText(automaticOutcome.exempted ? "Penalty exemption" : "Automatic next outcome")}</strong>
              <span>{automaticOutcome.exempted
                ? translateText("This violation uses an exemption. No penalty will be applied.")
                : `${translateText(automaticOutcome.label)}${automaticOutcome.durationDays ? ` · ${automaticOutcome.durationDays} ${translateText("days")}` : ""}`}
              </span>
            </Card>
            <div className="penalty-preview grid gap-2 rounded-[10px] border border-admin-border bg-admin-soft p-3">
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="text-admin-muted">{translateText("Member")}</span>
                <strong className="max-w-[68%] break-words text-right">{model.title}</strong>
              </div>
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="text-admin-muted">{translateText("Confirmed violations")}</span>
                <strong className="max-w-[68%] break-words text-right">{model.confirmedViolationCount}</strong>
              </div>
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="text-admin-muted">{translateText(selectedPenalty ? "Selected penalty" : automaticOutcome.exempted ? "Outcome" : "Automatic recommendation")}</span>
                <strong className="max-w-[68%] break-words text-right">
                  {translateText(outcome.label)}{outcome.durationDays ? ` · ${outcome.durationDays} ${translateText("days")}` : ""}
                </strong>
              </div>
            </div>
            {!automaticOutcome.exempted && (
              <fieldset className="grid gap-2 border-0 p-0" aria-required="true">
                <legend className="mb-1 font-semibold">{translateText("Penalty to apply")}</legend>
                {MEMBER_PENALTY_CHOICES.map((choice) => {
                  const choiceOutcome = memberPenaltyForChoice(model, choice);
                  return (
                    <label aria-label={translateText(choice)} className="flex cursor-pointer items-start gap-2 rounded-lg border border-admin-border bg-admin-surface p-3" key={choice}>
                      <input
                        className="mt-1 shrink-0 accent-current"
                        name="penalty"
                        type="radio"
                        value={choice}
                        checked={selectedPenalty === choice}
                        onChange={() => {
                          setSelectedPenalty(choice);
                          setValidationError(null);
                        }}
                      />
                      <span>
                        <strong className="block">{translateText(choice)}</strong>
                        <span className="text-sm text-admin-muted">
                          {choiceOutcome.durationDays ? `${choiceOutcome.durationDays} ${translateText("days")}` : translateText("Permanent")}
                          {choice === "Temporary ban" || choice === "Permanent ban" ? ` · ${translateText("Wallet Auto-Freeze")}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}
            <label htmlFor="member-penalty-reason">{translateText("Reason for confirmed violation")}</label>
            <textarea className="member-penalty-reason" id="member-penalty-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} />
            {(validationError || error) && <p className="field-error" role="alert">{translateText(validationError || error || "")}</p>}
          </div>
          <div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5">
            <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</Button>
            <Button variant="danger" type="submit" disabled={busy}>{busy ? translateText("Saving…") : translateText("Confirm violation")}</Button>
          </div>
        </form>
      </dialog>
    </AdminModalPortal>
  );
}

export function RemovePenaltyDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: { model: MemberModel; open: boolean; busy: boolean; error: string | null; translateText: (value: string) => string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setReason("");
      setValidationError(null);
    }
  }, [open, model.id]);
  if (!open) return null;
  return <AdminModalPortal open onClose={onCancel}><dialog open className="member-action-dialog" aria-modal="true" aria-label={translateText(`Remove penalty for ${model.title}`)}><form className="party-chat-modal penalty-modal flex max-h-[min(720px,90vh)] w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] bg-admin-surface shadow-admin" onSubmit={(event) => { event.preventDefault(); const value = reason.trim(); if (value.length < 8) { setValidationError("Enter at least 8 characters explaining the penalty removal."); return; } onConfirm(value); }}><div className="chat-modal-head"><div><strong>{translateText("Remove penalty")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close remove penalty form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body p-5"><p className="chat-intro -mt-[5px] mb-3 text-admin-muted">{translateText("Remove one active Mock penalty from this Member. The moderation history is retained and a reversal entry is recorded.")}</p><Card as="section" className="penalty-policy-note grid gap-1 rounded-[10px] border border-admin-border bg-admin-accent-soft p-3" aria-label={translateText("Current penalty")}><strong>{translateText("Current penalty")}</strong><span>{translateText("Confirmed violations")} {model.confirmedViolationCount ?? 0} · {translateText(memberStatusText(model))}</span></Card><label htmlFor="member-remove-penalty-reason">{translateText("Reason for removing the penalty")}</label><textarea id="member-remove-penalty-reason" name="reason" rows={4} minLength={8} maxLength={500} required value={reason} onChange={(event) => { setReason(event.target.value); setValidationError(null); }} />{(validationError || error) && <p className="field-error" role="alert">{translateText(validationError || error || "")}</p>}</div><div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5"><Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</Button><Button variant="danger" type="submit" disabled={busy}>{busy ? translateText("Saving…") : translateText("Remove penalty")}</Button></div></form></dialog></AdminModalPortal>;
}

export function NoteDialog({ model, open, busy, error, translateText, onCancel, onConfirm }: { model: MemberModel; open: boolean; busy: boolean; error: string | null; translateText: (value: string) => string; onCancel: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState("");
  useEffect(() => { if (open) setNote(""); }, [open, model.id]);
  if (!open) return null;
  return <AdminModalPortal open onClose={onCancel}><dialog open className="party-chat-overlay fixed inset-0 z-[90] m-0 grid h-full w-full max-w-none place-items-center rounded-none border-0 bg-transparent p-5 shadow-none max-[600px]:p-3" aria-modal="true" aria-label={translateText(`Add admin note for ${model.title}`)}><form className="party-chat-modal flex max-h-[min(720px,90vh)] w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] bg-admin-surface shadow-admin" onSubmit={(event) => { event.preventDefault(); if (note.trim().length < 4) return; onConfirm(note.trim()); }}><div className="chat-modal-head"><div><strong>{translateText("Add admin note")}</strong><small>{model.title} · {model.id}</small></div><button className="icon" type="button" aria-label={translateText("Close admin note form")} onClick={onCancel}><span className="close-lines" /></button></div><div className="dialog-body p-5"><label htmlFor="member-admin-note">{translateText("Internal note")}</label><textarea id="member-admin-note" name="note" rows={4} minLength={4} maxLength={500} required value={note} onChange={(event) => setNote(event.target.value)} />{error && <p className="field-error" role="alert">{translateText(error)}</p>}</div><div className="dialog-actions flex items-center justify-end gap-2 border-t border-admin-border bg-admin-soft px-5 py-3.5"><Button variant="outline" type="button" onClick={onCancel} disabled={busy}>{translateText("Cancel")}</Button><Button variant="primary" type="submit" disabled={busy || note.trim().length < 4}>{busy ? translateText("Saving…") : translateText("Save note")}</Button></div></form></dialog></AdminModalPortal>;
}
