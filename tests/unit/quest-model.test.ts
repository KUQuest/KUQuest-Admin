import { describe, expect, it } from "bun:test";

import type { AdminQuest } from "../../src/features/admin/api/admin-api";
import { mockQuestDetail, mockQuestFinance, mockQuestSummary } from "../../src/features/admin/quest/quest-mock-data";
import {
  formatQuestMoney,
  pageQuestRows,
  questDetailViewFromApi,
  questDisplayIdFor,
  questFinanceViewFromApi,
  questMatchesTab,
  questPageCount,
  questRowFromApi,
  searchQuestRows,
  sortQuestRows,
} from "../../src/features/admin/quest/quest-model";

function quest(overrides: Partial<AdminQuest> = {}): AdminQuest {
  return {
    id: "quest-1",
    apiVersion: "v2",
    version: 3,
    title: "Campus survey",
    questStatus: "QUEST_OPEN",
    mode: "FIRST_COME_FIRST_SERVED",
    participation: "SINGLE",
    headcount: 1,
    rewardSatang: 12000,
    questFundingTotalSatang: 12240,
    startTime: "2026-09-01T01:00:00.000Z",
    dueAt: null,
    hiddenAt: null,
    createdAt: "2026-09-01T01:00:00.000Z",
    updatedAt: "2026-09-02T01:00:00.000Z",
    hirer: {
      id: "member-1",
      firstName: "Ari",
      lastName: "Wattanakul",
      email: "ari@ku.th",
    },
    ...overrides,
  };
}

describe("Quest route model", () => {
  it("maps Admin API Quest detail and Finance DTOs into view models", () => {
    const apiDetail = mockQuestDetail(mockQuestSummary({
      displayId: undefined,
      questStatus: "QUEST_DISPUTED",
    }));
    const apiFinance = mockQuestFinance(apiDetail);

    const detail = questDetailViewFromApi(apiDetail);
    const finance = questFinanceViewFromApi(apiFinance);

    expect(detail).toMatchObject({
      id: apiDetail.id,
      displayId: "00000000…0001",
      title: apiDetail.title,
      state: "QUEST_FAILED",
      hirer: apiDetail.hirer,
    });
    expect("questStatus" in detail).toBe(false);
    expect(detail).not.toBe(apiDetail);
    expect(detail.hirer).not.toBe(apiDetail.hirer);
    expect(finance).toMatchObject({
      quest: {
        id: apiFinance.quest.id,
        title: apiFinance.quest.title,
        state: "QUEST_FAILED",
      },
    });
    expect("questStatus" in finance.quest).toBe(false);
    expect(finance).not.toBe(apiFinance);
  });

  it("uses the API Quest id while keeping an optional display id for the board", () => {
    expect(questRowFromApi(quest({ displayId: "QST-1" }))).toMatchObject({
      id: "quest-1",
      displayId: "QST-1",
      state: "QUEST_OPEN",
      participationLabel: "Solo",
    });
    expect(questRowFromApi(quest())).toMatchObject({ displayId: "quest-1" });
  });

  it("uses a short stable label when a Quest has no display id", () => {
    expect(questDisplayIdFor("00000000-0000-0000-0000-000000000002")).toBe("00000000…0002");
    expect(questDisplayIdFor("quest-1")).toBe("quest-1");
    expect(questDisplayIdFor("quest-1", "QST-12001")).toBe("QST-12001");
  });

  it("maps Team, Solo, and canonical Quest State filters", () => {
    const team = questRowFromApi(quest({ id: "quest-2", participation: "GROUP", questStatus: "QUEST_DISPUTED" }));

    expect(questMatchesTab(team, "team")).toBe(true);
    expect(questMatchesTab(team, "solo")).toBe(false);
    expect(questMatchesTab(team, "QUEST_FAILED")).toBe(true);
    expect(questMatchesTab(team, "QUEST_OPEN")).toBe(false);
  });

  it("searches Quest ids, titles, and Hirer details", () => {
    const rows = [
      questRowFromApi(quest({ id: "quest-1", title: "Campus survey" })),
      questRowFromApi(quest({ id: "quest-2", title: "Library map", hirer: { id: "member-2", firstName: "Benja", lastName: "Ariyawat", email: "benja@ku.th" } })),
    ];

    expect(searchQuestRows(rows, "benja").map((row) => row.id)).toEqual(["quest-2"]);
    expect(searchQuestRows(rows, "quest-1").map((row) => row.id)).toEqual(["quest-1"]);
  });

  it("sorts and paginates without mutating the source rows", () => {
    const rows = [
      questRowFromApi(quest({ id: "quest-1", title: "Zebra", createdAt: "2026-09-01T01:00:00.000Z" })),
      questRowFromApi(quest({ id: "quest-2", title: "Alpha", createdAt: "2026-09-02T01:00:00.000Z" })),
    ];

    expect(sortQuestRows(rows, "title", "ascending").map((row) => row.id)).toEqual(["quest-2", "quest-1"]);
    expect(pageQuestRows(rows, 2, 1).map((row) => row.id)).toEqual(["quest-2"]);
    expect(questPageCount(rows.length, 1)).toBe(2);
    expect(rows.map((row) => row.id)).toEqual(["quest-1", "quest-2"]);
  });

  it("formats integer Satang without inventing missing amounts", () => {
    expect(formatQuestMoney(1)).toBe("฿0.01");
    expect(formatQuestMoney(12000)).toBe("฿120.00");
    expect(formatQuestMoney(null)).toBe("Not provided");
  });
});
