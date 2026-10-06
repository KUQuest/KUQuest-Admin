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
