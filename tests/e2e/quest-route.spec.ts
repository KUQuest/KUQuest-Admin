import { expect, test, type Page, type Route } from "@playwright/test";

import type {
  AdminQuest,
  AdminQuestDetail,
  AdminQuestFinance,
} from "../../src/features/admin/api/admin-api";

const OPEN_QUEST_ID = "00000000-0000-0000-0000-000000000001";
const TEAM_QUEST_ID = "00000000-0000-0000-0000-000000000002";
const FAILED_QUEST_ID = "00000000-0000-0000-0000-000000000003";
const HIDDEN_QUEST_ID = "00000000-0000-0000-0000-000000000004";
const DISPUTE_CASE_ID = "00000000-0000-0000-0000-000000000101";

const hirer = {
  id: "00000000-0000-0000-0000-000000000010",
  firstName: "Kamonwan",
  lastName: "Lertwiroj",
  email: "hirer@ku.th",
};

function questSummary(overrides: Partial<AdminQuest> = {}): AdminQuest {
  return {
    id: OPEN_QUEST_ID,
    displayId: "QST-OPEN",
    apiVersion: "v1",
    version: 4,
    title: "Inspect campus signs",
    questStatus: "QUEST_OPEN",
    mode: "FIRST_COME_FIRST_SERVED",
    participation: "SINGLE",
    headcount: 1,
    rewardSatang: 12000,
    questFundingTotalSatang: 12240,
    startTime: "2026-09-17T08:48:00.000Z",
    dueAt: "2026-09-24T08:48:00.000Z",
    hiddenAt: null,
    createdAt: "2026-09-14T08:48:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
    hirer,
    ...overrides,
  };
}

const quests = [
  questSummary(),
  questSummary({
    id: TEAM_QUEST_ID,
    displayId: "QST-TEAM",
    title: "Map library access points",
    questStatus: "QUEST_ASSIGNED",
    participation: "GROUP",
  }),
  questSummary({
    id: FAILED_QUEST_ID,
    displayId: "QST-FAILED",
    title: "Review flood route markers",
    questStatus: "QUEST_FAILED",
  }),
  questSummary({
    id: HIDDEN_QUEST_ID,
    displayId: "QST-HIDDEN",
    title: "Restore reviewed campus signs",
    version: 5,
    hiddenAt: "2026-09-14T09:10:00.000Z",
  }),
];

function questDetail(quest: AdminQuest): AdminQuestDetail {
  return {
    ...quest,
    description: `Full description for ${quest.title}.`,
    condition: {
      text: "Complete the requested work and submit verifiable evidence.",
      items: [{ position: 0, text: "Submit the requested work before the due date." }],
    },
    locations: [{ label: "Kasetsart Innovation Centre" }],
    proofRequired: true,
    tagId: null,
    fundingReservationId: "00000000-0000-0000-0000-000000000201",
    policyRevisionId: "00000000-0000-0000-0000-000000000202",
    platformFeeBps: 200,
    platformFeePerWorkerSatang: 240,
    questEscrowSatang: 12240,
    cancelledAt: null,
    cancelledByUserId: null,
    cancelledByAdminId: null,
    candidates: { applications: [], teams: [] },
    assignments: [],
    proofSubmissions: [],
    editHistory: [],
    adminActions: [],
  };
}

function financeDetail(quest: AdminQuest): AdminQuestFinance {
  return {
    quest: {
      id: quest.id,
      title: quest.title,
      questStatus: quest.questStatus,
      headcount: quest.headcount,
      rewardSatang: quest.rewardSatang,
      platformFeePerWorkerSatang: 240,
      questFundingTotalSatang: quest.questFundingTotalSatang,
      hirer: { ...hirer, studentId: "6599900015" },
    },
    reservation: {
      id: "00000000-0000-0000-0000-000000000201",
      status: "ACTIVE",
      totalReservedSatang: 12240,
      remainingSatang: 12240,
      createdAt: "2026-09-14T08:48:00.000Z",
    },
    transfers: [],
    ledgerTransactions: [],
  };
}

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
      const quest = quests.find((item) => item.id === questId) ?? quests[0];
      await fulfill(route, financeDetail(quest));
      return;
    }

    if (url.pathname.startsWith("/api/v1/admin/quests/")) {
      const [questId, action] = url.pathname
        .slice("/api/v1/admin/quests/".length)
        .split("/");
      const quest = quests.find((item) => item.id === questId) ?? quests[0];

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
  await page.context().addCookies([{
    name: "kuquest-admin.mock-session",
    value: "1",
    url: "http://localhost:3002",
  }]);
  lastCommandRequests = await mockAdminApi(page);
});

test.describe("Quest route family", () => {
  test("renders the API Quest Board and keeps search and filters on the canonical route", async ({ page }) => {
    await page.goto("/quest");

    await expect(page).toHaveURL(/\/quest$/);
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
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("Review flood route markers");
  });

  test("opens the full Quest detail directly and keeps the detail action in the drawer only", async ({ page }) => {
    await page.goto(`/quest/${OPEN_QUEST_ID}`);

    await expect(page.locator(".quest-detail-page h1")).toHaveText("Inspect campus signs");
    await expect(page.getByText("Quest description", { exact: true })).toBeVisible();
    await expect(page.getByText("Schedule and location", { exact: true })).toBeVisible();
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

    await page.goBack();
    await expect(page).toHaveURL(/\/quest$/);
    await expect(page.locator(".quest-drawer")).toHaveCount(0);

    await page.getByRole("link", { name: "Open Quest QST-OPEN" }).click();
    await drawer.getByRole("link", { name: "Full Quest detail" }).click();
    await expect(page.locator(".quest-drawer")).toHaveCount(0);
    await expect(page.locator(".quest-detail-page h1")).toHaveText("Inspect campus signs");
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

  test("preserves Quest Restore reason and reason code", async ({ page }) => {
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

  test("links a failed Quest to its Dispute Case", async ({ page }) => {
    await page.goto(`/quest/${FAILED_QUEST_ID}`);

    const disputeLink = page.getByRole("link", { name: "Open Dispute Case" });
    await expect(disputeLink).toHaveAttribute("href", `/dispute/${DISPUTE_CASE_ID}`);
  });
});
