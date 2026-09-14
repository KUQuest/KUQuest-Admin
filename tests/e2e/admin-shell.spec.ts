import { expect, test, type Page } from "@playwright/test";

const canonicalRoutes = [
  { path: "/overview", activeHref: "/overview" },
  { path: "/quest", activeHref: "/quest" },
  { path: "/dispute", activeHref: "/dispute" },
  { path: "/report", activeHref: "/report" },
  { path: "/conduct-report", activeHref: "/conduct-report" },
  { path: "/payout", activeHref: "/payout" },
  { path: "/member", activeHref: "/member" },
  { path: "/wallet", activeHref: "/wallet" },
  { path: "/activity", activeHref: "/activity" },
  { path: "/quest/QST-12001", activeHref: "/quest" },
  { path: "/dispute/DSP-5201", activeHref: "/dispute" },
  { path: "/report/RPT-8201", activeHref: "/report" },
  { path: "/payout/PAY-9637", activeHref: "/payout" },
  { path: "/member/68000000", activeHref: "/member" },
] as const;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("University email").fill("admin@ku.th");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("shared Admin shell", () => {
  test("uses canonical links and keeps the board active on detail routes", async ({ page }) => {
    await signIn(page);

    const shell = page.locator(".admin-shell");
    const navigationLinks = shell.locator("aside a");
    const hrefs = await navigationLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    expect(hrefs).toEqual([
      "/overview",
      "/quest",
      "/dispute",
      "/report",
      "/conduct-report",
      "/payout",
      "/member",
      "/wallet",
      "/activity",
    ]);
    expect(hrefs.some((href) => href?.includes("?view="))).toBe(false);
    await expect(shell.locator('a[href="/dispute"] .admin-nav-count')).toHaveText("2");
    await expect(shell.locator('a[href="/report"] .admin-nav-count')).toHaveText("2");
    await expect(shell.locator('a[href="/conduct-report"] .admin-nav-count')).toHaveText("1");
    await expect(shell.locator('a[href="/payout"] .admin-nav-count')).toHaveText("3");

    for (const route of canonicalRoutes) {
      await page.goto(route.path);
      await expect(shell).toBeVisible();
      await expect(
        shell.locator(`a[aria-current="page"][href="${route.activeHref}"]`),
      ).toBeVisible();
    }
  });

  test("renders the canonical Activity Log route without a legacy data fallback", async ({ page }) => {
    await signIn(page);
    await page.goto("/activity");

    const main = page.locator("#activity-main");
    await expect(main).toBeVisible();
    await expect(main.getByRole("heading", { level: 1, name: "Activity Log" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Activity Log unavailable" })).toBeVisible();
    await expect(main).toContainText("The Admin API is required to display this read-only log.");
    await expect(main.locator("table")).toHaveCount(0);
  });

  test("renders Conduct Reports separately and resolves them inside the board drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/conduct-report");

    const main = page.locator("#conduct-report-main");
    await expect(main.getByRole("heading", { level: 1, name: "Conduct Reports" })).toBeVisible();
    await expect(main.locator("tbody tr[data-conduct-report-id]")).toHaveCount(3);
    await expect(main.getByText("Report Case", { exact: true })).toHaveCount(0);
    await expect(main.locator('a[href*="/conduct-report/"]')).toHaveCount(0);

    await main.getByRole("tab", { name: "Confirmed", exact: true }).click();
    await expect(main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_UPHELD"]')).toHaveCount(1);
    await main.getByRole("tab", { name: "Open", exact: true }).click();
    const pendingRow = main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_PENDING"]');
    await expect(pendingRow).toHaveCount(1);
    await pendingRow.click();

    await expect(page).toHaveURL(/\/conduct-report$/);
    const drawer = page.getByRole("dialog", { name: "Conduct Report details" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Quest record");
    await drawer.getByLabel("Confirm violation").check();
    await drawer.getByRole("button", { name: "Close report", exact: true }).click();

    const decisionDialog = page.getByRole("dialog", { name: "Confirm violation" });
    await expect(decisionDialog).toBeVisible();
    await decisionDialog.getByLabel("Reason for this decision").fill(
      "The Quest record confirms the reported conduct violation.",
    );
    await decisionDialog.getByRole("button", { name: "Confirm decision" }).click();

    await expect(decisionDialog).toBeHidden();
    await expect(drawer).toContainText("Violation confirmed");
    await expect(main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_PENDING"]')).toHaveCount(0);
    await drawer.getByRole("button", { name: "Close drawer" }).click();
    await main.getByRole("tab", { name: "Confirmed", exact: true }).click();
    await expect(main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_UPHELD"]')).toHaveCount(2);
  });

  test("renders Dispute Cases by displayId and keeps drawer and full-page routes", async ({ page }) => {
    await signIn(page);
    await page.goto("/dispute");

    const main = page.locator("#dispute-main");
    await expect(main.getByRole("heading", { level: 1, name: "Dispute Cases" })).toBeVisible();
    const firstRow = main.locator('tbody tr[data-dispute-id="DSP-5201"]');
    await expect(firstRow).toHaveCount(1);
    await expect(firstRow.locator("td").first()).toContainText("DSP-5201");
    await expect(firstRow).not.toContainText("undefined");

    await firstRow.click();
    await expect(page).toHaveURL(/\/dispute\/DSP-5201$/);
    const drawer = page.getByRole("dialog", { name: "Dispute Case details" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Quest detail" })).toHaveAttribute("href", "/quest/QST-12001");
    await expect(drawer.getByText("Hirer wins", { exact: true })).toBeVisible();
    await drawer.getByLabel(/Worker wins/).check();
    await drawer.getByRole("button", { name: "Record Dispute Case decision" }).click();
    const decisionDialog = page.getByRole("dialog", { name: "Confirm Worker allocation" });
    await expect(decisionDialog).toBeVisible();
    await decisionDialog.getByLabel("Reason code").selectOption("DISPUTE_EVIDENCE_REVIEW");
    await decisionDialog.getByLabel("Worker allocation in Satang").fill("12501");
    await decisionDialog.getByLabel("Reason for this decision").fill("The Worker completed the agreed Quest Condition.");
    await decisionDialog.getByRole("button", { name: "Confirm decision" }).click();
    await expect(decisionDialog).toBeHidden();
    await expect(drawer.getByText("Resolved", { exact: true }).first()).toBeVisible();
    await drawer.getByRole("button", { name: "Close drawer" }).click();
    await expect(page).toHaveURL(/\/dispute$/);

    await page.goto("/dispute/DSP-5201");
    await expect(page.locator(".dispute-case-detail .full-record-grid")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Verify dorm fire exits" })).toBeVisible();
    await expect(page.getByText("Invalid Date", { exact: true })).toHaveCount(0);
  });

  test("renders the Overview dashboard and searches canonical records", async ({ page }) => {
    await signIn(page);

    const dashboard = page.locator("#dashboard-main");
    await expect(dashboard).toBeVisible();
    await expect(dashboard.locator(".overview-command-center-header")).toHaveCSS("position", "static");
    await expect(dashboard.getByText("Work left", { exact: true })).toBeVisible();
    await expect(dashboard.locator('a[href="/dispute"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/report"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/conduct-report"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/payout"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/activity"]')).toBeVisible();

    const openSearch = async () => {
      await page.getByRole("button", { name: "Search marketplace records" }).click();
      const dialog = page.locator("#overview-command");
      await expect(dialog).toBeVisible();
      return dialog;
    };

    let dialog = await openSearch();
    const searchInput = dialog.getByRole("searchbox", { name: "Search marketplace records" });
    await searchInput.fill("QST-12001");
    await expect(dialog.getByRole("link", { name: /QST-12001/ })).toHaveAttribute("href", "/quest/QST-12001");
    await dialog.getByRole("link", { name: /QST-12001/ }).click();
    await expect(page).toHaveURL(/\/quest\/QST-12001$/);

    await page.goto("/overview");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    dialog = await openSearch();
    await dialog.getByRole("searchbox", { name: "Search marketplace records" }).fill("68000000");
    await expect(dialog.getByRole("link", { name: /68000000/ })).toHaveAttribute("href", "/member/68000000");
    await dialog.getByRole("link", { name: /68000000/ }).click();
    await expect(page).toHaveURL(/\/member\/68000000$/);

    await page.goto("/overview");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    dialog = await openSearch();
    await dialog.getByRole("searchbox", { name: "Search marketplace records" }).fill("PAY-9637");
    await expect(dialog.getByRole("link", { name: /PAY-9637/ })).toHaveAttribute("href", "/payout/PAY-9637");
  });

  test("keeps mobile navigation open and close behavior", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);

    const navigation = page.locator("#site-navigation");
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    await expect(navigation).toHaveClass(/open/);
    await expect(page.getByRole("button", { name: "Close navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await page.setViewportSize({ width: 1200, height: 844 });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(navigation).not.toHaveClass(/open/);
    await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    const reopenedMenu = page.getByRole("button", { name: "Open navigation" });
    await reopenedMenu.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await navigation.getByRole("link", { name: "Members" }).click();
    await expect(page).toHaveURL(/\/member$/);
    await expect(navigation).not.toHaveClass(/open/);
    await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  });

  test("keeps theme and language controls available in the shared shell", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: /Theme Grey-white/ }).click();
    await page.getByRole("button", { name: /Dark Low-light workspace/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const languageOptions = page.getByRole("group", { name: /Language options|ตัวเลือกภาษา/ });
    await languageOptions.getByRole("button", { name: "ไทย", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page.getByRole("link", { name: "ภาพรวม", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "สมาชิก", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "ภาพรวม", exact: true })).toBeVisible();
    await expect(page.getByText("ระบบ", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "การนำทางหลัก" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "การนำทางระบบ" })).toBeVisible();
    await page.goto("/conduct-report");
    await expect(page.getByRole("heading", { level: 1, name: "รายงานพฤติกรรม", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "รายงานพฤติกรรม", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "เปิดการนำทาง" })).toBeVisible();
    await page.getByRole("button", { name: "เปิดการนำทาง" }).click();
    await expect(page.getByRole("button", { name: "ปิดการนำทาง" })).toBeVisible();
    await expect(
      languageOptions.getByRole("button", { name: "ไทย", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

});
