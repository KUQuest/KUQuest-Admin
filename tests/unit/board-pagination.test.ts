import { describe, expect, it } from "bun:test";

import {
  ADMIN_BOARD_PAGE_SIZES,
  pageCount,
  pageRange,
  pageRows,
} from "../../src/features/admin/data/board-pagination";

describe("admin board pagination", () => {
  it("offers the standard Admin page sizes", () => {
    expect(ADMIN_BOARD_PAGE_SIZES).toEqual([10, 25, 50, "all"]);
  });

  it("slices rows and reports page ranges", () => {
    const rows = Array.from({ length: 57 }, (_, index) => index + 1);

    expect(pageRows(rows, 2, 25)).toEqual(rows.slice(25, 50));
    expect(pageCount(rows.length, 25)).toBe(3);
    expect(pageRange(rows.length, 3, 25)).toEqual({ start: 51, end: 57 });
  });

  it("returns the complete collection for All", () => {
    const rows = Array.from({ length: 200 }, (_, index) => index + 1);

    expect(pageRows(rows, 4, "all")).toEqual(rows);
    expect(pageCount(rows.length, "all")).toBe(1);
    expect(pageRange(rows.length, 4, "all")).toEqual({ start: 1, end: 200 });
  });
});
