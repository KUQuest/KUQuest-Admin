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

    await main.locator("tbody tr[data-report-id]").first().getByRole("button", { name: /Open Report Case/ }).click();
    await expect(page).toHaveURL(/\/report\/RPT-8201$/);
    await expect(page.locator("#report-main")).toBeVisible();
    await expect(page.locator("dialog.drawer.open")).toBeVisible();
    const drawer = page.locator("dialog.drawer.open");
    await expect(drawer.getByRole("heading", { name: "Report overview", exact: true })).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "Decision context", exact: true })).toHaveCount(0);
    await expect(drawer.getByRole("heading", { name: "Member moderation context", exact: true })).toBeVisible();
    await expect(drawer.locator(".moderation-case-history")).toContainText("Reported Member");
    await expect(drawer.getByRole("heading", { name: "Report detail", exact: true })).toHaveCount(0);
    await expect(drawer.getByRole("heading", { name: "People involved", exact: true })).toBeVisible();
    const sectionHeadings = await drawer.locator(".moderation-case-workspace > section h3").allTextContents();
    expect(sectionHeadings).toEqual([
      "Report overview",
      "Evidence",
      "Related Quest",
      "People involved",
      "Member moderation context",
      "Report decision",
    ]);
    await expect(drawer.locator('.moderation-case-workspace a:not([data-slot="button"])')).toHaveCount(0);
    const drawerActions = drawer.locator(".report-case-drawer-detail > .admin-drawer-actions");
    await expect(drawerActions).toHaveCSS("position", "sticky");
    await expect(drawerActions.locator("a, button")).toHaveCount(2);

    await page.goBack();
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);

    await main.locator("tbody tr[data-report-id]").first().getByRole("button", { name: /Open Report Case/ }).click();
    await expect(page.locator("dialog.drawer.open")).toBeVisible();

    await page.getByRole("button", { name: "Close drawer" }).click();
    await expect(page).toHaveURL(/\/report$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);
  });

  test("Open filter shows only Report Cases pending Admin review", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");

    const main = page.locator("#report-main");
    const openTab = main.getByRole("tab", { name: /^Open/ });
    await openTab.click();
    await expect(openTab).toHaveAttribute("aria-selected", "true");

    const statuses = await main.locator("tbody tr[data-report-id] td:nth-child(6) .badge").allTextContents();
    expect(statuses.length).toBeGreaterThan(0);
    expect(new Set(statuses.map((status) => status.trim()))).toEqual(new Set(["Open"]));
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

  test("keeps full-page danger actions readable", async ({ page }) => {
    await signIn(page);
    await page.goto("/report/RPT-8411");

    const closeButton = page.getByRole("button", { name: "Close report", exact: true });
    await expect(closeButton).toBeVisible();
    await expect(closeButton).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(closeButton).toHaveCSS("min-height", "40px");
    await expect(closeButton).toHaveCSS("border-width", "1px");
    await expect(closeButton).toHaveCSS("font-weight", "600");
    const actionTextStyle = await closeButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return { fontFamily: style.fontFamily, fontWeight: style.fontWeight };
    });
    expect(actionTextStyle.fontFamily).toContain("Figtree");
    expect(actionTextStyle.fontWeight).toBe("600");
  });

  test("gives clear feedback when no decision is selected and centers the confirmation form", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");
    await page.locator('tbody tr[data-report-id="RPT-8201"]').getByRole("button", { name: "Open Report Case RPT-8201" }).click();

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
    await page.locator("tbody tr[data-report-id]").first().getByRole("button", { name: /Open Report Case/ }).click();

    await page.getByRole("link", { name: "Open full Report Case" }).click();
    await expect(page).toHaveURL(/\/report\/RPT-8201$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Report against Amara Ariyawat" })).toBeVisible();
  });

  test("keeps keyboard focus in the Report Case drawer and restores the row on close", async ({ page }) => {
    await signIn(page);
    await page.goto("/report");

    const main = page.locator("#report-main");
    const opener = main.locator('tbody tr[data-report-id="RPT-8201"]')
      .getByRole("button", { name: "Open Report Case RPT-8201" });
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
