import type { LegacyAdminRuntime, LegacyRecord } from "./runtime";

type DisputeRecord = LegacyRecord & {
  evidence: string[];
  other: string;
  person: string;
};

function isDisputeRecord(record: LegacyRecord | undefined): record is DisputeRecord {
  return Boolean(
    record
    && Array.isArray(record.evidence)
    && typeof record.other === "string"
    && typeof record.person === "string",
  );
}

function openEvidencePreview(document: Document, runtime: LegacyAdminRuntime, record: DisputeRecord, index: number): void {
  const evidence = record.evidence[index];
  if (!evidence) return;
  const parts = evidence.split(" · ");
  const preview = document.createElement("div");
  preview.className = "evidence-preview";
  preview.innerHTML = `<div class="evidence-preview-head"><div><strong>${parts[0]}</strong><small>Evidence ${index + 1} of ${record.evidence.length} · ${record.id}</small></div><button class="icon close-evidence" aria-label="Close evidence preview"><span class="close-lines"></span></button></div><div class="evidence-preview-body"><div class="preview-document">${runtime.icon(parts[0].toLowerCase().includes("image") ? "quest" : "clipboard")}<strong>${parts[0]}</strong><span>${parts.slice(1).join(" · ") || "Verified marketplace record"}</span></div><div class="facts"><div class="fact"><span>Submitted by</span><strong>${index % 2 ? record.other : record.person}</strong></div><div class="fact"><span>Integrity</span><strong>Original file verified</strong></div><div class="fact"><span>Attached to</span><strong>${record.id}</strong></div><div class="fact"><span>Review state</span><strong>Available for decision</strong></div></div><p class="audit-note">Synthetic preview. A production implementation would load the original secured file and record administrator access.</p></div>`;
  runtime.drawer.append(preview);
  requestAnimationFrame(() => preview.classList.add("open"));
  preview.querySelector<HTMLButtonElement>(".close-evidence")?.addEventListener("click", () => {
    preview.classList.remove("open");
    window.setTimeout(() => preview.remove(), 180);
  });
}

export function initializeDisputeInteractions(
  document: Document,
  runtime: LegacyAdminRuntime,
  openDisputeDrawer: (index: number) => void,
): (index: number) => void {
  return (index) => {
    openDisputeDrawer(index);
    const record = runtime.data.disputes[index];
    if (!isDisputeRecord(record)) return;

    runtime.drawer.querySelectorAll<HTMLButtonElement>(".evidence-item").forEach((button, evidenceIndex) => {
      button.addEventListener("click", () => openEvidencePreview(document, runtime, record, evidenceIndex));
    });
    runtime.drawer.querySelector<HTMLAnchorElement>(".quest-reference")?.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey) return;
    });
    runtime.drawer.querySelectorAll<HTMLElement>(".position").forEach((position) => {
      position.tabIndex = 0;
      position.setAttribute("role", "button");
      position.setAttribute("aria-label", "View participant statement details");
      position.addEventListener("click", () => runtime.toast(`Participant statement opened for ${record.id}`));
      position.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        position.click();
      });
    });
  };
}
