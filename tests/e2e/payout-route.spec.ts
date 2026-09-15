import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Payout App Router route family", () => {
  test("renders the default review queue and reads route data on the server", async ({ page }) => {
    let payoutApiRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/admin/payouts")) payoutApiRequests += 1;
    });

    await signIn(page);
    await page.goto("/payout");

    await expect(page.getByRole("heading", { level: 1, name: "Payouts" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Needs review/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Open Payout PAY-9637" })).toBeVisible();
    await expect(page.getByText("PAY-9638", { exact: true })).toHaveCount(0);
    expect(payoutApiRequests).toBe(0);
  });

  test("preserves full Payout detail parity between direct page and drawer", async ({ page }) => {
    const sharedDetailValues = [
      "Mali S.",
      "mali.s@ku.th",
      "quote-pay-9637",
      "฿1,250.00",
      "•••• 9637",
      "••••",
    ];

    await signIn(page);
    await page.goto("/payout/PAY-9637");

    await expect(page.getByRole("heading", { level: 1, name: "PAY-9637" })).toBeVisible();
    for (const section of ["Payout summary", "Payout amounts", "Payout Destination", "Payout timing", "Why your approval is needed", "Payout history"]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }
    await expect(page.getByText("PAY-9636", { exact: true })).toBeVisible();
    for (const value of sharedDetailValues) {
      await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("•••• 9637", { exact: true })).toBeVisible();
    await expect(page.getByText("Full Payout detail", { exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "PAY-9637" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payout timing" })).toBeVisible();

    await page.goto("/payout");
    const trigger = page.getByRole("link", { name: "Open Payout PAY-9637" });
    await trigger.click();
    await expect(page).toHaveURL(/\/payout\/PAY-9637$/);
    const drawer = page.getByRole("dialog", { name: "PAY-9637" });
    await expect(drawer).toBeVisible();
    const drawerBox = await drawer.boundingBox();
    const viewport = page.viewportSize();
    expect(drawerBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(drawerBox!.x).toBeGreaterThan(viewport!.width / 2);
    expect(drawerBox!.x + drawerBox!.width).toBe(viewport!.width);
    await expect(drawer.getByRole("link", { name: "Full Payout detail" })).toBeVisible();
    for (const section of ["Payout summary", "Payout amounts", "Payout Destination", "Payout timing", "Why your approval is needed", "Payout history"]) {
      await expect(drawer.getByRole("heading", { name: section })).toBeVisible();
    }
    await expect(drawer.getByText("PAY-9636", { exact: true })).toBeVisible();
    for (const value of sharedDetailValues) {
      await expect(drawer.getByText(value, { exact: true }).first()).toBeVisible();
    }

    const closeButton = drawer.getByRole("button", { name: "Close Payout detail" });
    const fullDetailLink = drawer.getByRole("link", { name: "Full Payout detail" });
    await fullDetailLink.focus();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    await closeButton.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(fullDetailLink).toBeFocused();

    await closeButton.click();
    await expect(page).toHaveURL(/\/payout$/);
    await expect(page.getByRole("dialog", { name: "PAY-9637" })).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(page.getByRole("dialog", { name: "PAY-9637" })).toBeVisible();
    await page.locator(".scrim").click({ position: { x: 10, y: 10 } });
    await expect(page).toHaveURL(/\/payout$/);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(page.getByRole("dialog", { name: "PAY-9637" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/payout$/);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(page.getByRole("dialog", { name: "PAY-9637" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/payout$/);
    await expect(page.getByRole("dialog", { name: "PAY-9637" })).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("opens the separate full Payout page from its drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout");

    await page.getByRole("link", { name: "Open Payout PAY-9637" }).click();
    const drawer = page.getByRole("dialog", { name: "PAY-9637" });
    await expect(drawer).toBeVisible();

    await drawer.getByRole("link", { name: "Full Payout detail" }).click();
    await expect(page).toHaveURL(/\/payout\/PAY-9637$/);
    await expect(page.getByRole("heading", { level: 1, name: "PAY-9637" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "PAY-9637" })).toHaveCount(0);
  });

  test("keeps Payout approval and rejection requirements in the command dialogs", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout/PAY-9637");

    await page.getByRole("button", { name: "Approve Payout" }).click();
    const approval = page.getByRole("dialog", { name: "Approve Payout" });
    await expect(approval.getByRole("button", { name: "Approve Payout" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(approval).toHaveCount(0);

    await page.getByRole("button", { name: "Approve Payout" }).click();
    const reopenedApproval = page.getByRole("dialog", { name: "Approve Payout" });
    await reopenedApproval.getByLabel(/Reason code/).selectOption("PAYOUT_POLICY_REVIEW");
    await expect(reopenedApproval.getByRole("button", { name: "Approve Payout" })).toBeEnabled();
    await reopenedApproval.getByRole("button", { name: "Approve Payout" }).click();
    await expect(page).toHaveURL(/\/payout\/PAY-9637$/);
    const payoutSummary = page.getByRole("heading", { name: "Payout summary" }).locator("..");
    await expect(payoutSummary.getByText("Sent", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Transfer submitted" })).toBeVisible();

    await page.goto("/payout/PAY-9637");
    await page.getByRole("button", { name: "Reject Payout" }).click();
    const rejection = page.getByRole("dialog", { name: "Reject Payout" });
    await expect(rejection.getByRole("button", { name: "Reject Payout" })).toBeDisabled();
    await rejection.getByLabel(/Reason code/).selectOption("PAYOUT_INVALID_DESTINATION");
    await expect(rejection.getByRole("button", { name: "Reject Payout" })).toBeEnabled();
    await rejection.getByRole("button", { name: "Reject Payout" }).click();
    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payout rejected" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject Payout" })).toHaveCount(0);
  });

  test("does not show an unsupported Provider command in mock mode", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout/PAY-9638");

    await expect(page.getByRole("button", { name: "Reconcile with provider" })).toHaveCount(0);
  });
});
