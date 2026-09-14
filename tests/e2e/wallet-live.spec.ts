import { expect, test, type Page } from "@playwright/test";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the live Wallet browser test.`);
  return value;
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("University email").fill(requiredEnvironment("LIVE_ADMIN_EMAIL"));
  await page.getByLabel("Password").fill(requiredEnvironment("LIVE_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
}

test("renders Wallet data and the Wallet Statement through the live Admin API", async ({ page }) => {
  await signIn(page);
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
  expect(statementHref).toMatch(/^\/member\/[^/]+\/wallet-statement$/);

  await statementLink.click();
  await expect(page).toHaveURL(statementHref!);
  await expect(page.getByRole("heading", { level: 1, name: "Wallet Statement" })).toBeVisible();
  await expect(page.getByText("Every committed and sealed Ledger Transaction for this Wallet, newest first.", { exact: true })).toBeVisible();
});
