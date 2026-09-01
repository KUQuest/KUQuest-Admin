import { adminApi, type EvidenceReference } from "../api/admin-api";
import type { LegacyAdminRuntime, LegacyRecord } from "./runtime";

export function evidenceReferenceFor(
  record: Pick<LegacyRecord, "evidenceRefs">,
  index: number,
): EvidenceReference | null {
  const reference = record.evidenceRefs?.[index];
  return typeof reference === "string" && reference.trim() ? reference : null;
}

function appendText(
  document: Document,
  parent: HTMLElement,
  tagName: string,
  value: string,
  className?: string,
): HTMLElement {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

function contextText(context: unknown): string {
  if (typeof context === "string") return context;
  if (context === undefined || context === null) return "No evidence context was returned.";
  try {
    return JSON.stringify(context, null, 2) || "No evidence context was returned.";
  } catch {
    return "The evidence context could not be displayed.";
  }
}

export async function openEvidenceReference(
  document: Document,
  runtime: LegacyAdminRuntime,
  reference: EvidenceReference,
  label = "Evidence",
): Promise<void> {
  const cleanReference = reference.trim();
  if (!cleanReference) {
    runtime.toast("This record has no Evidence Reference.");
    return;
  }

  runtime.closeActiveLayer();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay evidence-viewer-overlay";
  const modal = document.createElement("section");
  modal.className = "party-chat-modal evidence-viewer";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", `${label} ${cleanReference}`);

  const header = document.createElement("div");
  header.className = "chat-modal-head";
  const heading = document.createElement("div");
  appendText(document, heading, "strong", label);
  appendText(document, heading, "small", "Read-only case evidence");
  const closeButton = document.createElement("button");
  closeButton.className = "icon close-evidence-reference";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close evidence viewer");
  const closeLines = document.createElement("span");
  closeLines.className = "close-lines";
  closeButton.append(closeLines);
  header.append(heading, closeButton);

  const body = document.createElement("div");
  body.className = "utility-preview-body evidence-viewer-body";
  appendText(document, body, "p", "Loading evidence…", "evidence-viewer-state");
  const referenceRow = document.createElement("p");
  referenceRow.className = "audit-note";
  appendText(document, referenceRow, "strong", "Evidence Reference: ");
  appendText(document, referenceRow, "span", cleanReference);
  body.append(referenceRow);
  const context = document.createElement("pre");
  context.className = "evidence-context";
  body.append(context);

  modal.append(header, body);
  overlay.append(modal);
  const close = runtime.showModalLayer(overlay, {
    initialFocus: ".close-evidence-reference",
  });
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  try {
    const evidence = await adminApi.getEvidence(cleanReference);
    const state = body.querySelector<HTMLElement>(".evidence-viewer-state");
    if (state) state.textContent = "Evidence loaded.";
    context.textContent = contextText(evidence.context);
    if (evidence.expiresAt) {
      appendText(document, body, "p", `Access expires: ${evidence.expiresAt}`, "audit-note");
    }
  } catch {
    const state = body.querySelector<HTMLElement>(".evidence-viewer-state");
    if (state) state.textContent = "Evidence could not be loaded.";
    context.textContent = "The Admin API did not return this Evidence Reference.";
    runtime.toast("Evidence could not be loaded.");
  }
}
