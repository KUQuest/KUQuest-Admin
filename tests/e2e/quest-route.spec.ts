import { expect, test, type Page, type Route } from "@playwright/test";

import {
  mockAllQuests,
  mockQuestDetail as questDetail,
  mockQuestFinance as financeDetail,
  mockQuests as quests,
} from "../../src/features/admin/quest/quest-mock-data";

const OPEN_QUEST_ID = "00000000-0000-0000-0000-000000000606";
const TEAM_QUEST_ID = "00000000-0000-0000-0000-000000000631";
const HIDDEN_QUEST_ID = "00000000-0000-0000-0000-000000000600";
const FAILED_QUEST_ID = "QST-12001";
const OPEN_BOARD_DISPLAY_ID = "QST-12017";
const TEAM_BOARD_DISPLAY_ID = "QST-12042";
const CANDIDATE_QUEST_DISPLAY_ID = "QST-12012";

function success(data: unknown): { success: true; data: unknown } {
  return { success: true, data };
}

async function fulfill(route: Route, data: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(success(data)),
  });
}

type CommandRequest = {
  action: string;
  body: Record<string, unknown>;
  idempotencyKey: string | null;
  resourceVersion: string | null;
};

let lastCommandRequests: CommandRequest[] = [];

async function mockAdminApi(page: Page): Promise<CommandRequest[]> {
  const commandRequests: CommandRequest[] = [];

  await page.route("**/api/v1/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/v1/admin/overview") {
      await fulfill(route, {
        quests: { total: quests.length, hidden: 1, byState: { QUEST_OPEN: 1, QUEST_ASSIGNED: 1, QUEST_FAILED: 1 } },
        disputes: { total: 1, awaitingResolution: 1 },
        payouts: { pendingAdminApproval: 0, inFlight: 0 },
        members: { frozenWallets: 0, suspendedWallets: 0 },
      });
      return;
    }

    if (url.pathname === "/api/v1/admin/quests") {
      await fulfill(route, { items: mockAllQuests, nextCursor: null });
      return;
    }

    if (url.pathname.startsWith("/api/v1/admin/finance/quests/")) {
      const questId = url.pathname.split("/").at(-1);
      const quest = mockAllQuests.find((item) => item.id === questId || item.displayId === questId);
      if (!quest) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: { code: "QUEST_NOT_FOUND", message: "Quest was not found." } }),
        });
        return;
      }
      await fulfill(route, financeDetail(quest));
      return;
    }

    if (url.pathname.startsWith("/api/v1/admin/quests/")) {
      const [questId, action] = url.pathname
        .slice("/api/v1/admin/quests/".length)
        .split("/");
      const quest = mockAllQuests.find((item) => item.id === questId || item.displayId === questId);
      if (!quest) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: { code: "QUEST_NOT_FOUND", message: "Quest was not found." } }),
        });
        return;
      }

      if (request.method() === "POST" && action) {
        commandRequests.push({
          action,
          body: request.postDataJSON() as Record<string, unknown>,
          idempotencyKey: request.headers()["idempotency-key"] ?? null,
          resourceVersion: request.headers()["if-match"] ?? null,
        });
        await fulfill(route, {
          resourceSummary: quest,
          resourceVersion: quest.version + 1,
          adminActionId: "00000000-0000-0000-0000-000000000301",
        });
        return;
      }

      await fulfill(route, questDetail(quest));
      return;
    }

    if (url.pathname.startsWith("/api/v1/admin/disputes/open/")) {
      const questId = url.pathname.slice("/api/v1/admin/disputes/open/".length);
      commandRequests.push({
        action: "open",
        body: request.postDataJSON() as Record<string, unknown>,
        idempotencyKey: request.headers()["idempotency-key"] ?? null,
        resourceVersion: request.headers()["if-match"] ?? null,
      });
      await fulfill(route, { id: "DSP-NEW", questId, status: "DISPUTE_CASE_PENDING" });
      return;
    }

    if (url.pathname === "/api/v1/admin/disputes") {
      await fulfill(route, {
        items: [{
          id: "DSP-5201",
          displayId: "DSP-FAILED",
          questId: FAILED_QUEST_ID,
          status: "DISPUTE_CASE_PENDING",
        }],
        nextCursor: null,
      });
      return;
    }

    await route.continue();
  });

  return commandRequests;
}

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    { name: "kuquest-admin.mock-session", value: "1", url: "http://localhost:3000" },
    { name: "kuquest-admin.mock-session", value: "1", url: "http://localhost:3002" },
  ]);
  lastCommandRequests = await mockAdminApi(page);
});

