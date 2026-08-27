function openUtilityPreview(title, content) {
  activeCustomLayerClose?.();
  const overlay = document.createElement("div");
  overlay.className = "party-chat-overlay utility-preview";
  overlay.innerHTML = `<section class="party-chat-modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="chat-modal-head"><div><strong>${title}</strong><small>KuQuest admin preview</small></div><button class="icon close-utility-preview" aria-label="Close preview"><span class="close-lines"></span></button></div><div class="utility-preview-body">${content}</div></section>`;
  const close = showModalLayer(overlay, {
    initialFocus: ".close-utility-preview",
  });
  overlay.querySelector(".close-utility-preview").onclick = close;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

function downloadMockFile(name, content, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  toast(`${name} downloaded.`);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (
    !button ||
    button.disabled ||
    button.dataset.action ||
    button.dataset.chatUser
  )
    return;
  const label = button.textContent.trim();
  if (button.matches(".file-row, .evidence-item")) {
    event.preventDefault();
    const previewImage = button.querySelector("img");
    openUtilityPreview(
      button.querySelector("strong")?.textContent || "Attached file",
      `${previewImage ? `<img class="utility-image-preview" src="${previewImage.currentSrc || previewImage.src}" alt="${previewImage.alt}">` : ""}<p>${button.querySelector("small")?.textContent || "This synthetic file is available for review."}</p><p class="audit-note">Production would display the secured original and record administrator access.</p>`,
    );
  }
  if (button.matches(".related-row")) {
    event.preventDefault();
    openUtilityPreview(
      button.querySelector("strong")?.textContent || "Record detail",
      `<p>${button.querySelector("small")?.textContent || "Related marketplace record"}</p>`,
    );
  }
  if (label === "View accepted terms") {
    event.preventDefault();
    openUtilityPreview(
      "Accepted terms",
      "<p>The accepted scope, wage, schedule, and completion conditions are the governing record for this quest.</p>",
    );
  }
  if (label === "Compare versions") {
    event.preventDefault();
    openUtilityPreview(
      "Terms version history",
      "<p>Version 3 is the accepted record. Earlier edits remain available in the quest audit history.</p>",
    );
  }
  if (label === "Download all") {
    event.preventDefault();
    downloadMockFile(
      "kuquest-proof-records.txt",
      "Synthetic proof-record export",
    );
  }
  if (label === "Export log" || label === "Export CSV") {
    event.preventDefault();
    downloadMockFile(
      "kuquest-admin-export.csv",
      "record,action,status\nsynthetic,exported,complete\n",
      "text/csv",
    );
  }
  if (label === "Revision history") {
    event.preventDefault();
    openUtilityPreview(
      "Money policy revisions",
      "<p>Revision 12 is active. The audit history preserves its effective date, author, and reason.</p>",
    );
  }
  if (label === "Open user profile" || label === "View user") {
    event.preventDefault();
    openUtilityPreview(
      "User profile",
      "<p>This synthetic profile is connected to the selected marketplace record. Use the Users board to review status, moderation actions, and the private message history.</p>",
    );
  }
  if (label === "Request clarification") {
    event.preventDefault();
    toast("Clarification request saved to the hirer-change audit trail.");
  }
  if (button.getAttribute("aria-label") === "Notifications") {
    event.preventDefault();
    toast("You have 3 items needing admin attention.");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "activity-search") return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll(".activity li").forEach((item) => {
    item.hidden =
      Boolean(query) && !item.textContent.toLowerCase().includes(query);
  });
});
