import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";
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
  { path: "/conduct-report/CND-8301", activeHref: "/conduct-report" },
  { path: "/payout/PAY-9637", activeHref: "/payout" },
  { path: "/member/68000000", activeHref: "/member" },
] as const;

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
    for (const href of ["/dispute", "/report", "/conduct-report", "/payout"]) {
      await expect(shell.locator(`a[href="${href}"] .admin-nav-count`)).toHaveText(/^\d+$/);
    }

    for (const route of canonicalRoutes) {
      await page.goto(route.path);
      await expect(shell).toBeVisible();
      await expect(
        shell.locator(`a[aria-current="page"][href="${route.activeHref}"]`),
      ).toBeVisible();
    }
  });

  test("redirects legacy query and plural detail URLs to canonical routes", async ({ page }) => {
    await signIn(page);

    const redirects = [
      ["/?view=home", "/overview"],
      ["/?view=quests", "/quest"],
      ["/?view=disputes", "/dispute"],
      ["/?view=reports", "/report"],
      ["/?view=conduct-reports", "/conduct-report"],
      ["/?view=payouts", "/payout"],
      ["/?view=users", "/member"],
      ["/?view=wallets", "/wallet"],
      ["/?view=topups", "/overview"],
      ["/?view=activity", "/activity"],
      ["/?view=unknown", "/overview"],
      ["/?user=..", "/overview"],
      ["/?view=disputes&openDispute=DSP-5201", "/dispute/DSP-5201"],
      ["/users/%2E%2E", "/overview"],
      ["/quests/QST-12001", "/quest/QST-12001"],
      ["/disputes/DSP-5201", "/dispute/DSP-5201"],
      ["/reports/RPT-8201", "/report/RPT-8201"],
      ["/users/68000000", "/member/68000000"],
      ["/member/68000000/wallet-statement", "/member/68000000?tab=wallet-statement"],
    ] as const;

    for (const [legacyPath, canonicalPath] of redirects) {
      await page.goto(legacyPath);
      await expect(page).toHaveURL(new RegExp(`${canonicalPath.replace(/[?]/g, "\\?")}$`));
    }

    await page.goto("/?view=users&openUser=68000000&tab=wallet-statement");
    await expect(page).toHaveURL("/member/68000000?tab=wallet-statement");
    await expect(page.getByRole("heading", { name: "Wallet Statement" })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL("/member/68000000?tab=wallet-statement");
    await expect(page.getByRole("heading", { name: "Wallet Statement" })).toBeVisible();
  });

  test("keeps a canonical destination in browser history after a legacy redirect", async ({ page }) => {
    await signIn(page);
    await page.goto("/overview");
    await page.goto("/?view=quests");
    await expect(page).toHaveURL("/quest");

    await page.goBack();
    await expect(page).toHaveURL("/overview");
    await page.goForward();
    await expect(page).toHaveURL("/quest");
  });

  test("does not restore a protected page after logout and browser Back", async ({ page }) => {
    await signIn(page);
    await page.goto("/quest");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to admin" })).toBeVisible();
  });

  test("renders the canonical Activity Log route with mock audit fixtures", async ({ page }) => {
    await signIn(page);
    await page.goto("/activity");

    const main = page.locator("#activity-main");
    await expect(main).toBeVisible();
    await expect(main.getByRole("heading", { level: 1, name: "Activity Log" })).toBeVisible();
    await expect(main.locator("table")).toBeVisible();
    await expect(main).toContainText("Fixture data is active");
    await expect(main.locator("tbody tr")).toHaveCount(10);
    await expect(main.getByText("Showing 1–10 of 200 results", { exact: true })).toBeVisible();
    await expect(main.locator("a.activity-log-target")).toHaveCount(0);
    await main.getByRole("button", { name: "Next", exact: true }).click();
    await expect(main.getByText("Page 2 of 20", { exact: true })).toBeVisible();
    await main.getByRole("button", { name: "Show all", exact: true }).click();
    await expect(main.locator("tbody tr")).toHaveCount(200);
    await expect(main.getByText("Showing all 200 results", { exact: true })).toBeVisible();
    await main.getByRole("button", { name: "View activity details" }).first().click();
    await expect(page.getByRole("heading", { name: "State change" })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Previous state");
    await expect(page.getByRole("dialog").locator("a.activity-log-target")).toHaveCount(0);
    await expect(page.getByRole("dialog").getByRole("button", { name: "View linked detail" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "View linked detail" }).click();
    await expect(page).toHaveURL(/\/dispute\/DSP-5201$/);
    await expect(page.getByRole("dialog", { name: "Activity log entry" })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Dispute Case details" })).toBeVisible();
  });

  test("sorts Activity Log records by column in both directions", async ({ page }) => {
    await signIn(page);
    await page.goto("/activity");

    const main = page.locator("#activity-main");
    const actorSort = main.getByRole("button", { name: /^Actor/ });
    await expect(actorSort).toBeVisible();
    await actorSort.click();
    await expect(main.locator("thead th").nth(1)).toHaveAttribute("aria-sort", "ascending");
    await expect(main.locator("tbody tr").first().locator("td").nth(1)).toContainText("Narin Admin");
    await actorSort.click();
    await expect(main.locator("thead th").nth(1)).toHaveAttribute("aria-sort", "descending");
    await expect(main.locator("tbody tr").first().locator("td").nth(1)).toContainText("Supansa Admin");
  });

  test("scrolls the content area inside Quest, Wallet, and Activity drawers", async ({ page }) => {
    await signIn(page);

    const drawerCases = [
      {
        route: "/quest",
        open: async () => page.locator("tbody tr").first().click(),
      },
      {
        route: "/wallet",
        open: async () => page.getByRole("button", { name: "Open Wallet WAL-1001" }).click(),
      },
      {
        route: "/activity",
        open: async () => page.getByRole("button", { name: "View activity details" }).first().click(),
      },
    ] as const;

    for (const drawerCase of drawerCases) {
      await page.goto(drawerCase.route);
      await drawerCase.open();

      const drawer = page.locator("dialog.drawer.open");
      const content = drawer.locator(":scope > .admin-drawer-content");
      await expect(drawer).toBeVisible();
      await expect.poll(() => content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);

      await content.evaluate((element) => { element.scrollTop = 0; });
      const contentBox = await content.boundingBox();
      expect(contentBox).not.toBeNull();
      await page.mouse.move(contentBox!.x + 20, contentBox!.y + 350);
      await page.waitForTimeout(50);
      await page.mouse.wheel(0, 600);
      await expect.poll(() => content.evaluate((element) => element.scrollTop > 0)).toBe(true);

      await drawer.locator(":scope > .drawer-top").getByRole("button").click();
    }
  });

  test("shows the Finance Overview summary without platform Revenue or Suspense", async ({ page }) => {
    await signIn(page);
    await page.goto("/overview");

    const finance = page.locator(".overview-command-center-finance");
    await expect(finance).toBeVisible();
    await expect(finance.getByRole("heading", { name: "Finance Overview" })).toBeVisible();
    await expect(finance).toContainText("Local demo data");
    await expect(finance).toContainText("All Member Wallet Summary");
    await expect(finance).toContainText("Lifetime Volume");
    await expect(finance.getByText("Ledger Integrity", { exact: true })).toHaveCount(0);
    await expect(finance.getByText("Revenue", { exact: true })).toHaveCount(0);
    await expect(finance.getByText("Suspense", { exact: true })).toHaveCount(0);
    for (const label of ["All Spending balance", "All Earnings balance", "All Funding reserved", "All Payout reserved", "Total circulating"]) {
      await expect(finance).toContainText(label);
    }
    const timeline = page.locator(".overview-command-center-timeline-scrollable");
    await expect(timeline).toHaveCount(1);
    await expect(timeline.locator(":scope > li")).toHaveCount(10);
    await expect(timeline).toHaveCSS("overflow-y", "auto");
    expect(await timeline.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await expect(page.getByText("Latest 10", { exact: true })).toBeVisible();
  });

  test("renders Conduct Reports separately and resolves them inside a route-aware workspace drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/conduct-report");

    const main = page.locator("#conduct-report-main");
    await expect(main.getByRole("heading", { level: 1, name: "Conduct Reports" })).toBeVisible();
    await expect(main.locator("tbody tr[data-conduct-report-id]")).toHaveCount(10);
    await page.reload();
    await expect(main.getByRole("heading", { level: 1, name: "Conduct Reports" })).toBeVisible();
    await expect(main.locator("tbody tr[data-conduct-report-id]")).toHaveCount(10);
    await expect(main.getByText("Report Case", { exact: true })).toHaveCount(0);
    await expect(main.locator('a[href*="/conduct-report/"]')).toHaveCount(0);

    await main.getByRole("tab", { name: "Confirmed", exact: true }).click();
    await expect(main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_UPHELD"]')).toHaveCount(10);
      await main.getByRole("tab", { name: /^Open/ }).click();
    const pendingRows = main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_PENDING"]');
    await expect(pendingRows).toHaveCount(10);
    const pendingRow = main.locator('tbody tr[data-conduct-report-id="CND-8301"]');
    await expect(pendingRow).toBeVisible();
    await pendingRow.getByRole("button", { name: "Open Conduct Report CND-8301" }).click();

    await expect(page).toHaveURL(/\/conduct-report\/CND-8301$/);
    const drawer = page.getByRole("dialog", { name: "Conduct Report details" });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Quest record");
    await expect(drawer.locator('.moderation-case-workspace a:not([data-slot="button"])')).toHaveCount(0);
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
    await expect(main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_PENDING"]')).toHaveCount(10);
    await drawer.getByRole("button", { name: "Close drawer" }).click();
    await main.getByRole("tab", { name: "Confirmed", exact: true }).click();
    await expect(main.locator('tbody tr[data-conduct-report-status="CONDUCT_REPORT_UPHELD"]')).toHaveCount(10);
  });

  test("places Open first and shows the loaded open count on moderation boards", async ({ page }) => {
    await signIn(page);

    for (const route of ["/dispute", "/report", "/conduct-report"]) {
      await page.goto(route);
      const tabs = page.locator('[role="tablist"] [role="tab"]');
      await expect(tabs.first()).toHaveText(/^Open \(\d+\)$/);
    }
  });

  test("keeps keyboard focus in the Conduct Report drawer and restores the row on close", async ({ page }) => {
    await signIn(page);
    await page.goto("/conduct-report");

    const main = page.locator("#conduct-report-main");
    const opener = main.locator('tbody tr[data-conduct-report-id="CND-8301"]')
      .getByRole("button", { name: "Open Conduct Report CND-8301" });
    await opener.click();

    const drawer = page.getByRole("dialog", { name: "Conduct Report details" });
    await expect(drawer).toBeVisible();
    await expect(main).toHaveAttribute("inert", "");
    await expect(drawer).toBeFocused();

    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press("Tab");
      await expect.poll(() => page.evaluate(() => {
        const active = document.activeElement;
        const openDrawer = document.querySelector("dialog.drawer.open");
        return Boolean(active && openDrawer?.contains(active));
      })).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(main).not.toHaveAttribute("inert");
    await expect(opener).toBeFocused();
  });

  test("renders Dispute Cases by displayId and keeps drawer and full-page routes", async ({ page }) => {
    await signIn(page);
    await page.goto("/dispute");

    const main = page.locator("#dispute-main");
    await expect(main.getByRole("heading", { level: 1, name: "Dispute Cases" })).toBeVisible();
    await expect(main.locator("thead")).toContainText("Hirer");
    await expect(main.locator("thead")).toContainText("Worker");
    const firstRow = main.locator('tbody tr[data-dispute-id="DSP-5201"]');
    await expect(firstRow).toHaveCount(1);
    await expect(firstRow.locator("td").first()).toContainText("DSP-5201");
    await expect(firstRow).not.toContainText("undefined");

    await page.reload();
    await expect(main.getByRole("heading", { level: 1, name: "Dispute Cases" })).toBeVisible();
    await expect(firstRow).toHaveCount(1);

    await firstRow.locator("button").first().click();
    await expect(page).toHaveURL(/\/dispute\/DSP-5201$/);
    const drawer = page.getByRole("dialog", { name: "Dispute Case details" });
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.moderation-case-workspace a:not([data-slot="button"])')).toHaveCount(0);
    await expect(drawer.getByRole("link", { name: "Quest detail", exact: true })).toHaveAttribute("href", "/quest/QST-12001");
    await expect(drawer.locator(".admin-record-party-grid").first()).toContainText("Hirer");
    await expect(drawer.locator(".admin-record-party-grid").first()).toContainText("Worker");
    await expect(drawer.getByText("Hirer wins", { exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/dispute$/);
    await expect(drawer).toHaveCount(0);

    await firstRow.locator("button").first().click();
    await expect(drawer).toBeVisible();
    await drawer.getByLabel(/Worker wins/).check();
    await drawer.getByRole("button", { name: "Record Dispute Case decision" }).click();
    const decisionDialog = page.getByRole("dialog", { name: "Confirm Worker wins" });
    await expect(decisionDialog).toBeVisible();
    await expect(decisionDialog.getByLabel("Worker allocation in Satang")).toHaveCount(0);
    await expect(decisionDialog.getByLabel("Reason code")).toHaveCount(0);
    await expect(decisionDialog).toContainText("Full remaining amount");
    await decisionDialog.getByLabel("Reason for this decision").fill("The Worker completed the agreed Quest Condition.");
    await decisionDialog.getByRole("button", { name: "Confirm decision" }).click();
    await expect(decisionDialog).toBeHidden();
    await expect(drawer.getByText("Resolved", { exact: true }).first()).toBeVisible();
    await drawer.getByRole("button", { name: "Close drawer" }).click();
    await expect(page).toHaveURL(/\/dispute$/);

    await page.goto("/dispute/DSP-5201");
    await expect(page.locator(".dispute-case-detail > .grid:has(> aside)")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Verify dorm fire exits" })).toBeVisible();
    await expect(page.getByText("Invalid Date", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Verify dorm fire exits" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/dispute$/);
    await expect(page.locator("#dispute-main")).toBeVisible();
  });

  test("keeps Dispute Case drawer and decision dialog focus inside the active surface", async ({ page }) => {
    await signIn(page);
    await page.goto("/dispute");

    const main = page.locator("#dispute-main");
    const opener = main.locator('tbody tr[data-dispute-id="DSP-5201"] button').first();
    await opener.click();

    const drawer = page.getByRole("dialog", { name: "Dispute Case details" });
    await expect(drawer).toBeVisible();
    await expect(main).toHaveAttribute("inert", "");
    await expect(drawer).toBeFocused();

    await drawer.getByLabel(/Worker wins/).check();
    const decisionOpener = drawer.getByRole("button", { name: "Record Dispute Case decision" });
    await decisionOpener.click();

    const decision = page.getByRole("dialog", { name: "Confirm Worker wins" });
    await expect(decision).toBeVisible();
    await expect(decision).toHaveAttribute("open", "");
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("dispute-decision-reason");

    for (let index = 0; index < 5; index += 1) {
      await expect.poll(() => decision.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Tab");
    }

    await page.keyboard.press("Escape");
    await expect(decision).toHaveCount(0);
    await expect(drawer).toBeVisible();
    await expect(decisionOpener).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/dispute$/);
    await expect(drawer).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("renders the Overview dashboard and searches canonical records", async ({ page }) => {
    await signIn(page);

    const dashboard = page.locator("#dashboard-main");
    await expect(dashboard).toBeVisible();
    await page.reload();
    await expect(dashboard).toBeVisible();
    await expect(dashboard.locator(".overview-command-center-header")).toHaveCSS("position", "static");
    await expect(dashboard.getByText("Work left", { exact: true })).toBeVisible();
    await expect(dashboard.getByText("Payouts in flight", { exact: true })).toHaveCount(0);
    await expect(page.getByText("⌘ K", { exact: true })).toHaveCount(0);
    await expect(dashboard.locator('a[href="/dispute"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/report"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/conduct-report"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/payout"]')).toHaveCount(2);
    await expect(dashboard.locator('a[href="/activity"]')).toBeVisible();
    const queueMap = dashboard.locator('[aria-labelledby="overview-command-queue-heading"]');
    await expect(queueMap.locator('.overview-command-center-queue-oldest')).toHaveCount(4);
    await expect(queueMap).toContainText("PAY-9892");
    await expect(queueMap).toContainText("DSP-5202");
    await expect(queueMap).toContainText("RPT-8202");
    await expect(queueMap).toContainText("CND-8301");
    await expect(queueMap).not.toContainText("CND-8302");
    await expect(queueMap).not.toContainText("SLA");

    const conductQueue = queueMap.locator("li").filter({ hasText: "Conduct Reports" });
    await conductQueue.getByRole("link", { name: "Process next", exact: true }).click();
    const conductDrawer = page.getByRole("dialog", { name: "Conduct Report details" });
    await conductDrawer.getByLabel("Confirm violation").check();
    await conductDrawer.getByRole("button", { name: "Close report", exact: true }).click();
    const conductDecision = page.getByRole("dialog", { name: "Confirm violation" });
    await conductDecision.getByLabel("Reason for this decision").fill(
      "The Quest record confirms the reported conduct violation.",
    );
    await conductDecision.getByRole("button", { name: "Confirm decision" }).click();
    await expect(conductQueue).toContainText("10 open");
    await expect(conductQueue).not.toContainText("CND-8301");
    await expect(conductQueue.getByRole("link", { name: "Process next", exact: true })).toHaveCount(1);
    await conductDrawer.getByRole("button", { name: "Close drawer" }).click();

    await expect(dashboard.locator(".overview-command-center-activity")).toContainText("Dispute Case Resolved");
    await expect(dashboard.locator(".overview-command-center-activity")).toContainText("DSP-5201");

    const openSearch = async () => {
      await page.getByRole("button", { name: "Search marketplace records" }).click();
      const dialog = page.locator("#overview-command");
      await expect(dialog).toBeVisible();
      return dialog;
    };

    let dialog = await openSearch();
    const closeSearch = dialog.locator(".command-input button[aria-label=\"Close search\"]");
    await expect(closeSearch).toBeVisible();
    await expect(dialog.locator("kbd")).toHaveCount(0);
    await closeSearch.click();
    await expect(dialog).toHaveCount(0);
    dialog = await openSearch();
    const searchInput = dialog.getByRole("searchbox", { name: "Search marketplace records" });
    await searchInput.fill("QST-12001");
    const questResult = dialog.getByRole("link", { name: /QST-12001/ });
    await expect(questResult).toHaveAttribute("href", "/quest/QST-12001");
    await expect(questResult).toHaveCSS("text-decoration-line", "none");
    await questResult.click();
    await expect(page).toHaveURL(/\/quest\/QST-12001$/);

    await page.goto("/overview");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    dialog = await openSearch();
    await dialog.getByRole("searchbox", { name: "Search marketplace records" }).fill("68000000");
    const memberResult = dialog.locator('a.result[href="/member/68000000"]');
    await expect(memberResult).toBeVisible();
    await memberResult.click();
    await expect(page).toHaveURL(/\/member\/68000000$/);

    await page.goto("/overview");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    dialog = await openSearch();
    await dialog.getByRole("searchbox", { name: "Search marketplace records" }).fill("PAY-9637");
    await expect(dialog.getByRole("link", { name: /PAY-9637/ })).toHaveAttribute("href", "/payout/PAY-9637");
  });

  test("centers the global search surface over the Admin shell", async ({ page }) => {
    await signIn(page);
    await page.goto("/overview");
    await page.getByRole("button", { name: "Search marketplace records" }).click();

    const dialog = page.getByRole("dialog", { name: "Search marketplace records" });
    const surface = dialog.locator(".admin-global-search-box");
    const dialogBox = await dialog.boundingBox();
    const surfaceBox = await surface.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(surfaceBox).not.toBeNull();
    expect(surfaceBox?.x).toBeGreaterThan((dialogBox?.x ?? 0) + 10);
    expect(surfaceBox?.y).toBeGreaterThan((dialogBox?.y ?? 0) + 10);
    await expect(dialog).toHaveCSS("display", "grid");
    await expect(dialog).toHaveCSS("background-color", "rgba(25, 27, 28, 0.38)");
  });

  test("keeps table record links visually neutral", async ({ page }) => {
    await signIn(page);
    for (const path of ["/quest", "/wallet", "/payout"]) {
      await page.goto(path);
      const recordLink = page.locator('table[data-slot="table"] a').first();
      await expect(recordLink).toBeVisible();
      await expect(recordLink).toHaveCSS("text-decoration-line", "none");
    }
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
