import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Admin canonical click flows", () => {
  test("admin can show and hide the password while signing in", async ({ page }) => {
    await page.goto("/login");

    const password = page.getByLabel("Password");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();
    await page.getByRole("button", { name: "Hide" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("admin can switch the sign-in screen between English and Thai", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "ไทย", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page.getByRole("heading", { level: 1, name: "เข้าสู่ระบบผู้ดูแล" })).toBeVisible();
    await expect(page.getByLabel("อีเมลมหาวิทยาลัย")).toBeVisible();

    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to admin" })).toBeVisible();
  });

  test("admin keeps the selected theme after reload", async ({ page }) => {
    await signIn(page, { expectEmailFocused: true });

    await page.getByRole("button", { name: /Theme Grey-white/ }).click();
    await page.getByRole("button", { name: /Dark Low-light workspace/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("global search links use canonical record routes", async ({ page }) => {
    await signIn(page, { expectEmailFocused: true });

    await page.getByRole("button", { name: "Search marketplace records" }).click();
    const searchDialog = page.getByRole("dialog", { name: "Search marketplace records" });
    const search = searchDialog.getByRole("searchbox", { name: "Search marketplace records" });

    await search.fill("QST-12001");
    await expect(searchDialog.getByRole("link", { name: /QST-12001/ })).toHaveAttribute("href", "/quest/QST-12001");
    await search.fill("68000000");
    await expect(searchDialog.locator('a[href="/member/68000000"]')).toHaveCount(1);
    await search.fill("PAY-9637");
    await expect(searchDialog.getByRole("link", { name: /PAY-9637/ })).toHaveAttribute("href", "/payout/PAY-9637");
  });

  test("admin can search Member reviews without unsupported moderation commands", async ({ page }) => {
    await signIn(page, { expectEmailFocused: true });
    await page.goto("/member/68000000?tab=reviews");

    const reviews = page.locator(".user-detail-table");
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    await expect(reviews.locator("tbody tr")).not.toHaveCount(0);

    await page.getByRole("searchbox", { name: "Search reviews" }).fill("delivery");
    await expect(reviews.locator("tbody tr")).not.toHaveCount(0);
    await page.getByRole("searchbox", { name: "Search reviews" }).fill("");
    await expect(reviews.getByRole("columnheader", { name: "Action", exact: true })).toHaveCount(0);
    await expect(page.getByText("Review records are read-only.", { exact: false })).toBeVisible();
    await expect(reviews.getByRole("button", { name: "Hide", exact: true })).toHaveCount(0);
    await expect(reviews.getByRole("button", { name: "Unhide", exact: true })).toHaveCount(0);
  });

  test("invalid Admin sign-in shows accessible validation", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("University email").fill("not-an-admin-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "@ku.th" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "at least 8 characters" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin can navigate from the sidebar and open canonical detail routes", async ({ page }) => {
    await signIn(page, { expectEmailFocused: true });

    await page.locator('.admin-shell aside a[href="/quest"]').click();
    await expect(page).toHaveURL(/\/quest$/);
    const questLink = page.getByRole("link", { name: "Open Quest QST-12011" });
    const questHref = await questLink.getAttribute("href");
    expect(questHref).toBe("/quest/QST-12011");
    await questLink.click();
    await expect(page).toHaveURL(/\/quest\/QST-12011$/);
    await expect(page.locator(".quest-drawer")).toBeVisible();
    await page.getByRole("link", { name: "Full Quest detail" }).click();
    await expect(page).toHaveURL(/\/quest\/QST-12011$/);
    await expect(page.locator(".quest-detail-page h1")).toHaveText("Demo Quest 01");

    await page.locator('.admin-shell aside a[href="/payout"]').click();
    await expect(page).toHaveURL(/\/payout$/);
    await expect(page.getByRole("heading", { level: 1, name: "Payouts" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Open Payout PAY-9637" }).click();
    await expect(page).toHaveURL(/\/payout\/PAY-9637$/);
    const payoutDrawer = page.getByRole("dialog", { name: "PAY-9637" });
    await expect(payoutDrawer).toBeVisible();
    await payoutDrawer.getByRole("button", { name: "Close Payout detail" }).click();
    await expect(page).toHaveURL(/\/payout$/);

    await page.locator('.admin-shell aside a[href="/member"]').click();
    await expect(page).toHaveURL(/\/member$/);
    await page.getByRole("button", { name: "Open Member 68000000" }).click();
    await page.getByRole("dialog", { name: "68000000" }).getByRole("link", { name: "See full Member profile" }).click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await expect(page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" })).toBeVisible();
  });

  test("moderation queues open on pending cases by default", async ({ page }) => {
    await signIn(page, { expectEmailFocused: true });

    const queues = [
      { path: "/dispute", main: "#dispute-main", tabName: /^Open/, statusSelector: "tbody tr[data-dispute-status]", statusAttribute: "data-dispute-status", pendingStatus: "DISPUTE_CASE_PENDING" },
      { path: "/report", main: "#report-main", tabName: /^Open/, statusSelector: "tbody tr[data-report-id] td:nth-child(6) .badge", pendingStatus: "Open" },
      { path: "/conduct-report", main: "#conduct-report-main", tabName: /^Open/, statusSelector: "tbody tr[data-conduct-report-status]", statusAttribute: "data-conduct-report-status", pendingStatus: "CONDUCT_REPORT_PENDING" },
    ];

    for (const queue of queues) {
      await page.goto(queue.path);
      const main = page.locator(queue.main);
      await expect(main.getByRole("tab", { name: queue.tabName })).toHaveAttribute("aria-selected", "true");

      const statusItems = main.locator(queue.statusSelector);
      const statuses = queue.statusAttribute
        ? await statusItems.evaluateAll((elements, attribute) => elements.map((element) => element.getAttribute(attribute)), queue.statusAttribute)
        : await statusItems.allTextContents();
      expect(statuses.length).toBeGreaterThan(0);
      expect(new Set(statuses.map((status) => status?.trim()))).toEqual(new Set([queue.pendingStatus]));
    }
  });

  test("admin can open the Wallet Statement from a Wallet drawer", async ({ page }) => {
    await signIn(page, { expectEmailFocused: true });
    await page.goto("/wallet");

    const opener = page.getByRole("button", { name: "Open Wallet WAL-1001" });
    await opener.click();
    const drawer = page.locator("dialog.wallet-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "Wallet Statement" })).toBeVisible();
    await expect(drawer.locator(".wallet-statement-table tbody tr")).toHaveCount(5);
    await drawer.getByRole("link", { name: "See Wallet Statement" }).click();

    await expect(page).toHaveURL("/member/68000000?tab=wallet-statement");
    await expect(page.getByRole("heading", { name: "Wallet Statement" })).toBeVisible();
    await expect(page.locator(".wallet-statement-table tbody tr")).toHaveCount(25);
  });
});
