import { expect, it } from "bun:test";

const languageSource = await Bun.file("src/features/admin/legacy/language.ts").text();
const functionalControlsSource = await Bun.file("src/features/admin/legacy/functional-controls.ts").text();
const renderedActionSources = (
  await Promise.all([
    Bun.file("public/legacy/quest-page.js").text(),
    Bun.file("public/legacy/quest-detail.js").text(),
    Bun.file("public/legacy/script.js").text(),
    Bun.file("public/legacy/quest-change-review.js").text(),
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
