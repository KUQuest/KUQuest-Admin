import { describe, expect, it } from "bun:test";

import type { AdminQuest } from "../../src/features/admin/api/admin-api";
import { questRecordFromApiSummary } from "../../src/features/admin/legacy/live-review-data";
import { questRowFromApi } from "../../src/features/admin/quest/quest-model";

const apiQuest: AdminQuest = {
  id: "00000000-0000-0000-0000-000000000001",
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
  hirer: {
    id: "00000000-0000-0000-0000-000000000010",
    firstName: "Kamonwan",
    lastName: "Lertwiroj",
    email: "hirer@ku.th",
  },
};

describe("Quest route parity", () => {
  it("keeps the canonical Quest Board and legacy live adapter on the same API identity", () => {
    const boardRow = questRowFromApi(apiQuest);
    const legacyRecord = questRecordFromApiSummary(apiQuest);

    expect(legacyRecord.id).toBe(boardRow.id);
    expect(legacyRecord.title).toBe(boardRow.title);
    expect(legacyRecord.questState).toBe(boardRow.state);
    expect(legacyRecord.createdAt).toBe(boardRow.createdAt);
  });
});
