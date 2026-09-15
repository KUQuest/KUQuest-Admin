import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Wallet App Router board", () => {
  test("renders Wallet data without a client API read or fake Wallet detail link", async ({ page }) => {
    let walletApiRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/admin/wallets")) walletApiRequests += 1;
    });

    await signIn(page);
    await page.goto("/wallet");

    await expect(page.getByRole("heading", { level: 1, name: "Wallets" })).toBeVisible();
    await expect(page.getByText("Total Wallet Funds", { exact: true })).toBeVisible();
    await expect(page.getByText("฿12,840.00", { exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Wallet status filters"] button')).toHaveText(["All (5)", "Active", "Frozen", "Suspended", "Closed"]);
    await expect(page.getByRole("button", { name: "Normal", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Temp Ban", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /All/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-wallet-row]")).toHaveCount(5);
    await expect(page.locator('a[href*="/wallet/"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open Member Akarin Ariyawat" })).toHaveAttribute("href", "/member/68000000");
    expect(walletApiRequests).toBe(0);
  });

  test("keeps Wallet status filters and search separate from Member status", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    await page.getByRole("button", { name: "Frozen" }).click();
    await expect(page.locator("[data-wallet-row]")).toHaveCount(1);
    await expect(page.getByText("WAL-1001", { exact: true })).toBeVisible();
    await expect(page.getByText("WAL-1002", { exact: true })).toHaveCount(0);

    await page.getByLabel("Search Wallets").fill("68000040");
    await expect(page.getByRole("heading", { level: 2, name: "No matching records" })).toBeVisible();
    await expect(page.getByText("Clear your search to see more results.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(page.locator("[data-wallet-row]")).toHaveCount(5);

    await page.getByRole("link", { name: "Open Member Akarin Ariyawat" }).click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
  });

  test("opens the Wallet drawer and closes it by scrim or Escape", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    const opener = page.getByRole("button", { name: "Open Wallet WAL-1001" });
    await page.locator('[data-wallet-row="WAL-1001"] td').nth(3).click();
    await expect(page.locator("dialog.wallet-drawer")).toBeVisible();
    await page.locator("dialog.wallet-drawer").getByRole("button", { name: "Close Wallet detail" }).click();

    await opener.click();
    await expect(page.locator("dialog.wallet-drawer")).toBeVisible();
    await expect(page.getByText("Wallet balances", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "See Wallet Statement" })).toHaveAttribute("href", "/member/68000000?tab=wallet-statement");
    await page.locator("button.scrim").click({ position: { x: 8, y: 8 } });
    await expect(page.locator("dialog.wallet-drawer")).toHaveCount(0);
    await expect(opener).toBeFocused();

    await opener.click();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog.wallet-drawer")).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("opens the Wallet Statement tab from the drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    await page.getByRole("button", { name: "Open Wallet WAL-1001" }).click();
    await page.getByRole("link", { name: "See Wallet Statement" }).click();

    await expect(page).toHaveURL("/member/68000000?tab=wallet-statement");
    await expect(page.getByRole("heading", { name: "Wallet Statement" })).toBeVisible();
    await expect(page.getByText("Committed and sealed Ledger Transactions affecting this Wallet.", { exact: true })).toBeVisible();
  });

  test("does not create a Wallet detail route", async ({ page }) => {
    await signIn(page);
    const response = await page.request.get("/wallet/WAL-1001");
    expect(response.status()).toBe(404);
  });
});
