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
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Payouts" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Payout PAY-9637" })).toBeVisible();
    expect(payoutApiRequests).toBe(0);
  });

  test("keeps shared Payout values with page-specific sections", async ({ page }) => {
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
    await expect(page.locator(".payout-page-alert")).toContainText("Payout approval is required");
    await expect(page.locator(".payout-record-status-bar")).toBeVisible();
    await expect(page.locator(".payout-detail-page .payout-detail-stack .section")).toHaveCount(5);
    for (const section of ["Payout summary", "Payout amounts", "Payout Destination", "Payout history"]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Payout timing" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Why your approval is needed" })).toHaveCount(0);
    await expect(page.getByText("Occurred at", { exact: true })).toBeVisible();
    await expect(page.getByText("Payout version", { exact: true })).toHaveCount(0);
    for (const amountField of ["Maximum fee", "Maximum tax", "Maximum debit"]) {
      await expect(page.getByText(amountField, { exact: true })).toHaveCount(0);
    }
    for (const amountField of ["Actual fee", "Actual tax", "Actual debit"]) {
      await expect(page.getByText(amountField, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Payout amounts" }).locator("..").getByText("Not provided", { exact: true })).toHaveCount(0);
    await expect(page.getByText("PAY-9636", { exact: true })).toBeVisible();
    for (const value of sharedDetailValues) {
      await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("•••• 9637", { exact: true })).toBeVisible();
    await expect(page.getByText("Full Payout detail", { exact: true })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "PAY-9637" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payout timing" })).toHaveCount(0);

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
    expect(drawerBox!.x).toBeGreaterThanOrEqual(viewport!.width / 2);
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
    const approveButton = drawer.getByRole("button", { name: "Approve Payout" });
    await fullDetailLink.focus();
    await page.keyboard.press("Tab");
    await expect(approveButton).toBeFocused();
    await approveButton.focus();
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

  test("keeps Payout decision actions visible while reviewing the detail drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout");
    await page.getByRole("link", { name: "Open Payout PAY-9637" }).click();

    const drawer = page.getByRole("dialog", { name: "PAY-9637" });
    const actionBar = drawer.locator(":scope > .drawer-actions");
    const approveButton = actionBar.getByRole("button", { name: "Approve Payout" });
    const rejectButton = actionBar.getByRole("button", { name: "Reject Payout" });

    await expect(actionBar).toBeVisible();
    await expect(approveButton).toBeInViewport();
    await expect(rejectButton).toBeInViewport();

    await drawer.locator(":scope > .drawer-body").evaluate((body) => {
      body.scrollTop = body.scrollHeight;
    });
    await expect(approveButton).toBeInViewport();
    await expect(rejectButton).toBeInViewport();
  });

  test("does not require a reason code to approve a Payout", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout/PAY-9637");

    await page.getByRole("button", { name: "Approve Payout" }).click();
    const approval = page.getByRole("dialog", { name: "Approve Payout" });
    await expect(approval.getByLabel(/Reason code/)).toHaveCount(0);
    await expect(approval.getByRole("button", { name: "Approve Payout" })).toBeEnabled();
    await approval.getByRole("button", { name: "Approve Payout" }).click();
    await expect(page).toHaveURL(/\/payout\/PAY-9637$/);
    const payoutSummary = page.getByRole("heading", { name: "Payout summary" }).locator("xpath=ancestor::section[1]");
    await expect(payoutSummary.getByText("Sent", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Transfer submitted" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Payout summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Transfer submitted" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payout summary" }).locator("xpath=ancestor::section[1]").getByText("Sent", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve Payout" })).toHaveCount(0);

  });

  test("opens the Payout decision dialog before submitting", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout/PAY-9637");

    await page.getByRole("button", { name: "Approve Payout" }).click();
    await expect(page.getByRole("dialog", { name: "Approve Payout" })).toBeVisible();
  });

  test("keeps a Mock Payout approval in the drawer and board", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout");
    await page.getByRole("link", { name: "Open Payout PAY-9700" }).click();

    const drawer = page.getByRole("dialog", { name: "PAY-9700" });
    await drawer.getByRole("button", { name: "Approve Payout" }).click();
    await page.getByRole("dialog", { name: "Approve Payout" }).getByRole("button", { name: "Approve Payout" }).click();
    await expect(drawer.getByRole("heading", { name: "Transfer submitted" })).toBeVisible();
    await expect(drawer.locator(".admin-action-receipt")).toHaveCSS("display", "block");
    await expect(drawer.getByRole("link", { name: "Full Payout detail" })).toBeVisible();

    await drawer.getByRole("button", { name: "Close Payout detail" }).click();
    await expect(page).toHaveURL(/\/payout$/);
    await page.getByRole("button", { name: /Sent/ }).click();
    await page.getByPlaceholder("Search Payouts…").fill("PAY-9700");
    await expect(page.locator(".table-wrap").getByText("Sent", { exact: true })).toBeVisible();
  });

  test("keeps Payout rejection requirements in the command dialog", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout/PAY-9637");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Reject Payout" })).toBeVisible();

    await page.getByRole("button", { name: "Reject Payout" }).click();
    const rejection = page.getByRole("dialog", { name: "Reject Payout" });
    await expect(rejection.getByRole("button", { name: "Reject Payout" })).toBeDisabled();
    await rejection.getByLabel(/Reason code/).selectOption("PAYOUT_INVALID_DESTINATION");
    await rejection.getByLabel(/Reason \*/).fill("The destination details do not match the verified Member record.");
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

  test("supports a large review queue and shows Student Payout history", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout");

    const reviewRows = page.locator("tbody .payout-row");
    await expect(reviewRows).toHaveCount(10);

    await page.getByRole("button", { name: "Show 50" }).click();
    await expect(reviewRows).toHaveCount(50);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(reviewRows).not.toHaveCount(0);

    await page.getByRole("button", { name: "Show all" }).click();
    expect(await reviewRows.count()).toBeGreaterThanOrEqual(51);

    await page.goto("/payout/PAY-9700");
    const payoutHistory = page.getByRole("heading", { name: "Payout history" }).locator("xpath=ancestor::section[1]");
    for (const payoutId of ["PAY-9701", "PAY-9702", "PAY-9703"]) {
      await expect(payoutHistory.getByText(payoutId, { exact: true })).toBeVisible();
    }

    await page.goto("/payout");
    await page.locator("button.tab").filter({ hasText: "All" }).click();
    await page.getByPlaceholder("Search Payouts…").fill("PAY-9703");
    await page.getByRole("link", { name: "Open Payout PAY-9703" }).click();
    const payoutTiming = page.getByRole("dialog", { name: "PAY-9703" }).getByRole("heading", { name: "Payout timing" }).locator("xpath=ancestor::section[1]");
    for (const status of ["Needs review", "Sent", "Processing", "Paid"]) {
      await expect(payoutTiming.getByText(status, { exact: true }).first()).toBeVisible();
    }
  });
});
