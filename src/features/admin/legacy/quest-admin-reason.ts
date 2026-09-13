import type { AdminDisputeReasonCode, AdminQuestReasonCode } from "../api/admin-api";

export type AdminReasonCode = AdminQuestReasonCode | AdminDisputeReasonCode;

const reasonCodes: Array<[AdminQuestReasonCode, string]> = [
  ["POLICY_REVIEW", "Policy review"],
  ["SAFETY_REVIEW", "Safety review"],
];

const disputeReasonCodes: Array<[AdminDisputeReasonCode, string]> = [
  ["DISPUTE_POLICY_REVIEW", "Policy review"],
  ["DISPUTE_EVIDENCE_REVIEW", "Evidence review"],
];

export function isQuestModerationAction(action: string): boolean {
  return action === "Hide quest" || action === "Restore quest" || action === "Terminate quest";
}

export function setupQuestReasonCode(
  document: Document,
  action: string,
  liveApi: boolean,
): HTMLSelectElement | null {
  document.querySelector<HTMLElement>("#quest-reason-code-field")?.remove();
  document.querySelector<HTMLElement>("#dispute-reason-code-field")?.remove();
  const isDisputeResolution = action === "Confirm dispute resolution";
  if (!liveApi || !isQuestModerationAction(action) && !isDisputeResolution) return null;

  const fieldId = isDisputeResolution ? "dispute-reason-code-field" : "quest-reason-code-field";
  const selectId = isDisputeResolution ? "dispute-reason-code" : "quest-reason-code";
  const helpId = isDisputeResolution ? "dispute-reason-code-help" : "quest-reason-code-help";
  const options = isDisputeResolution ? disputeReasonCodes : reasonCodes;

  const field = document.createElement("label");
  field.id = fieldId;
  field.htmlFor = selectId;
  field.append("Reason code ");
  if (action !== "Restore quest") {
    const requiredMark = document.createElement("span");
    requiredMark.setAttribute("aria-hidden", "true");
    requiredMark.textContent = "*";
    field.append(requiredMark);
  }

  const select = document.createElement("select");
  select.id = selectId;
  select.name = "reasonCode";
  select.setAttribute("aria-describedby", helpId);
  select.required = isDisputeResolution || action !== "Restore quest";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = action === "Restore quest" ? "No reason code" : "Select a reason code";
  select.append(placeholder);
  options.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
  field.append(select);

  const help = document.createElement("small");
  help.id = helpId;
  help.textContent = isDisputeResolution
    ? "Required by the API Server for Dispute Case resolution."
    : action === "Restore quest"
    ? "Optional. This value is stored by the API Server when provided."
    : "Required by the API Server for Quest moderation.";
  field.append(help);

  const reasonLabel = document.querySelector<HTMLLabelElement>('label[for="confirm-reason"]');
  reasonLabel?.before(field);
  return select;
}