test.describe("Quest route family", () => {
  test("renders the API Quest Board and keeps search and filters on the canonical route", async ({ page }) => {
    await page.goto("/quest");

    await expect(page).toHaveURL(/\/quest$/);
    await expect(page.getByRole("heading", { level: 1, name: "Quests" })).toBeVisible();
    await expect(page.getByRole("link", { name: `Open Quest ${OPEN_BOARD_DISPLAY_ID}` })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Quests" })).toBeVisible();
    await expect(page.getByRole("link", { name: `Open Quest ${OPEN_BOARD_DISPLAY_ID}` })).toBeVisible();

    await page.getByPlaceholder("Search Quests…").fill(OPEN_BOARD_DISPLAY_ID);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("Demo Quest 07");

    await page.getByPlaceholder("Search Quests…").fill("");
    await page.getByRole("tab", { name: "Team", exact: true }).click();
    await expect(page.locator("tbody tr")).not.toHaveCount(0);
    await expect(page.locator("tbody tr").first()).toContainText("Team Quest");

    await page.getByRole("tab", { name: "Failed", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(7);
    await expect(page.locator("tbody tr").first()).toContainText("Verify dorm fire exits");
  });

  test("uses the Quest display ID route and keeps Mock state aligned with the board", async ({ page }) => {
    await page.goto("/quest");
    await page.evaluate(() => localStorage.removeItem("kuquest-admin-quest-mock-state-v1"));

    const row = page.locator('tr[data-quest-id="00000000-0000-0000-0000-000000000600"]');
    const questLink = row.getByRole("link", { name: "Open Quest QST-12011" });
    await expect(questLink).toHaveAttribute("href", "/quest/QST-12011");
    await questLink.click();

    const drawer = page.locator(".quest-drawer");
    await expect(drawer).toContainText("Demo Quest 01");
    await drawer.getByRole("button", { name: "Terminate Quest", exact: true }).click();
    const dialog = page.locator(".quest-command-dialog");
    await dialog.getByRole("textbox", { name: "Reason", exact: true }).fill("The Quest was terminated during Admin review.");
    await dialog.getByRole("combobox", { name: /Reason code/ }).selectOption("POLICY_REVIEW");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    await drawer.getByRole("button", { name: "Close Quest detail" }).click();
    await expect(page).toHaveURL(/\/quest$/);
    await expect(row.locator(".badge").first()).toHaveText("Cancelled");
  });

  test("does not fetch Quest data from the Client Component", async ({ page }) => {
    const clientQuestReads: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") return;
      if (new URL(request.url()).pathname.startsWith("/api/v1/admin/quests")) {
        clientQuestReads.push(request.url());
      }
    });

    await page.goto("/quest");

    await expect(page.getByRole("heading", { level: 1, name: "Quests" })).toBeVisible();
    expect(clientQuestReads).toEqual([]);
  });

  test("opens the full Quest detail with context panels in the right column", async ({ page }) => {
    await page.goto(`/quest/${OPEN_QUEST_ID}`);

    await expect(page.locator(".quest-detail-page h1")).toHaveText("Demo Quest 07");
    await expect(page.locator(".record-breadcrumb")).toContainText("Quests");
    await expect(page.locator(".quest-page-alert")).toContainText("Quest State: Open");
    await expect(page.locator(".quest-record-status-bar")).toBeVisible();
    await expect(page.getByText("Quest description", { exact: true })).toBeVisible();
    await expect(page.getByText("Schedule and location", { exact: true })).toBeVisible();
    await expect(page.getByText("Hirer attachments", { exact: true })).toBeVisible();
    await expect(page.getByText("Hirer attachments are not available.", { exact: true })).toBeVisible();
    await expect(page.getByText("Ledger Transactions", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Funding Reservation", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Reserved", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Remaining", { exact: true })).toHaveCount(0);
    await expect(page.getByText("API version", { exact: true })).toHaveCount(0);
    const summary = page.getByRole("heading", { name: "Quest summary", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(summary).toBeVisible();
    await expect(summary.getByRole("heading", { name: "Hirer", exact: true })).toHaveCount(0);
    await expect(summary.getByRole("heading", { name: "Schedule and location", exact: true })).toHaveCount(0);
    await expect(summary.getByRole("heading", { name: "Dispute and risk", exact: true })).toHaveCount(0);
    const side = page.locator(".quest-detail-page > div > div > aside");
    await expect(side).toBeVisible();
    await expect(side.getByRole("heading", { name: "Hirer", exact: true })).toBeVisible();
    const hirer = side.getByRole("heading", { name: "Hirer", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(hirer.getByText("Name", { exact: true })).toBeVisible();
    await expect(hirer.getByText("Member ID", { exact: true })).toBeVisible();
    await expect(hirer.getByRole("link", { name: "See Member profile", exact: true })).toHaveAttribute("href", /\/member\//);
    await expect(side.getByRole("heading", { name: "Schedule and location", exact: true })).toBeVisible();
    await expect(side.getByRole("heading", { name: "Dispute and risk", exact: true })).toBeVisible();
    await expect(side.getByRole("heading", { name: "Quest actions", exact: true })).toBeVisible();
    await expect(side.getByRole("button", { name: "Hide Quest", exact: true })).toBeVisible();
    await expect(side.getByRole("button", { name: "Terminate Quest", exact: true })).toBeVisible();
    await expect(side.locator('section[data-slot="card"]').filter({ hasText: "Financial record" })).toBeVisible();
    const timeline = page.locator('section[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "Overall Quest timeline" }) });
    await expect(timeline.locator('[data-slot="card-header"] > span')).toHaveText("2");
    await expect(timeline).toContainText("Draft → Open");
    const editHistory = page.locator('section[data-slot="card"]').filter({ hasText: "Quest edit history" });
    await expect(editHistory).toContainText("No Quest edits returned.");
    const sidePanelTitles = await side.locator(':scope > section[data-slot="card"]').evaluateAll((panels) => panels.map((panel) => panel.querySelector('[data-slot="card-title"]')?.textContent?.trim()));
    expect(sidePanelTitles.slice(0, 5)).toEqual(["Hirer", "Schedule and location", "Financial record", "Overall Quest timeline", "Dispute and risk"]);
    await expect(page.getByRole("link", { name: "Full Quest detail" })).toHaveCount(0);
    await expect(page.locator(".quest-command-actions")).toHaveCSS("position", "static");

    await page.reload();
    await expect(page.locator(".quest-detail-page h1")).toHaveText("Demo Quest 07");
  });

  test("links Candidate applications to Member profiles", async ({ page }) => {
    await page.goto(`/quest/${CANDIDATE_QUEST_DISPLAY_ID}`);

    const candidates = page.getByRole("heading", { name: "Candidates", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(candidates.getByRole("link", { name: "See Member profile", exact: true })).toHaveAttribute("href", /\/member\//);
  });

  test("opens the detail drawer, returns with Back, and follows Full Quest detail", async ({ page }) => {
    await page.goto("/quest");
    await page.getByRole("link", { name: `Open Quest ${OPEN_BOARD_DISPLAY_ID}` }).click();

    const drawer = page.locator(".quest-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Demo Quest 07");
    await expect(drawer.getByText("Quest summary", { exact: true })).toBeVisible();
    const summary = drawer.getByRole("heading", { name: "Quest summary", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(summary).toBeVisible();
    await expect(summary.locator('.admin-record-fact > span').filter({ hasText: "Hirer" })).toBeVisible();
    await expect(summary.getByRole("heading", { name: "Schedule and location", exact: true })).toBeVisible();
    await expect(summary.getByRole("heading", { name: "Dispute and risk", exact: true })).toHaveCount(0);
    const summaryFactLabels = await summary.locator('.admin-record-facts').first().locator('.admin-record-fact > span').allTextContents();
    expect(summaryFactLabels).toEqual(["Status", "Quest Funding Total", "Participant mode", "Candidate mode", "Quest ID", "Hirer"]);
    const scheduleFacts = summary.locator(".quest-summary-context .admin-record-facts");
    await expect(scheduleFacts).toHaveCSS("column-gap", "32px");
    await expect(scheduleFacts.locator(".admin-record-fact").first().locator("strong > span")).toHaveCSS("white-space", "nowrap");
    await expect(scheduleFacts.locator(".admin-record-fact").nth(1).locator("strong > span")).toHaveCSS("white-space", "nowrap");
    const disputeRisk = drawer.getByRole("heading", { name: "Dispute and risk", exact: true });
    await expect(disputeRisk).toBeVisible();
    const panelTitles = await drawer.locator("h2").allTextContents();
    expect(panelTitles.indexOf("Dispute and risk")).toBeGreaterThan(panelTitles.indexOf("Overall Quest timeline"));
    await expect(drawer.locator(".quest-detail-side").getByRole("heading", { name: "Hirer", exact: true })).toHaveCount(0);
    await expect(drawer.locator(".quest-detail-side").getByRole("heading", { name: "Schedule and location", exact: true })).toHaveCount(0);
    await expect(drawer.locator(".quest-detail-side").getByRole("heading", { name: "Dispute and risk", exact: true })).toHaveCount(0);
    await expect(drawer.getByRole("link", { name: "Full Quest detail" })).toBeVisible();
    const commandActions = drawer.locator(".quest-command-actions");
    await expect(commandActions).toHaveCSS("position", "sticky");
    await expect(commandActions.locator('[data-slot="button"]')).toHaveCount(3);

    const drawerBox = await drawer.boundingBox();
    const viewport = page.viewportSize();
    expect(drawerBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(drawerBox!.x + drawerBox!.width).toBeCloseTo(viewport!.width, 0);

    await page.goBack();
    await expect(page).toHaveURL(/\/quest$/);
    await expect(page.locator(".quest-drawer")).toHaveCount(0);

    await page.getByRole("link", { name: `Open Quest ${OPEN_BOARD_DISPLAY_ID}` }).click();
    await drawer.getByRole("link", { name: "Full Quest detail" }).click();
    await expect(page.locator(".quest-drawer")).toHaveCount(0);
    await expect(page.locator(".quest-detail-page h1")).toHaveText("Demo Quest 07");
  });

  test("counts only the selected Team roster for an assigned Team Quest", async ({ page }) => {
    await page.goto("/quest");
    await page.getByPlaceholder("Search Quests…").fill(TEAM_BOARD_DISPLAY_ID);
    await page.getByRole("link", { name: `Open Quest ${TEAM_BOARD_DISPLAY_ID}` }).click();

    const drawer = page.locator(".quest-drawer");
    await expect(drawer.getByRole("heading", { name: "Candidates", exact: true })).toBeVisible();
    await expect(drawer.getByText("Demo Member 81", { exact: true })).toHaveCount(0);
    await expect(drawer.locator("small").filter({ hasText: "Assignment · Assignment Active" })).toHaveCount(3);
  });

  test("closes the detail drawer when clicking outside it", async ({ page }) => {
    await page.goto("/quest");
    await page.getByRole("link", { name: `Open Quest ${OPEN_BOARD_DISPLAY_ID}` }).click();

    await expect(page.locator(".quest-drawer")).toBeVisible();
    await page.locator(".scrim").click({ position: { x: 20, y: 20 } });

    await expect(page).toHaveURL(/\/quest$/);
    await expect(page.locator(".quest-drawer")).toHaveCount(0);
  });

  test.skip("closes the drawer after opening a Dispute Case", async () => {
    // The current Mock collection contains only failed Quests with linked Dispute Cases.
  });

  test("closes the detail drawer with Escape and returns focus to its opener", async ({ page }) => {
    await page.goto("/quest");
    const opener = page.getByRole("link", { name: `Open Quest ${OPEN_BOARD_DISPLAY_ID}` });
    await opener.focus();
    await opener.click();

    const drawer = page.locator(".quest-drawer");
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL(/\/quest$/);
    await expect(drawer).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("keeps keyboard focus inside the detail drawer", async ({ page }) => {
    await page.goto("/quest");
    await page.getByRole("link", { name: `Open Quest ${OPEN_BOARD_DISPLAY_ID}` }).click();

    const drawer = page.locator(".quest-drawer");
    const focusable = drawer.locator("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])");
    const closeButton = drawer.getByRole("button", { name: "Close Quest detail" });

    await expect(drawer).toBeFocused();
    await expect(page.locator("main").first()).toHaveAttribute("inert", "");

    const lastFocusable = focusable.last();
    await lastFocusable.focus();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(lastFocusable).toBeFocused();
  });

  test.skip("shows Pending Hirer changes from the Quest edit history", async ({ page }) => {
    await page.goto(`/quest/${TEAM_QUEST_ID}`);

    await expect(page.getByText("Pending Hirer changes", { exact: true })).toBeVisible();
    await expect(page.getByText("EDIT_REQUEST_PENDING", { exact: true })).toBeVisible();
    await expect(page.getByText("Complete the revised requested work and submit verifiable evidence.", { exact: true })).toBeVisible();
    await expect(page.getByText("Participant consent", { exact: true })).toBeVisible();
    await expect(page.locator(".response-table").getByText("Nicha Worker", { exact: true })).toBeVisible();
  });

  test("records a Mock Quest Hide command and closes the popup", async ({ page }) => {
    await page.goto(`/quest/${OPEN_QUEST_ID}`);
    await page.getByRole("button", { name: "Hide Quest", exact: true }).click();

    const dialog = page.locator(".quest-command-dialog");
    await dialog.getByRole("textbox", { name: "Reason" }).fill("Unsafe content requires policy review.");
    await dialog.getByRole("combobox", { name: /Reason code/ }).selectOption("POLICY_REVIEW");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect(page.locator(".quest-command-dialog")).toHaveCount(0);
    await expect(page.locator(".admin-action-receipt")).toBeVisible();
    await expect(page.getByText("Hidden", { exact: true }).first()).toBeVisible();
    expect(lastCommandRequests).toHaveLength(0);
  });

  test("records a Mock Quest Restore command and closes the popup", async ({ page }) => {
    await page.goto(`/quest/${HIDDEN_QUEST_ID}`);
    await page.getByRole("button", { name: "Restore Quest", exact: true }).click();

    const dialog = page.locator(".quest-command-dialog");
    await dialog.getByRole("textbox", { name: "Reason" }).fill("The Quest is safe after review.");
    await dialog.getByRole("combobox", { name: /Reason code/ }).selectOption("SAFETY_REVIEW");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect(page.locator(".quest-command-dialog")).toHaveCount(0);
    await expect(page.locator(".admin-action-receipt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Restore Quest" })).toHaveCount(0);
    expect(lastCommandRequests).toHaveLength(0);
  });

  test("records a Mock Quest Terminate command and closes the popup", async ({ page }) => {
    await page.goto(`/quest/${OPEN_QUEST_ID}`);
    await page.getByRole("button", { name: "Terminate Quest", exact: true }).click();

    const dialog = page.locator(".quest-command-dialog");
    await dialog.getByRole("textbox", { name: "Reason" }).fill("The Quest violates the safety policy.");
    await dialog.getByRole("combobox", { name: /Reason code/ }).selectOption("SAFETY_REVIEW");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect(page.locator(".quest-command-dialog")).toHaveCount(0);
    await expect(page.locator(".admin-action-receipt")).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
    expect(lastCommandRequests).toHaveLength(0);
  });

  test("shows not-found behavior for an unknown Quest", async ({ page }) => {
    await page.goto("/quest/00000000-0000-0000-0000-000000000099");

    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
    await expect(page.getByText("The requested Admin record was not found.", { exact: true })).toBeVisible();
  });

  test("links a failed Quest to its Dispute Case", async ({ page }) => {
    await page.goto(`/quest/${FAILED_QUEST_ID}`);

    const disputeLink = page.getByRole("link", { name: "Open Dispute Case" });
    await expect(disputeLink).toHaveAttribute("href", "/dispute/DSP-5201");
  });

  test.skip("opens a Dispute Case for a selected assigned Worker", async () => {
    // The current Mock collection contains only failed Quests with linked Dispute Cases.
  });

});
