import { describe, expect, test } from "bun:test";

import { dateSortValue, sortBoardRows, toggleBoardSort } from "../../src/features/admin/data/board-sorting";

describe("Admin moderation board sorting", () => {
  test("sorts text and keeps empty values at the end", () => {
    const rows = [
      { id: "RPT-10", member: "Zed" },
      { id: "RPT-2", member: null },
      { id: "RPT-1", member: "Ada" },
    ];

    expect(sortBoardRows(rows, (row) => row.member, "ascending").map((row) => row.id)).toEqual(["RPT-1", "RPT-10", "RPT-2"]);
    expect(sortBoardRows(rows, (row) => row.member, "descending").map((row) => row.id)).toEqual(["RPT-10", "RPT-1", "RPT-2"]);
  });

  test("sorts dates and numbers in both directions", () => {
    const rows = [
      { id: "old", at: "2026-09-01T00:00:00Z", amount: 300 },
      { id: "new", at: "2026-09-03T00:00:00Z", amount: 100 },
      { id: "middle", at: "2026-09-02T00:00:00Z", amount: 200 },
    ];

    expect(sortBoardRows(rows, (row) => dateSortValue(row.at), "ascending").map((row) => row.id)).toEqual(["old", "middle", "new"]);
    expect(sortBoardRows(rows, (row) => row.amount, "descending").map((row) => row.id)).toEqual(["old", "middle", "new"]);
    expect(dateSortValue("03 Sep 2026 · 10:30")).toBe(Date.parse("03 Sep 2026 10:30"));
  });

  test("toggles the active column and starts a new column ascending", () => {
    expect(toggleBoardSort(null, "status", "ascending")).toBe("ascending");
    expect(toggleBoardSort("status", "status", "ascending")).toBe("descending");
    expect(toggleBoardSort("status", "status", "descending")).toBe("ascending");
    expect(toggleBoardSort("status", "opened", "descending")).toBe("ascending");
  });
});
