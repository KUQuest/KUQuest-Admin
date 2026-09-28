export function countBoardTabMatches<TRecord, TTab extends string>(
  records: readonly TRecord[],
  tabs: readonly { id: TTab }[],
  matchesTab: (record: TRecord, tab: TTab) => boolean,
): Map<TTab, number> {
  return new Map(tabs.map(({ id }) => [
    id,
    records.filter((record) => matchesTab(record, id)).length,
  ] as const));
}
