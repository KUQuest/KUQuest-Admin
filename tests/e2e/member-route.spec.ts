import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Member route family", () => {
  test("renders the Member board and opens a soft detail drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/member");

    const board = page.locator("#member-main");
    await expect(board.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
    await expect(board.locator("tbody tr[data-member-id]")).toHaveCount(3);
    await expect(board.getByRole("searchbox", { name: "Search Members" })).toBeVisible();

    await board.getByRole("button", { name: "Open Member 68000000" }).click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await expect(page.getByRole("dialog", { name: "Record details" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Record details" })).toContainText("Akarin Ariyawat");

    await page.getByRole("dialog", { name: "Record details" }).getByRole("link", { name: "See full Member profile" }).click();
    await expect(page.getByRole("dialog", { name: "Record details" })).toHaveCount(0);
    await expect(page.locator(".user-detail-page")).toBeVisible();
    await page.goto("/member");
  });

  test("renders a full Member detail page on refresh and keeps tabs canonical", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000000");

    await expect(page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Member detail sections" });
    await expect(tabs.getByRole("link", { name: "Wallet Statement", exact: true })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Penalty History", exact: true })).toBeVisible();

    await tabs.getByRole("link", { name: "Wallet Statement", exact: true }).click();
    await expect(page).toHaveURL(/\/member\/68000000\?tab=wallet-statement$/);
    await expect(page.locator("[data-user-wallet-statement]")).toBeVisible();
    await expect(page.locator("[data-user-wallet-statement] .wallet-statement-table tbody tr")).toHaveCount(25);
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
    await expect(page.locator(".user-detail-side-column")).toContainText("Red Flag");
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
