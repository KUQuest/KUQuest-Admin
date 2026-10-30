import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

const liveAdminEmail = process.env.LIVE_ADMIN_EMAIL;
const liveAdminPassword = process.env.LIVE_ADMIN_PASSWORD;
const liveAdminCredentials = {
  email: liveAdminEmail ?? "",
  password: liveAdminPassword ?? "",
};

test.skip(
  !liveAdminCredentials.email || !liveAdminCredentials.password,
  "Set LIVE_ADMIN_EMAIL and LIVE_ADMIN_PASSWORD to run the live Wallet browser test.",
);

test("renders Wallet data and the Wallet Statement through the live Admin API", async ({ page }) => {
  await signIn(page, liveAdminCredentials);
  await page.goto("/wallet");

  await expect(page.getByRole("heading", { level: 1, name: "Wallets" })).toBeVisible();
  const walletRows = page.locator("[data-wallet-row]");
  await expect(walletRows.first()).toBeVisible();
  await expect(page.locator('a[href*="/wallet/"]')).toHaveCount(0);

  const opener = page.getByRole("button", { name: /Open Wallet / }).first();
  await opener.click();
  const drawer = page.locator("dialog.wallet-drawer");
  await expect(drawer).toBeVisible();

  const statementLink = drawer.getByRole("link", { name: "See Wallet Statement" });
  await expect(statementLink).toBeVisible();
  const statementHref = await statementLink.getAttribute("href");
  expect(statementHref).toMatch(/^\/member\/[^/?]+\?tab=wallet-statement$/);

  await statementLink.click();
  await expect(page).toHaveURL(statementHref!);
  await expect(page.getByRole("heading", { name: "Wallet Statement" })).toBeVisible();
  await expect(page.getByText("Committed and sealed Ledger Transactions affecting this Wallet.", { exact: true })).toBeVisible();
});
