import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Report Case routes", () => {
  test("keeps Report Cases separate and opens a route-aware drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");

    const main = page.locator("#report-main");
    await expect(main.getByRole("heading", { level: 1, name: "Report Cases" })).toBeVisible();
    await expect(main.locator("tbody tr[data-report-id]")).toHaveCount(10);
    await expect(main.getByText("Conduct Report", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(main.getByRole("heading", { level: 1, name: "Report Cases" })).toBeVisible();
    await expect(main.locator("tbody tr[data-report-id]")).toHaveCount(10);

    await main.locator("tbody tr[data-report-id]").first().click();
    await expect(page).toHaveURL(/\/report\/RPT-8201$/);
    await expect(page.locator("#report-main")).toBeVisible();
    await expect(page.locator("dialog.drawer.open")).toBeVisible();
    const drawer = page.locator("dialog.drawer.open");
    await expect(drawer.getByText("Report detail", { exact: true })).toBeVisible();
    await expect(drawer.locator(".moderation-case-workspace a:not(.btn)")).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);

    await main.locator("tbody tr[data-report-id]").first().click();
    await expect(page.locator("dialog.drawer.open")).toBeVisible();

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

  test("gives clear feedback when no decision is selected and centers the confirmation form", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");
    await page.locator('tbody tr[data-report-id="RPT-8201"]').click();

    const drawer = page.getByRole("dialog", { name: "Report Case details" });
    const closeButton = drawer.getByRole("button", { name: "Close report", exact: true });
    await closeButton.click();
    await expect(drawer.getByRole("alert")).toHaveText("Choose No violation or Confirm violation before closing.");
    await expect(drawer.getByLabel("No violation")).toBeFocused();

    await drawer.getByLabel("No violation").check();
    await closeButton.click();
    const decision = page.locator("dialog.report-decision-dialog");
    await expect(decision).toBeVisible();
    const box = await decision.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs((box!.x + box!.width / 2) - viewport!.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs((box!.y + box!.height / 2) - viewport!.height / 2)).toBeLessThanOrEqual(1);
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

  test("keeps keyboard focus in the Report Case drawer and restores the row on close", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");

    const main = page.locator("#report-main");
    const opener = main.locator('tbody tr[data-report-id="RPT-8201"]');
    await opener.click();

    const drawer = page.getByRole("dialog", { name: "Report Case details" });
    await expect(drawer).toBeVisible();
    await expect(main).toHaveAttribute("inert", "");
    await expect(drawer).toBeFocused();

    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press("Tab");
      await expect.poll(() => page.evaluate(() => {
        const active = document.activeElement;
        const openDrawer = document.querySelector("dialog.drawer.open");
        return Boolean(active && openDrawer?.contains(active));
      })).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(main).not.toHaveAttribute("inert");
    await expect(opener).toBeFocused();
  });
});
