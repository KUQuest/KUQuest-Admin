import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Conduct Report routes", () => {
  test("opens the full Conduct Report page from the drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/conduct-report");

    await page.locator('tbody tr[data-conduct-report-id="CND-8301"]').click();
    await expect(page.getByRole("dialog", { name: "Conduct Report details" })).toBeVisible();

    const drawer = page.locator("dialog.drawer.open");
    await expect(drawer.getByRole("heading", { name: "Decision context", exact: true })).toHaveCount(0);
    const sectionHeadings = await drawer.locator(".moderation-case-workspace > section h3").allTextContents();
    expect(sectionHeadings).toEqual([
      "Conduct Report overview",
      "Evidence",
      "Related Quest",
      "Member moderation context",
      "Conduct Report decision",
    ]);
    await expect(drawer.getByText("Assignment accepted · Proof Submission not provided · dueAt 27 Aug 2026 15:00", { exact: true })).toBeVisible();
    await expect(drawer.getByText("QST-12001", { exact: true })).toBeVisible();
    const parties = drawer.locator(".conduct-report-overview-parties");
    await expect(parties.getByText("Reported Member", { exact: true })).toBeVisible();
    await expect(parties.getByText("Reported by", { exact: true })).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "People involved", exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: "Open full Conduct Report" }).click();

    await expect(page).toHaveURL(/\/conduct-report\/CND-8301$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Abandoned work" })).toBeVisible();

    const grid = page.locator(".conduct-report-detail-body > .grid");
    await expect(grid).toBeVisible();
    await expect(grid).toHaveCSS("display", "grid");
    const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.split(" ")).toHaveLength(2);
    await expect(page.locator(".conduct-report-detail [data-moderation-case-workspace='context']")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Related Quest", exact: true })).toBeVisible();
    const relatedQuest = page.locator(".conduct-report-detail-body > .grid > aside .related-quest-panel");
    await expect(relatedQuest).toContainText("Quest State");
    await expect(relatedQuest).toContainText("Failed at");
    await expect(page.getByRole("heading", { name: "Reported Member", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Conduct Report timeline", exact: true })).toBeVisible();
    await expect(page.locator(".conduct-report-detail .conduct-report-overview")).toContainText("CND-8301");
    await expect(page.locator(".conduct-report-detail .conduct-report-overview")).toContainText("Akarin Ariyawat");
    await expect(page.locator(".conduct-report-detail-body > .grid > div:first-child")).toContainText("Assignment accepted · Proof Submission not provided · dueAt 27 Aug 2026 15:00");
    await expect(relatedQuest).toContainText("QST-12001");
    await expect(page.getByText("Assignment accepted · Proof Submission not provided · dueAt 27 Aug 2026 15:00", { exact: true })).toBeVisible();
  });
});
