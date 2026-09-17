export type AdminBoardPageSize = 10 | 25 | 50 | "all";

export const ADMIN_BOARD_PAGE_SIZES = [10, 25, 50, "all"] as const satisfies readonly AdminBoardPageSize[];

export function pageCount(rowCount: number, pageSize: AdminBoardPageSize): number {
  if (pageSize === "all") return rowCount ? 1 : 0;
  return Math.ceil(rowCount / pageSize);
}

export function pageRows<T>(rows: readonly T[], page: number, pageSize: AdminBoardPageSize): T[] {
  if (pageSize === "all") return [...rows];
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function pageRange(
  rowCount: number,
  page: number,
  pageSize: AdminBoardPageSize,
): { start: number; end: number } {
  if (!rowCount) return { start: 0, end: 0 };
  if (pageSize === "all") return { start: 1, end: rowCount };
  const start = Math.min((Math.max(1, page) - 1) * pageSize + 1, rowCount);
  return { start, end: Math.min(start + pageSize - 1, rowCount) };
}
