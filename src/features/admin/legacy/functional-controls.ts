import type { LegacyAdminRuntime } from "./runtime";

const initializedDocuments = new WeakSet<Document>();

function openUtilityPreview(
  document: Document,
  runtime: LegacyAdminRuntime,
  title: string,
  content: string,
): void {
  runtime.closeActiveLayer();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay utility-preview";
  overlay.innerHTML = `<section class="party-chat-modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="chat-modal-head"><div><strong>${title}</strong><small>KuQuest admin preview</small></div><button class="icon close-utility-preview" aria-label="Close preview"><span class="close-lines"></span></button></div><div class="utility-preview-body">${content}</div></section>`;
  const close = runtime.showModalLayer(overlay, { initialFocus: ".close-utility-preview" });
  overlay.querySelector<HTMLButtonElement>(".close-utility-preview")?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

function downloadMockFile(runtime: LegacyAdminRuntime, name: string, content: string, type = "text/plain"): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  runtime.toast(`${name} downloaded.`);
}

export function initializeFunctionalControls(document: Document, runtime: LegacyAdminRuntime): void {
  if (initializedDocuments.has(document)) return;
  initializedDocuments.add(document);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button");
    if (!button || button.disabled || button.dataset.action || button.dataset.chatUser) return;

    const action = button.dataset.functionalAction;
    if (button.matches(".file-row, .evidence-item")) {
      event.preventDefault();
      const previewImage = button.querySelector("img");
      openUtilityPreview(
        document,
        runtime,
        button.querySelector("strong")?.textContent || "Attached file",
        `${previewImage ? `<img class="utility-image-preview" src="${previewImage.currentSrc || previewImage.src}" alt="${previewImage.alt}">` : ""}<p>${button.querySelector("small")?.textContent || "This synthetic file is available for review."}</p><p class="audit-note">Production would display the secured original and record administrator access.</p>`,
      );
    }
    if (button.matches(".related-row")) {
      event.preventDefault();
      openUtilityPreview(document, runtime, button.querySelector("strong")?.textContent || "Record detail", `<p>${button.querySelector("small")?.textContent || "Related marketplace record"}</p>`);
    }
    if (action === "view-accepted-terms") {
      event.preventDefault();
      openUtilityPreview(document, runtime, "Accepted terms", "<p>The accepted scope, wage, schedule, and completion conditions are the governing record for this quest.</p>");
    }
    if (action === "compare-versions") {
      event.preventDefault();
      openUtilityPreview(document, runtime, "Terms version history", "<p>Version 3 is the accepted record. Earlier edits remain available in the quest audit history.</p>");
    }
    if (action === "download-all") {
      event.preventDefault();
      downloadMockFile(runtime, "kuquest-proof-records.txt", "Synthetic proof-record export");
    }
    if (action === "export-log" || action === "export-csv") {
      event.preventDefault();
      downloadMockFile(runtime, "kuquest-admin-export.csv", "record,action,status\nsynthetic,exported,complete\n", "text/csv");
    }
    if (action === "revision-history") {
      event.preventDefault();
      openUtilityPreview(document, runtime, "Money policy revisions", "<p>Revision 12 is active. The audit history preserves its effective date, author, and reason.</p>");
    }
    if (action === "open-user-profile" || action === "view-user") {
      event.preventDefault();
      openUtilityPreview(document, runtime, "User profile", "<p>This synthetic profile is connected to the selected marketplace record. Use the Users board to review status, moderation actions, and the private message history.</p>");
    }
    if (action === "request-clarification") {
      event.preventDefault();
      runtime.toast("Clarification request saved to the hirer-change audit trail.");
    }
    if (action === "notifications") {
      event.preventDefault();
      runtime.toast("You have 3 items needing admin attention.");
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.id !== "activity-search") return;
    const query = target.value.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>(".activity li").forEach((item) => {
      item.hidden = Boolean(query) && !item.textContent?.toLowerCase().includes(query);
    });
  });
}
