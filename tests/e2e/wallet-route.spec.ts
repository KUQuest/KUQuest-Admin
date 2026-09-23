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
    await expect(page.getByText("Member Wallet Summary", { exact: true })).toBeVisible();
    for (const label of ["Spending balance", "Earnings balance", "Funding reserved", "Payout reserved", "Total circulating"]) {
      await expect(page.locator(".wallet-funds-summary")).toContainText(label);
    }
    await expect(page.getByText("฿8,430.00", { exact: true })).toBeVisible();
    await expect(page.getByText("฿12,840.00", { exact: true })).toBeVisible();
    const walletTabs = page.locator('[aria-label="Wallet status filters"] [role="tab"]');
    await expect(walletTabs).toHaveCount(5);
    for (const tab of await walletTabs.all()) await expect(tab).toHaveText(/\(\d+\)$/);
    await expect(page.getByRole("button", { name: "Normal", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Temp Ban", exact: true })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-wallet-row]")).toHaveCount(10);
    await expect(page.locator('a[href*="/wallet/"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open Member Akarin Ariyawat" })).toHaveAttribute("href", "/member/68000000");
    expect(walletApiRequests).toBe(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Wallets" })).toBeVisible();
    await expect(page.locator("[data-wallet-row]")).toHaveCount(10);
  });

  test("keeps Wallet status filters and search separate from Member status", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    await page.getByRole("tab", { name: /^Frozen \(\d+\)$/ }).click();
    await expect(page.locator("[data-wallet-row]")).toHaveCount(10);
    await expect(page.getByText("WAL-1001", { exact: true })).toBeVisible();
    await expect(page.getByText("WAL-1002", { exact: true })).toHaveCount(0);

    await page.getByLabel("Search Wallets").fill("68000040");
    await expect(page.getByRole("heading", { level: 3, name: "No matching records" })).toBeVisible();
    await expect(page.getByText("Clear your search to see more results.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(page.locator("[data-wallet-row]")).toHaveCount(10);

    await page.getByRole("link", { name: "Open Member Akarin Ariyawat" }).click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
  });

  test("shows Closed Wallet records as terminal and display-only", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    await page.getByRole("tab", { name: /^Closed \(\d+\)$/ }).click();
    const closedRow = page.locator('[data-wallet-row="WAL-1004"]');
    await expect(closedRow).toBeVisible();
    await expect(closedRow.locator('[data-wallet-status="CLOSED"]')).toHaveText("Closed");

    await closedRow.getByRole("button", { name: "Open Wallet WAL-1004" }).click();
    const drawer = page.locator("dialog.wallet-drawer");
    await expect(drawer.getByText("Closed is terminal. No Wallet status change is available.", { exact: true })).toBeVisible();
    await expect(drawer.locator("[data-wallet-status-action]")).toHaveCount(0);
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
    await expect(page.getByText("Ledger check", { exact: true })).toHaveCount(0);
    const drawerContent = page.locator("dialog.wallet-drawer .admin-drawer-content");
    const horizontalOverflow = await drawerContent.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
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

  test("supports the mock Wallet Freeze, Suspend, and Restore workflow", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    await page.getByRole("button", { name: "Open Wallet WAL-1002" }).click();
    const drawer = page.locator("dialog.wallet-drawer");
    await expect(drawer.getByText("Wallet balances", { exact: true })).toBeVisible();

    await drawer.getByRole("button", { name: "Freeze Wallet" }).click();
    const freezeDialog = page.getByRole("dialog", { name: "Freeze Wallet" });
    await expect(freezeDialog).toBeVisible();
    const freezeBounds = await freezeDialog.boundingBox();
    const viewport = page.viewportSize();
    expect(freezeBounds).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (freezeBounds && viewport) {
      expect(Math.abs(freezeBounds.x + freezeBounds.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
    }
    await expect(freezeDialog).toContainText("Existing Escrow, Assignments, and in-progress Payouts continue");
    await expect(freezeDialog).toContainText("does not change the Member Ban");
    await freezeDialog.getByLabel("Reason for this decision").fill("Temporary hold pending Member review.");
    await freezeDialog.getByRole("button", { name: "Freeze Wallet", exact: true }).click();

    await expect(freezeDialog).toHaveCount(0);
    await expect(drawer.getByText("Action receipt", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Frozen", { exact: true })).toBeVisible();

    await drawer.getByRole("button", { name: "Suspend Wallet" }).click();
    const suspendDialog = page.getByRole("dialog", { name: "Suspend Wallet" });
    await suspendDialog.getByLabel("Reason for this decision").fill("Escalate to an administrative review.");
    await suspendDialog.getByRole("button", { name: "Suspend Wallet", exact: true }).click();
    await expect(suspendDialog).toHaveCount(0);
    await expect(drawer.getByText("Suspended", { exact: true })).toBeVisible();

    await drawer.getByRole("button", { name: "Restore Wallet to ACTIVE" }).click();
    const restoreDialog = page.getByRole("dialog", { name: "Restore Wallet to ACTIVE" });
    await expect(restoreDialog).toContainText("Student-initiated Wallet operations are permitted again.");
    await restoreDialog.getByLabel("Reason for this decision").fill("Review complete; restore normal Wallet access.");
    await restoreDialog.getByRole("button", { name: "Restore Wallet to ACTIVE", exact: true }).click();
    await expect(restoreDialog).toHaveCount(0);
    await expect(drawer.locator(".wallet-record").getByText("Active", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Wallet status history", { exact: true })).toBeVisible();
  });

  test("shows mock command error and stale Wallet version states without changing status", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    await page.getByRole("button", { name: "Open Wallet WAL-1005" }).click();
    const drawer = page.locator("dialog.wallet-drawer");
    await expect(drawer.getByText("Wallet balances", { exact: true })).toBeVisible();
    await drawer.getByRole("button", { name: "Freeze Wallet" }).click();

    const commandDialog = page.getByRole("dialog", { name: "Freeze Wallet" });
    await commandDialog.getByLabel("Reason for this decision").fill("Test the command error state.");
    await commandDialog.getByLabel("Mock response fixture").selectOption("error");
    await commandDialog.getByRole("button", { name: "Freeze Wallet", exact: true }).click();
    await expect(commandDialog).toBeVisible();
    await expect(commandDialog.getByRole("alert")).toContainText("No status was changed");
    await expect(drawer.locator(".wallet-record").getByText("Active", { exact: true })).toBeVisible();

    await commandDialog.getByLabel("Mock response fixture").selectOption("stale-version");
    await commandDialog.getByRole("button", { name: "Freeze Wallet", exact: true }).click();
    await expect(commandDialog.getByRole("alert")).toContainText("Wallet status is stale");
    await expect(drawer.locator(".wallet-record").getByText("Active", { exact: true })).toBeVisible();
  });

  test("keeps Wallet Statement pagination and filters on the canonical Member route", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000000?tab=wallet-statement");

    const statement = page.locator("[data-user-wallet-statement]");
    await expect(statement.locator(".wallet-statement-table tbody tr")).toHaveCount(25);
    await expect(statement.getByRole("button", { name: "Load more" })).toBeVisible();

    await statement.getByRole("button", { name: "Load more" }).click();
    await expect(statement.locator(".wallet-statement-table tbody tr")).toHaveCount(50);

    await statement.getByLabel("Event type").selectOption("TOP_UP");
    await statement.getByRole("button", { name: "Apply filters" }).click();
    await expect(statement.locator(".wallet-statement-table tbody tr")).toHaveCount(11);
  });

  test("does not create a Wallet detail route", async ({ page }) => {
    await signIn(page);
    const response = await page.request.get("/wallet/WAL-1001");
    expect(response.status()).toBe(404);
  });
});
