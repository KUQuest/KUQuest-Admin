import { describe, expect, it } from "bun:test";

import { mockQuestDetail, mockQuestSummary } from "../../src/features/admin/quest/quest-mock-data";
import { questDetailViewFromApi } from "../../src/features/admin/quest/quest-model";
import {
  applyMockQuestCommand,
  applyMockQuestOverride,
  questMockOverrideFromDetail,
  readMockQuestOverride,
  saveMockQuestOverride,
} from "../../src/features/admin/quest/quest-mock-state";

function detail() {
  return questDetailViewFromApi(mockQuestDetail(mockQuestSummary({
    id: "quest-mock-state",
    displayId: "QST-MOCK-STATE",
    questStatus: "QUEST_OPEN",
  })));
}

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("Mock Quest command state", () => {
  it("records Hide without changing the Quest State", () => {
    const current = detail();
    const next = applyMockQuestCommand(
      current,
      "hide",
      "Unsafe content requires policy review.",
      "POLICY_REVIEW",
      "2026-09-17T05:00:00.000Z",
    );

    expect(next.state).toBe("QUEST_OPEN");
    expect(next.hiddenAt).toBe("2026-09-17T05:00:00.000Z");
    expect(next.timeline).toEqual(current.timeline);
    expect(next.adminActions).toHaveLength(1);
    expect(next.adminActions[0]).toMatchObject({ action: "QUEST_HIDDEN", reasonCode: "POLICY_REVIEW" });
  });

  it("records Terminate as a Quest State transition", () => {
    const current = detail();
    const next = applyMockQuestCommand(
      current,
      "terminate",
      "The Quest violates the safety policy.",
      "SAFETY_REVIEW",
      "2026-09-17T05:01:00.000Z",
    );

    expect(next.state).toBe("QUEST_CANCELLED");
    expect(next.timeline).toHaveLength(current.timeline.length + 1);
    expect(next.timeline.at(-1)).toMatchObject({
      event: "QUEST_STATUS_CHANGED",
      status: "QUEST_CANCELLED",
      actorId: "mock-admin",
      reasonCode: "SAFETY_REVIEW",
    });
    expect(next.adminActions[0]).toMatchObject({ action: "QUEST_TERMINATED", reasonCode: "SAFETY_REVIEW" });
  });

  it("persists a Mock command and restores it on the next page load", () => {
    const current = detail();
    const next = applyMockQuestCommand(
      current,
      "hide",
      "Unsafe content requires policy review.",
      "POLICY_REVIEW",
      "2026-09-17T05:02:00.000Z",
    );
    const mockStorage = storage();
    const override = questMockOverrideFromDetail(next);

    saveMockQuestOverride(mockStorage, next.id, override);

    expect(readMockQuestOverride(mockStorage, next.id)).toEqual(override);
    expect(applyMockQuestOverride(current, readMockQuestOverride(mockStorage, current.id))).toMatchObject({
      state: "QUEST_OPEN",
      hiddenAt: "2026-09-17T05:02:00.000Z",
      version: current.version + 1,
    });
  });
});
