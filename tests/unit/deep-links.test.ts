import { describe, expect, test } from "bun:test";

import { applyRequestedLegacyRecords } from "../../src/features/admin/legacy/deep-links";
import type { LegacyAdminRuntime, LegacyRecord } from "../../src/features/admin/legacy/runtime";

function runtime(): LegacyAdminRuntime {
  return {
    data: {
      disputes: [{ id: "DSP-1" } as LegacyRecord],
      quests: [],
      users: [{ id: "USR-1" } as LegacyRecord],
      payouts: [],
      reports: [],
    },
    navigate() {},
    ensureDetailDrawer() {},
    openDrawer() {},
    closeActiveLayer() {},
    showModalLayer() {
      return () => {};
    },
    toast() {},
    drawer: {} as HTMLElement,
    icon() {
      return "";
    },
  };
}

describe("legacy deep links", () => {
  test("opens a requested dispute after navigating to the dispute board", () => {
    const calls: string[] = [];
    const recordRuntime = runtime();
    recordRuntime.navigate = (view) => calls.push(`navigate:${view}`);
    recordRuntime.ensureDetailDrawer = (view, index) => calls.push(`drawer:${view}:${index}`);

    applyRequestedLegacyRecords(new URLSearchParams("openDispute=DSP-1"), recordRuntime, (callback) => {
      callback(0);
      return 0;
    });

    expect(calls).toEqual(["navigate:disputes", "drawer:disputes:0"]);
  });

  test("opens a requested user and ignores unknown record ids", () => {
    const calls: string[] = [];
    const recordRuntime = runtime();
    recordRuntime.navigate = (view) => calls.push(`navigate:${view}`);
    recordRuntime.openDrawer = (view, index) => calls.push(`drawer:${view}:${index}`);

    applyRequestedLegacyRecords(new URLSearchParams("openUser=USR-1&openDispute=DSP-missing"), recordRuntime, (callback) => {
      callback(0);
      return 0;
    });

    expect(calls).toEqual(["navigate:users", "drawer:users:0"]);
  });
});
