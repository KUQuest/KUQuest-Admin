import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Member route family", () => {
  test("renders the Member board and opens a soft detail drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/member");

    const board = page.locator("#member-main");
    await expect(board.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
    await expect(board.locator("tbody tr[data-member-id]")).toHaveCount(10);
    await expect(board.getByRole("searchbox", { name: "Search Members" })).toBeVisible();
    await page.reload();
    await expect(board.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
    await expect(board.locator("tbody tr[data-member-id]")).toHaveCount(10);

    const headers = await board.locator("thead th").allTextContents();
    expect(headers).toEqual([
      "Member ID↕",
      "Member↕",
      "Student ID↕",
      "Academic profile↕",
      "Status↕",
      "Wallet status↕",
    ]);
    const demoSearch = board.getByRole("searchbox", { name: "Search Members" });
    await demoSearch.fill("Demo Member 01");
    const demoRow = board.locator("tbody tr[data-member-id]").first();
    await expect(demoRow.locator("td").nth(0)).toHaveText("68000100");
    await expect(demoRow.locator("td").nth(2)).toHaveText("6510200100");
    await demoSearch.fill("");

    const opener = board.getByRole("button", { name: "Open Member 68000000" });
    await opener.click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    const drawer = page.getByRole("dialog", { name: "68000000" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Akarin Ariyawat");
    await expect(drawer.locator("[data-member-drawer-moderation-history]")).toContainText("Moderation History");
    await page.goBack();
    await expect(page).toHaveURL(/\/member$/);
    await expect(drawer).toHaveCount(0);

    await opener.click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await expect(drawer).toBeVisible();

    await drawer.getByRole("button", { name: "Close Member drawer" }).click();
    await expect(page).toHaveURL(/\/member$/);
    await expect(drawer).toHaveCount(0);

    await opener.click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await expect(drawer).toBeVisible();

    await drawer.getByRole("link", { name: "See full Member profile" }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.locator(".user-detail-page")).toBeVisible();
    await page.goto("/member");
  });

  test("sorts Member records by column in both directions", async ({ page }) => {
    await signIn(page);
    await page.goto("/member");

    const board = page.locator("#member-main");
    const memberIdSort = board.getByRole("button", { name: /^Member ID/ });
    await expect(memberIdSort).toBeVisible();
    await memberIdSort.click();
    await expect(board.locator("tbody tr[data-member-id]").first()).toHaveAttribute("data-member-id", "68000000");
    await expect(board.locator("thead th").first()).toHaveAttribute("aria-sort", "ascending");
    await memberIdSort.click();
    await expect(board.locator("tbody tr[data-member-id]").first()).toHaveAttribute("data-member-id", "68000299");
    await expect(board.locator("thead th").first()).toHaveAttribute("aria-sort", "descending");
  });

  test("renders a full Member detail page on refresh and keeps tabs canonical", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000000");

    await expect(page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Member detail sections" });
    await expect(tabs.getByRole("link", { name: "Wallet Statement", exact: true })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Penalty History", exact: true })).toBeVisible();

    await tabs.getByRole("link", { name: "Wallet Statement", exact: true }).click();
    await expect(page).toHaveURL(/\/member\/68000000\?tab=wallet-statement$/);
    await expect(page.locator("[data-user-wallet-statement]")).toBeVisible();
    await expect(page.locator("[data-user-wallet-statement] .wallet-statement-table tbody tr")).toHaveCount(25);
    await page.goBack();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await expect(page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" })).toBeVisible();
  });

  test("keeps Member actions usable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto("/member/68000000");
    await page.getByRole("button", { name: "Record violation" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Confirm violation for Akarin Ariyawat" });
    await expect(dialog).toBeVisible();
    const reason = dialog.getByRole("textbox", { name: "Reason for confirmed violation" });
    await reason.fill("The evidence confirms a policy violation.");
    await expect(reason).toHaveValue("The evidence confirms a policy violation.");
    const box = await reason.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(390);
    await dialog.getByRole("button", { name: "Confirm violation" }).click();
    await expect(page.locator(".user-counter-list")).toContainText("1");
    await expect(page.locator(".user-summary-name")).toContainText("Flag");
  });

  test("shows mock moderation history, related cases, and submitted reports", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000020?tab=penalty-history");

    const history = page.locator("[data-member-moderation-history]");
    await expect(history).toBeVisible();
    await expect(history).toContainText("Fixture data for UI review");
    await expect(history.getByRole("link", { name: "RPT-8201" })).toHaveAttribute("href", "/report/RPT-8201");
    await expect(page.getByRole("heading", { name: "Admin Notes" })).toBeVisible();
    await expect(page.getByText("Evidence Reference", { exact: false })).toBeVisible();

    await page.goto("/member/68000020?tab=reports");
    await expect(page.getByRole("heading", { name: "Reports received" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reports submitted" })).toBeVisible();
  });

  test("keeps Member board language controls available", async ({ page }) => {
    await signIn(page);
    await page.goto("/member");
    await page.getByRole("button", { name: "ไทย", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "สมาชิก" })).toBeVisible();
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
  });
});
