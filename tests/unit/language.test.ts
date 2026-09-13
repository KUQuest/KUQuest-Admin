import { expect, it } from "bun:test";

const languageSource = await Bun.file(
  "src/features/admin/legacy/language.ts",
).text();
const functionalControlsSource = await Bun.file(
  "src/features/admin/legacy/functional-controls.ts",
).text();
const renderedActionSources = (
  await Promise.all([
    Bun.file("src/features/admin/legacy/quest-page.ts").text(),
    Bun.file("src/features/admin/legacy/quest-detail.ts").text(),
    Bun.file("src/features/admin/legacy/script.ts").text(),
    Bun.file("src/features/admin/legacy/quest-change-review.ts").text(),
  ])
).join("\n");

it("translates the functional control labels used by the interface", () => {
  for (const label of [
    "View accepted terms",
    "Compare versions",
    "Download all",
    "Export log",
    "Export CSV",
    "Revision history",
    "Request clarification",
  ]) {
    expect(languageSource).toContain(`"${label}"`);
  }
});

it("includes Thai labels for the Dashboard and current Payout statuses", () => {
  for (const label of [
    "Wallets",
    "Showing",
    "latest dispute/report records",
    "Wallet status",
    "Failed",
    "Needs review",
    "Sent",
    "Paid",
    "Permanent all-quest ban",
    "No activity recorded",
    "Administrative activity will appear here as actions are taken.",
  ]) {
    expect(languageSource).toContain(label);
  }
  expect(languageSource).toContain("latest dispute\\/report records");
});

it("includes Thai descriptions for Reports, Conduct Reports, and Activity log", () => {
  for (const description of [
    "Review reports about Message or Attachment content.",
    "Review Member behavior on Quests.",
    "An audit trail of administrative decisions.",
  ]) {
    expect(languageSource).toContain(description);
  }
});

it("includes Thai labels for every canonical status displayed by Admin", () => {
  for (const status of [
    "Dismissed",
    "Resolved",
    "Restored",
    "Confirmed",
    "Frozen",
    "Suspended",
    "Temp Ban",
    "Perm Ban",
    "QUEST_DRAFT",
    "QUEST_OPEN",
    "QUEST_ASSIGNED",
    "QUEST_IN_PROGRESS",
    "QUEST_COMPLETED",
    "QUEST_CANCELLED",
    "QUEST_FAILED",
    "DISPUTE_CASE_PENDING",
    "DISPUTE_CASE_DISMISSED",
    "DISPUTE_CASE_RESOLVED",
    "REPORT_CASE_PENDING",
    "REPORT_CASE_DISMISSED",
    "REPORT_CASE_HIDDEN",
    "REPORT_CASE_RESTORED",
    "CONDUCT_REPORT_PENDING",
    "CONDUCT_REPORT_UPHELD",
    "CONDUCT_REPORT_DISMISSED",
    "PENDING_ADMIN_APPROVAL",
    "SUBMITTED_TO_PROVIDER",
    "PROVIDER_PENDING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
    "ACTIVE",
    "FROZEN",
    "SUSPENDED",
    "CLOSED",
  ]) {
    const sourceKey = status.includes(" ") ? `"${status}":` : `${status}:`;
    expect(languageSource).toContain(sourceKey);
  }
});

it("uses stable functional action identifiers instead of localized labels", () => {
  expect(functionalControlsSource).toContain("button.dataset.functionalAction");
  expect(languageSource).toContain("functionalActionLabels");
  expect(languageSource).toContain("dataset.functionalAction = action");
  for (const action of [
    "view-accepted-terms",
    "compare-versions",
    "download-all",
    "export-log",
    "export-csv",
    "revision-history",
    "request-clarification",
  ]) {
    expect(functionalControlsSource).toContain(`"${action}"`);
  }
  expect(renderedActionSources).toContain('data-functional-action="download-all"');
});

it("translates only changed subtrees in a batched mutation callback", () => {
  expect(languageSource).toContain("requestAnimationFrame");
  expect(languageSource).toContain("record.addedNodes");
  expect(languageSource).not.toContain("new MutationObserver(() => translateDocument())");
});
