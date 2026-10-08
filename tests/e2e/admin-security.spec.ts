import { expect, test, type BrowserContext } from "@playwright/test";

async function addAdminCookie(context: BrowserContext, value: string) {
  await context.addCookies([{
    name: "kuquest-admin.session_token",
    value,
    domain: "localhost",
    path: "/",
  }]);
}

test.describe("Admin session and private-route boundary", () => {
  test("redirects an Admin without a Session to login", async ({ page }) => {
    await page.goto("/wallet");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to admin" })).toBeVisible();
  });

  test("redirects an invalid Admin Session to login", async ({ context, page }) => {
    await addAdminCookie(context, "invalid-session");
    await page.goto("/wallet");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to admin" })).toBeVisible();
  });

  test("renders Forbidden for a disabled Admin", async ({ context, page }) => {
    await addAdminCookie(context, "disabled-session");
    await page.goto("/wallet");

    await expect(page).toHaveURL(/\/wallet$/);
    await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
    await expect(page.getByText("This Admin account is disabled")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wallets" })).toHaveCount(0);
  });

  test("loads Activity Log records through the Admin API", async ({ context, page }) => {
    await addAdminCookie(context, "valid-session");
    await page.goto("/activity");

    const main = page.locator("#activity-main");
    await expect(main.getByRole("heading", { level: 1, name: "Activity Log" })).toBeVisible();
    await expect(main.locator("tbody tr")).toHaveCount(2);
    await expect(main.locator("tbody tr").first()).toContainText("Quest Hidden");

    await main.getByLabel("Search loaded activity").fill("PAYOUT_APPROVED");
    await expect(main.locator("tbody tr")).toHaveCount(1);
    await expect(main.locator("tbody tr").first()).toContainText("Payout Approved");

    await expect(main.getByLabel("Action filter")).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Apply filters" })).toHaveCount(0);
    await main.getByLabel("Search loaded activity").fill("");
    await expect(main.locator("tbody tr")).toHaveCount(2);
    const opener = main.getByRole("button", { name: "View activity details" }).first();
    await opener.focus();
    await opener.click();
    const detail = page.getByRole("dialog", { name: "Activity log entry" });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("Policy Review");
    await expect(detail.locator(".activity-log-note")).toContainText("Decision note returned by the Admin API fixture.");
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(opener).toBeFocused();
    const legacyOpener = main.getByRole("button", { name: "View activity details" }).nth(1);
    await legacyOpener.click();
    await expect(detail).toBeVisible();
    await expect(detail.locator(".activity-log-note")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);

    await opener.click();
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: "Close", exact: true }).last().click();
    await expect(detail).toHaveCount(0);

    await opener.click();
    await expect(detail).toBeVisible();
    await page.reload();
    await expect(page.locator("#activity-main")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Activity log entry" })).toHaveCount(0);
  });

  test("opens and closes a Top-up detail drawer from the table", async ({ context, page }) => {
    await addAdminCookie(context, "valid-session");
    await page.goto("/top-ups");

    const opener = page.getByRole("button", { name: "Open Top-up TOP-1001" });
    await expect(opener).toBeVisible();
    await opener.click();

    const drawer = page.getByRole("dialog", { name: "TOP-1001" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("฿1,000.00");
    await expect(drawer).toContainText("provider-ref-1001");

    await drawer.getByRole("button", { name: "Close Top-up detail" }).click();
    await expect(drawer).toHaveCount(0);
    await expect(opener).toBeFocused();

    const row = page.locator('[data-top-up-row="00000000-0000-4000-8000-000000001001"]');
    await row.locator("td").nth(2).click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(row).toBeFocused();

    await row.focus();
    await page.keyboard.press("Enter");
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(row).toBeFocused();
  });
  test("shows Member-scoped Admin profile records without visible UUIDs", async ({ context, page }) => {
    await addAdminCookie(context, "valid-session");
    const memberId = "00000000-0000-4000-8000-000000000101";
    await page.goto(`/member/${memberId}`);
    const main = page.locator(".user-detail-page");

    await expect(main.getByText("MEM-000101", { exact: true })).toBeVisible();
    await expect(main.getByText("Communication", { exact: true })).toBeVisible();
    await expect(main.getByText("Research Assistant", { exact: true })).toBeVisible();
    await expect(main.getByText("First Aid", { exact: true })).toBeVisible();
    await expect(main.getByText("PAY-000101", { exact: true })).toBeVisible();
    await expect(main.getByText("****1234", { exact: false })).toBeVisible();

    await main.getByRole("link", { name: "Activity", exact: true }).click();
    await expect(main.getByText("QST-000101", { exact: true })).toBeVisible();
    await main.getByRole("link", { name: "Reviews", exact: true }).click();
    await expect(main.getByText("Reviewer One", { exact: false })).toBeVisible();
    await main.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(main.getByText("RPT-000101", { exact: true })).toBeVisible();
    await expect(main.getByText("RPT-000102", { exact: true })).toBeVisible();
    await main.getByRole("link", { name: "Penalty History", exact: true }).click();
    const penaltyHistory = main.locator("[data-member-moderation-history]");
    await expect(penaltyHistory.getByText("Red Flag", { exact: true }).first()).toBeVisible();
    await expect(penaltyHistory.getByText("Penalty reversal", { exact: true })).toBeVisible();
    await expect(penaltyHistory).not.toContainText(/[A-Z]+_[A-Z]+/);
    await main.getByRole("link", { name: "Wallet Statement", exact: true }).click();
    await expect(main.getByText("LED-000101", { exact: true })).toBeVisible();

    const visibleText = await page.locator("body").innerText();
    const internalIds = [
      memberId,
      "00000000-0000-4000-8000-000000000201",
      "00000000-0000-4000-8000-000000000301",
      "00000000-0000-4000-8000-000000000401",
      "00000000-0000-4000-8000-000000000501",
      "00000000-0000-4000-8000-000000000601",
      "00000000-0000-4000-8000-000000000701",
    ];
    for (const id of internalIds) expect(visibleText).not.toContain(id);
  });

  test("sends Add and Remove penalty commands from the Member profile", async ({ context, page }) => {
    await addAdminCookie(context, "valid-session");
    const memberId = "00000000-0000-4000-8000-000000000101";
    const effectiveRecordId = "e0c58c66-267a-4a4d-b133-6d78a4a5a101";
    const addedPenaltyRecordId = "d8d415a4-9df2-4bd5-8f8c-83a2b0a1a101";
    let historyVersionToken = 10;
    let addedPenaltyHistoryItem: Record<string, unknown> | null = null;
    let removeReversalHistoryItem: Record<string, unknown> | null = null;
    const requests: { action: string; expectedVersionToken: number }[] = [];

    await page.route(/\/api\/v1\/admin\/members\/[^/]+\/penalty-history(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      const history = payload.data;
      history.versionToken = historyVersionToken;
      if (addedPenaltyHistoryItem) history.items.unshift(addedPenaltyHistoryItem);
      if (removeReversalHistoryItem) {
        const removedPenalty = history.items.find((item: { recordId: string }) => item.recordId === effectiveRecordId);
        if (removedPenalty) {
          removedPenalty.isEffective = false;
          removedPenalty.isEffectiveActiveMisconductPenalty = false;
          removedPenalty.reversal = {
            relation: "REVERSED_BY",
            sequenceNumber: removedPenalty.sequenceNumber,
            result: "PENALTY_REVERSAL",
            createdAt: "2026-09-15T08:30:00.000Z",
          };
        }
        history.items.unshift(removeReversalHistoryItem);
      }
      history.confirmedMisconductCount = 10 + (addedPenaltyHistoryItem ? 1 : 0);
      history.totalCount = history.items.length;
      await route.fulfill({ response, body: JSON.stringify(payload) });
    });

    await page.route(/\/api\/v1\/admin\/members\/[^/]+\/penalty-actions\/(add|remove)$/, async (route) => {
      const request = route.request();
      const origin = request.headers().origin ?? "http://localhost:3006";
      const corsHeaders = {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": origin,
      };

      if (request.method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            ...corsHeaders,
            "access-control-allow-headers": "content-type,idempotency-key",
            "access-control-allow-methods": "POST, OPTIONS",
          },
        });
        return;
      }

      const action = new URL(request.url()).pathname.endsWith("/add") ? "add" : "remove";
      const requestBody = request.postDataJSON();
      requests.push({ action, expectedVersionToken: requestBody.expectedVersionToken });
      if (requestBody.expectedVersionToken !== historyVersionToken) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: { code: "PENALTY_HISTORY_STALE", message: "Penalty History changed." } }),
        });
        return;
      }

      historyVersionToken += 1;
      const command = action === "add"
        ? {
            kind: "ADD",
            outcome: "ADDED",
            recordId: addedPenaltyRecordId,
            commandRecordId: addedPenaltyRecordId,
            result: "PENALTY_RED_FLAG",
            versionToken: historyVersionToken,
          }
        : {
            kind: "REMOVE",
            outcome: "REMOVED",
            recordId: effectiveRecordId,
            commandRecordId: "d8d415a4-9df2-4bd5-8f8c-83a2b0a1a103",
            result: "PENALTY_REVERSAL",
            versionToken: historyVersionToken,
          };
      if (action === "add") {
        addedPenaltyHistoryItem = {
          recordId: addedPenaltyRecordId,
          ladder: "MISCONDUCT",
          source: "ADMIN",
          sourceDisplayId: null,
          sequenceNumber: 11,
          result: "PENALTY_RED_FLAG",
          actor: { type: "ADMIN", displayName: "Test Admin" },
          reasonCode: "MEMBER_PENALTY_VIOLATION_CONFIRMED",
          adminNote: "Confirmed after review.",
          createdAt: "2026-09-14T08:30:00.000Z",
          reviewRating: null,
          isEffective: true,
          isEffectiveActiveMisconductPenalty: true,
          reversal: null,
          recalculatedFrom: null,
          replacedBy: null,
        };
      } else {
        removeReversalHistoryItem = {
          recordId: "d8d415a4-9df2-4bd5-8f8c-83a2b0a1a103",
          ladder: "MISCONDUCT",
          source: "ADMIN",
          sourceDisplayId: null,
          sequenceNumber: 10,
          result: "PENALTY_REVERSAL",
          actor: { type: "ADMIN", displayName: "Test Admin" },
          reasonCode: "MEMBER_PENALTY_NEW_EVIDENCE",
          adminNote: "New evidence changes the decision.",
          createdAt: "2026-09-15T08:30:00.000Z",
          reviewRating: null,
          isEffective: false,
          isEffectiveActiveMisconductPenalty: false,
          reversal: { relation: "REVERSAL_OF", sequenceNumber: 10, result: "PENALTY_RED_FLAG", createdAt: "2026-09-13T08:30:00.000Z" },
          recalculatedFrom: null,
          replacedBy: null,
        };
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: { command } }),
      });
    });

    await page.goto(`/member/${memberId}?tab=penalty-history`);
    const main = page.locator(".user-detail-page");
    await expect(main.getByRole("heading", { name: "Moderation History", exact: true })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await main.getByRole("button", { name: "Record violation", exact: true }).click();
    const addDialog = page.getByRole("dialog", { name: "Record violation" });
    await expect(addDialog).toBeVisible();
    await addDialog.locator('input[name="penaltyResult"][value="PENALTY_RED_FLAG"]').check();
    await addDialog.getByLabel(/Reason code/).selectOption("MEMBER_PENALTY_VIOLATION_CONFIRMED");
    await addDialog.getByLabel(/Admin note/).fill("Confirmed after review.");

    const addRequestPromise = page.waitForRequest((request) => (
      request.method() === "POST" && request.url().endsWith("/penalty-actions/add")
    ));
    await addDialog.getByRole("button", { name: "Record violation", exact: true }).click();
    const addRequest = await addRequestPromise;
    expect(addRequest.postDataJSON()).toEqual({
      expectedVersionToken: 10,
      result: "PENALTY_RED_FLAG",
      reasonCode: "MEMBER_PENALTY_VIOLATION_CONFIRMED",
      adminNote: "Confirmed after review.",
    });
    expect(addRequest.headers()["idempotency-key"]).toMatch(/^admin-member-penalty-add-/);
    await expect(main.getByText("Violation recorded.", { exact: true })).toBeVisible();

    await main.getByRole("button", { name: "Remove penalty", exact: true }).click();
    const removeDialog = page.getByRole("dialog", { name: "Remove penalty" });
    await expect(removeDialog).toBeVisible();
    await removeDialog.locator(`input[name="recordId"][value="${effectiveRecordId}"]`).check();
    await removeDialog.getByLabel(/Reason code/).selectOption("MEMBER_PENALTY_NEW_EVIDENCE");
    await removeDialog.getByLabel(/Admin note/).fill("New evidence changes the decision.");

    const removeRequestPromise = page.waitForRequest((request) => (
      request.method() === "POST" && request.url().endsWith("/penalty-actions/remove")
    ));
    await removeDialog.getByRole("button", { name: "Remove penalty", exact: true }).click();
    const removeRequest = await removeRequestPromise;
    expect(removeRequest.postDataJSON()).toEqual({
      expectedVersionToken: 11,
      recordId: effectiveRecordId,
      reasonCode: "MEMBER_PENALTY_NEW_EVIDENCE",
      adminNote: "New evidence changes the decision.",
    });
    expect(removeRequest.headers()["idempotency-key"]).toMatch(/^admin-member-penalty-remove-/);
    expect(requests).toEqual([
      { action: "add", expectedVersionToken: 10 },
      { action: "remove", expectedVersionToken: 11 },
    ]);
    await expect(main.getByText("Penalty removed", { exact: true })).toBeVisible();
  });

  test("covers Activity Log mobile, language, theme, export, and pagination behavior", async ({ context, page }) => {
    await addAdminCookie(context, "valid-session");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/activity");

    const main = page.locator("#activity-main");
    await expect(main.getByRole("heading", { level: 1, name: "Activity Log" })).toBeVisible();
    await expect(main.locator("tbody tr").first()).toBeVisible();
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);

    const downloadPromise = page.waitForEvent("download");
    await main.getByRole("button", { name: "Export CSV" }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("activity-log.csv");

    await main.getByRole("button", { name: "Load more" }).click();
    await expect(main.locator("tbody tr")).toHaveCount(3);

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("button", { name: /Theme Grey-white/ }).click();
    await page.getByRole("button", { name: /Dark Low-light workspace/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const languageOptions = page.getByRole("group", { name: /Language options|ตัวเลือกภาษา/ });
    await languageOptions.getByRole("button", { name: "ไทย", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(main.getByRole("heading", { level: 1, name: "บันทึกกิจกรรม", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "ส่งออก CSV", exact: true })).toBeEnabled();
  });

  test("covers Activity Log loading, empty, and error states", async ({ context, page }) => {
    await addAdminCookie(context, "valid-session");
    await page.goto("/activity");

    const main = page.locator("#activity-main");
    let delayNextPage = true;
    let failNextPage = false;
    await page.route("**/api/v1/admin/activity-log?*", async (route) => {
      const url = new URL(route.request().url());
      if (!url.searchParams.has("cursor")) {
        await route.continue();
        return;
      }
      if (delayNextPage) {
        delayNextPage = false;
        url.searchParams.set("action", "ACTIVITY_SLOW");
        await route.continue({ url: url.toString() });
        return;
      }
      if (failNextPage) {
        url.searchParams.set("action", "ACTIVITY_ERROR");
        await route.continue({ url: url.toString() });
        return;
      }
      await route.continue();
    });

    const loadMore = main.getByRole("button", { name: "Load more" });
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect(main.locator("#activity-status")).toHaveText("Loading activity");
    await expect(main.locator("tbody tr")).toHaveCount(3);

    await main.getByLabel("Search loaded activity").fill("NO_MATCH");
    await expect(main.getByRole("heading", { name: "No activity recorded" })).toBeVisible();
    await expect(main.locator("table")).toHaveCount(0);

    failNextPage = true;
    await page.reload();
    await expect(main.getByRole("button", { name: "Load more" })).toBeVisible();
    await main.getByRole("button", { name: "Load more" }).click();
    await expect(main.getByRole("alert")).toContainText("Activity log is not available");
    await expect(main.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("protects Activity Log records at the Admin API boundary", async ({ page }) => {
    const apiPort = process.env.ADMIN_SECURITY_API_PORT ?? "5002";
    const apiUrl = `http://localhost:${apiPort}/api/v1/admin/activity-log`;
    const noSession = await page.request.get(apiUrl);
    expect(noSession.status()).toBe(401);

    const invalidSession = await page.request.get(apiUrl, {
      headers: { cookie: "kuquest-admin.session_token=invalid-session" },
    });
    expect(invalidSession.status()).toBe(401);

    const disabledAdmin = await page.request.get(apiUrl, {
      headers: { cookie: "kuquest-admin.session_token=disabled-session" },
    });
    expect(disabledAdmin.status()).toBe(403);

    const unknownSession = await page.request.get(apiUrl, {
      headers: { cookie: "kuquest-admin.session_token=unknown-session" },
    });
    expect(unknownSession.status()).toBe(401);

    const spoofedCookieName = await page.request.get(apiUrl, {
      headers: { cookie: "attacker=kuquest-admin" },
    });
    expect(spoofedCookieName.status()).toBe(401);
  });

  test("keeps public assets available and private data protected", async ({ page }) => {
    const assetResponse = await page.request.get("/kuquest-logo.png");
    expect(assetResponse.status()).toBe(200);

    const privateResponse = await page.request.get("/wallet", { maxRedirects: 0 });
    expect(privateResponse.status()).toBe(307);
    expect(privateResponse.headers().location).toBe("/login");
    expect(await privateResponse.text()).not.toContain("Wallets");
  });
});
