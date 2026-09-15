import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Report Case routes", () => {
  test("keeps Report Cases separate and opens a route-aware drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");

    const main = page.locator("#report-main");
    await expect(main.getByRole("heading", { level: 1, name: "Report Cases" })).toBeVisible();
    await expect(main.locator("tbody tr[data-report-id]")).toHaveCount(2);
    await expect(main.getByText("Conduct Report", { exact: true })).toHaveCount(0);

    await main.locator("tbody tr[data-report-id]").first().click();
    await expect(page).toHaveURL(/\/report\/RPT-8201$/);
    await expect(page.locator("#report-main")).toBeVisible();
    await expect(page.locator("dialog.drawer.open")).toBeVisible();
    await expect(page.locator("dialog.drawer.open").getByText("Report detail", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Close drawer" }).click();
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);
  });

  test("renders direct detail, canonical Member links, and the decision command", async ({ page }) => {
    await signIn(page);
    await page.goto("/report/RPT-8201");
    await page.reload();

    await expect(page.getByRole("heading", { level: 1, name: "Report against Amara Ariyawat" })).toBeVisible();
    await expect(page.locator(".report-page-alert")).toBeVisible();
    await expect(page.locator('a[href="/member/68000020"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/users/"]')).toHaveCount(0);

    await page.getByLabel("No violation").check();
    await page.getByRole("button", { name: "Close report" }).first().click();
    const dialog = page.locator("dialog.report-decision-dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Reason for this decision").fill("No policy violation found.");
    await dialog.getByRole("button", { name: "Confirm decision" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator(".report-page-alert .badge")).toHaveText("Dismissed");
  });

  test("opens the full Report Case page from the drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");
    await page.locator("tbody tr[data-report-id]").first().click();

    await page.getByRole("link", { name: "Open full Report Case" }).click();
    await expect(page).toHaveURL(/\/report\/RPT-8201$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Report against Amara Ariyawat" })).toBeVisible();
  });
});
