/**
 * Page sizes accepted by admin boards and their pagination helpers.
 *
 * The UI exposes the fixed option set below, while the model helpers also
 * accept any positive numeric size for focused tests and non-UI callers.
 */
export type BoardPageSize = number | "all";

export const BOARD_PAGE_SIZE_OPTIONS = [10, 25, 50, "all"] as const satisfies readonly BoardPageSize[];

export type BoardPageOption = (typeof BOARD_PAGE_SIZE_OPTIONS)[number];

export function pageCount(rowCount: number, pageSize: BoardPageSize): number {
  if (pageSize === "all") return rowCount ? 1 : 0;
  return Math.ceil(rowCount / pageSize);
}

export function pageRows<T>(rows: readonly T[], page: number, pageSize: BoardPageSize): T[] {
  if (pageSize === "all") return [...rows];
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function pageRange(
  rowCount: number,
  page: number,
  pageSize: BoardPageSize,
): { start: number; end: number } {
  if (!rowCount) return { start: 0, end: 0 };
  if (pageSize === "all") return { start: 1, end: rowCount };
  const start = Math.min((Math.max(1, page) - 1) * pageSize + 1, rowCount);
  return { start, end: Math.min(start + pageSize - 1, rowCount) };
}
