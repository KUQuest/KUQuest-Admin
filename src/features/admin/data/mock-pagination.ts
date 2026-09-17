export const MOCK_PAGE_SIZE = 10;

function pageNumberFromCursor(cursor: string | undefined): number {
  const match = cursor?.match(/^mock-page-(\d+)$/);
  const pageNumber = match ? Number(match[1]) : 1;
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
}

export function pageMockItems<T>(
  values: readonly T[],
  cursor: string | undefined,
  pageSize = MOCK_PAGE_SIZE,
): { items: T[]; nextCursor: string | null } {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : MOCK_PAGE_SIZE;
  const pageNumber = pageNumberFromCursor(cursor);
  const start = (pageNumber - 1) * safePageSize;
  const items = values.slice(start, start + safePageSize);
  return {
    items,
    nextCursor: start + items.length < values.length ? `mock-page-${pageNumber + 1}` : null,
  };
}
