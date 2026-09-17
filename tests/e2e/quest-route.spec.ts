import { expect, test, type Page, type Route } from "@playwright/test";

import {
  MOCK_ASSIGNED_WORKER_ID as ASSIGNED_WORKER_ID,
  MOCK_DISPUTE_CASE_ID as DISPUTE_CASE_ID,
  MOCK_FAILED_QUEST_ID as FAILED_QUEST_ID,
  MOCK_HIDDEN_QUEST_ID as HIDDEN_QUEST_ID,
  MOCK_NEW_DISPUTE_CASE_ID as NEW_DISPUTE_CASE_ID,
  MOCK_OPEN_QUEST_ID as OPEN_QUEST_ID,
  MOCK_TEAM_QUEST_ID as TEAM_QUEST_ID,
  MOCK_UNLINKED_FAILED_QUEST_ID as UNLINKED_FAILED_QUEST_ID,
  assignedWorker,
  mockHirer as hirer,
  mockQuestDetail as questDetail,
  mockQuestFinance as financeDetail,
  mockQuests as quests,
  mockUnlinkedFailedQuest as unlinkedFailedQuest,
} from "../../src/features/admin/quest/quest-mock-data";

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
      await fulfill(route, { items: quests, nextCursor: null });
      return;
    }

    if (url.pathname.startsWith("/api/v1/admin/finance/quests/")) {
      const questId = url.pathname.split("/").at(-1);
      const quest = quests.find((item) => item.id === questId)
        ?? (questId === UNLINKED_FAILED_QUEST_ID ? unlinkedFailedQuest : undefined);
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
      const quest = quests.find((item) => item.id === questId)
        ?? (questId === UNLINKED_FAILED_QUEST_ID ? unlinkedFailedQuest : undefined);
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
      await fulfill(route, {
        id: NEW_DISPUTE_CASE_ID,
        questId,
        filerUserId: hirer.id,
        openedByAdminId: "00000000-0000-0000-0000-000000000099",
        status: "DISPUTE_CASE_PENDING",
        version: 1,
        resolvedWorkerId: null,
        resolvedAmountSatang: null,
        resolvedByAdminId: null,
        resolvedAt: null,
        createdAt: "2026-09-14T10:00:00.000Z",
        updatedAt: "2026-09-14T10:00:00.000Z",
      });
      return;
    }

    if (url.pathname === "/api/v1/admin/disputes") {
      await fulfill(route, {
        items: [{
          id: DISPUTE_CASE_ID,
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
    await expect(page.getByRole("link", { name: "Open Quest QST-OPEN" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Quests" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Quest QST-OPEN" })).toBeVisible();

    await page.getByPlaceholder("Search Quests…").fill("library");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("Map library access points");

    await page.getByPlaceholder("Search Quests…").fill("");
    await page.getByRole("button", { name: "Team", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("Map library access points");

    await page.getByRole("button", { name: "Failed", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(page.locator("tbody tr").first()).toContainText("Review flood route markers");
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

  test("opens the full Quest detail directly and keeps the detail action in the drawer only", async ({ page }) => {
    await page.goto(`/quest/${OPEN_QUEST_ID}`);

    await expect(page.locator(".quest-detail-page h1")).toHaveText("Inspect campus signs");
    await expect(page.getByText("Quest description", { exact: true })).toBeVisible();
    await expect(page.getByText("Schedule and location", { exact: true })).toBeVisible();
    await expect(page.getByText("Hirer attachments", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Hirer attachment 1" })).toBeVisible();
    await expect(page.getByText("Ledger Transactions", { exact: true })).toBeVisible();
    await expect(page.getByText("Quest Funding Reserved", { exact: true })).toBeVisible();
    await expect(page.getByText("Funding Reservation created for the Quest.", { exact: true })).toBeVisible();
    await expect(page.getByText("API version", { exact: true })).toHaveCount(0);
    const timeline = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Overall Quest timeline" }) });
    await expect(timeline.locator(".section-count")).toHaveText("1");
    await expect(page.getByRole("link", { name: "Full Quest detail" })).toHaveCount(0);

    await page.reload();
    await expect(page.locator(".quest-detail-page h1")).toHaveText("Inspect campus signs");
  });

  test("opens the detail drawer, returns with Back, and follows Full Quest detail", async ({ page }) => {
    await page.goto("/quest");
    await page.getByRole("link", { name: "Open Quest QST-OPEN" }).click();

    const drawer = page.locator(".quest-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Inspect campus signs");
    await expect(drawer.getByText("Quest summary", { exact: true })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Full Quest detail" })).toBeVisible();

    const drawerBox = await drawer.boundingBox();
    const viewport = page.viewportSize();
    expect(drawerBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(drawerBox!.x + drawerBox!.width).toBeCloseTo(viewport!.width, 0);

    await page.goBack();
    await expect(page).toHaveURL(/\/quest$/);
    await expect(page.locator(".quest-drawer")).toHaveCount(0);

    await page.getByRole("link", { name: "Open Quest QST-OPEN" }).click();
    await drawer.getByRole("link", { name: "Full Quest detail" }).click();
    await expect(page.locator(".quest-drawer")).toHaveCount(0);
    await expect(page.locator(".quest-detail-page h1")).toHaveText("Inspect campus signs");
  });

  test("closes the detail drawer when clicking outside it", async ({ page }) => {
    await page.goto("/quest");
    await page.getByRole("link", { name: "Open Quest QST-OPEN" }).click();

    await expect(page.locator(".quest-drawer")).toBeVisible();
    await page.locator(".scrim").click();

    await expect(page).toHaveURL(/\/quest$/);
    await expect(page.locator(".quest-drawer")).toHaveCount(0);
  });

  test("closes the drawer after opening a Dispute Case", async ({ page }) => {
    await page.goto("/quest");
    await page.getByRole("link", { name: "Open Quest QST-NO-DISPUTE" }).click();
    const drawer = page.locator(".quest-drawer");
    await expect(drawer.getByRole("button", { name: "Open Dispute Case", exact: true })).toBeVisible();
    await drawer.getByRole("combobox", { name: "Worker" }).selectOption(ASSIGNED_WORKER_ID);
    page.once("dialog", (dialog) => dialog.accept());
    await drawer.getByRole("button", { name: "Open Dispute Case", exact: true }).click();

    await expect.poll(() => lastCommandRequests.length).toBe(1);
    await expect(page).toHaveURL(/\/quest$/);
    await expect(drawer).toHaveCount(0);
  });

  test("closes the detail drawer with Escape and returns focus to its opener", async ({ page }) => {
    await page.goto("/quest");
    const opener = page.getByRole("link", { name: "Open Quest QST-OPEN" });
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
    await page.getByRole("link", { name: "Open Quest QST-OPEN" }).click();

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

  test("shows Pending Hirer changes from the Quest edit history", async ({ page }) => {
    await page.goto(`/quest/${TEAM_QUEST_ID}`);

    await expect(page.getByText("Pending Hirer changes", { exact: true })).toBeVisible();
    await expect(page.getByText("EDIT_REQUEST_PENDING", { exact: true })).toBeVisible();
    await expect(page.getByText("Complete the revised requested work and submit verifiable evidence.", { exact: true })).toBeVisible();
    await expect(page.getByText("Participant consent", { exact: true })).toBeVisible();
    await expect(page.locator(".response-table").getByText("Nicha Worker", { exact: true })).toBeVisible();
  });

  test("preserves Quest Hide command reason code and concurrency headers", async ({ page }) => {
    await page.goto(`/quest/${OPEN_QUEST_ID}`);
    await page.getByRole("button", { name: "Hide Quest", exact: true }).click();

    const dialog = page.locator(".quest-command-dialog");
    await dialog.getByRole("textbox", { name: "Reason" }).fill("Unsafe content requires policy review.");
    await dialog.getByRole("combobox", { name: /Reason code/ }).selectOption("POLICY_REVIEW");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect.poll(() => lastCommandRequests.length).toBe(1);
    expect(lastCommandRequests[0]).toMatchObject({
      action: "hide",
      body: {
        reason: "Unsafe content requires policy review.",
        reasonCode: "POLICY_REVIEW",
      },
      resourceVersion: "4",
    });
    expect(lastCommandRequests[0]?.idempotencyKey).toMatch(/^admin-hide-quest-/);
  });

  test("preserves Quest Restore reason and reason code with concurrency headers", async ({ page }) => {
    await page.goto(`/quest/${HIDDEN_QUEST_ID}`);
    await page.getByRole("button", { name: "Restore Quest", exact: true }).click();

    const dialog = page.locator(".quest-command-dialog");
    await dialog.getByRole("textbox", { name: "Reason" }).fill("The Quest is safe after review.");
    await dialog.getByRole("combobox", { name: /Reason code/ }).selectOption("SAFETY_REVIEW");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect.poll(() => lastCommandRequests.length).toBe(1);
    expect(lastCommandRequests[0]).toMatchObject({
      action: "restore",
      body: {
        reason: "The Quest is safe after review.",
        reasonCode: "SAFETY_REVIEW",
      },
      resourceVersion: "5",
    });
    expect(lastCommandRequests[0]?.idempotencyKey).toMatch(/^admin-restore-quest-/);
  });

  test("preserves Quest Terminate reason code and concurrency headers", async ({ page }) => {
    await page.goto(`/quest/${OPEN_QUEST_ID}`);
    await page.getByRole("button", { name: "Terminate Quest", exact: true }).click();

    const dialog = page.locator(".quest-command-dialog");
    await dialog.getByRole("textbox", { name: "Reason" }).fill("The Quest violates the safety policy.");
    await dialog.getByRole("combobox", { name: /Reason code/ }).selectOption("SAFETY_REVIEW");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();

    await expect.poll(() => lastCommandRequests.length).toBe(1);
    expect(lastCommandRequests[0]).toMatchObject({
      action: "terminate",
      body: {
        reason: "The Quest violates the safety policy.",
        reasonCode: "SAFETY_REVIEW",
      },
      resourceVersion: "4",
    });
    expect(lastCommandRequests[0]?.idempotencyKey).toMatch(/^admin-terminate-quest-/);
  });

  test("shows not-found behavior for an unknown Quest", async ({ page }) => {
    await page.goto("/quest/00000000-0000-0000-0000-000000000099");

    await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
    await expect(page.getByText("The requested Admin record was not found.", { exact: true })).toBeVisible();
  });

  test("links a failed Quest to its Dispute Case", async ({ page }) => {
    await page.goto(`/quest/${FAILED_QUEST_ID}`);

    const disputeLink = page.getByRole("link", { name: "Open Dispute Case" });
    await expect(disputeLink).toHaveAttribute("href", `/dispute/${DISPUTE_CASE_ID}`);
  });

  test("opens a Dispute Case for a selected assigned Worker", async ({ page }) => {
    await page.goto(`/quest/${UNLINKED_FAILED_QUEST_ID}`);

    await expect(page.getByText(
      "This Quest is in QUEST_FAILED, but no linked Dispute Case was returned by the Admin API.",
      { exact: true },
    )).toBeVisible();
    await page.getByRole("combobox", { name: "Worker" }).selectOption(ASSIGNED_WORKER_ID);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Open Dispute Case", exact: true }).click();

    await expect.poll(() => lastCommandRequests.length).toBe(1);
    expect(lastCommandRequests[0]).toMatchObject({
      action: "open",
      body: { workerId: ASSIGNED_WORKER_ID },
    });
    await expect(page.getByText("A Dispute Case is linked to this Quest.", { exact: true })).toBeVisible();
  });

});
