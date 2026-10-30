import { expect, test } from "@playwright/test";

test("shows a recoverable error when the first Wallet page fails", async ({ context, page }) => {
  await page.goto("/login");
  await context.addCookies([{
    name: "kuquest-admin",
    value: "test-session",
    domain: "localhost",
    path: "/",
  }]);

  await page.goto("/wallet");
  await expect(page.getByRole("heading", { level: 1, name: "Wallets" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Wallet records are not available." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator("[data-wallet-row]")).toHaveCount(0);
});
