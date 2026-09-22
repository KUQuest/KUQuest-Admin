import { describe, expect, it } from "bun:test";

import { countBoardTabMatches } from "../../src/features/admin/data/board-tab-counts";

describe("admin board tab counts", () => {
  it("counts every tab with the board's matching rule", () => {
    const records = ["open", "resolved", "open"];
    const tabs = [
      { id: "all" },
      { id: "open" },
      { id: "resolved" },
      { id: "dismissed" },
    ] as const;

    const counts = countBoardTabMatches(
      records,
      tabs,
      (record, tab) => tab === "all" || record === tab,
    );

    expect([...counts]).toEqual([
      ["all", 3],
      ["open", 2],
      ["resolved", 1],
      ["dismissed", 0],
    ]);
  });
});
