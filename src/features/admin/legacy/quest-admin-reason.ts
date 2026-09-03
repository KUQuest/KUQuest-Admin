import type { AdminQuestReasonCode } from "../api/admin-api";

const reasonCodes: Array<[AdminQuestReasonCode, string]> = [
  ["POLICY_REVIEW", "Policy review"],
  ["SAFETY_REVIEW", "Safety review"],
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
  if (!liveApi || !isQuestModerationAction(action)) return null;

  const field = document.createElement("label");
  field.id = "quest-reason-code-field";
  field.htmlFor = "quest-reason-code";
  field.append("Reason code ");
  if (action !== "Restore quest") {
    const requiredMark = document.createElement("span");
    requiredMark.setAttribute("aria-hidden", "true");
    requiredMark.textContent = "*";
    field.append(requiredMark);
  }

  const select = document.createElement("select");
  select.id = "quest-reason-code";
  select.name = "reasonCode";
  select.setAttribute("aria-describedby", "quest-reason-code-help");
  select.required = action !== "Restore quest";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = action === "Restore quest" ? "No reason code" : "Select a reason code";
  select.append(placeholder);
  reasonCodes.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
  field.append(select);

  const help = document.createElement("small");
  help.id = "quest-reason-code-help";
  help.textContent = action === "Restore quest"
    ? "Optional. This value is stored by the API Server when provided."
    : "Required by the API Server for Quest moderation.";
  field.append(help);

  const reasonLabel = document.querySelector<HTMLLabelElement>('label[for="confirm-reason"]');
  reasonLabel?.before(field);
  return select;
}
