export type BoardSortDirection = "ascending" | "descending";
export type BoardSortValue = string | number | null | undefined;

const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function sortBoardRows<T>(
  rows: readonly T[],
  valueFor: (row: T) => BoardSortValue,
  direction: BoardSortDirection,
): T[] {
  return rows
    .map((row, index) => ({ row, index, value: valueFor(row) }))
    .toSorted((left, right) => {
      const leftEmpty = left.value === null || left.value === undefined || left.value === "";
      const rightEmpty = right.value === null || right.value === undefined || right.value === "";
      if (leftEmpty || rightEmpty) {
        if (leftEmpty && rightEmpty) return left.index - right.index;
        return leftEmpty ? 1 : -1;
      }

      const comparison = typeof left.value === "number" && typeof right.value === "number"
        ? left.value - right.value
        : textCollator.compare(String(left.value), String(right.value));
      if (comparison === 0) return left.index - right.index;
      return direction === "ascending" ? comparison : -comparison;
    })
    .map(({ row }) => row);
}

export function toggleBoardSort(
  activeKey: string | null,
  nextKey: string,
  direction: BoardSortDirection,
): BoardSortDirection {
  return activeKey === nextKey
    ? direction === "ascending" ? "descending" : "ascending"
    : "ascending";
}

export function dateSortValue(value: string | null | undefined): number | string | null {
  if (!value) return null;
  const timestamp = Date.parse(value.replace(" · ", " "));
  return Number.isNaN(timestamp) ? value : timestamp;
}
