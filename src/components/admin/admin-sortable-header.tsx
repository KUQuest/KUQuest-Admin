"use client";

export type AdminSortDirection = "ascending" | "descending";

export function AdminSortableHeader<T extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: T;
  activeKey: T | null;
  direction: AdminSortDirection;
  onSort: (key: T) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  const indicator = active ? (direction === "ascending" ? "↑" : "↓") : "↕";
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`.trim()}
      scope="col"
      aria-sort={active ? direction : "none"}
    >
      <button
        className={`inline-flex min-h-7 -mx-[7px] -my-1 cursor-pointer items-center gap-[5px] rounded-[5px] border-0 bg-transparent px-[7px] py-1 text-left font-[inherit] text-inherit hover:bg-admin-hover hover:text-admin-text focus-visible:bg-admin-hover focus-visible:text-admin-text ${active ? "text-admin-text" : ""}`.trim()}
        type="button"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <span className={`text-[15px] leading-none ${active ? "text-admin-accent" : "text-admin-muted"}`} aria-hidden="true">{indicator}</span>
      </button>
    </th>
  );
}
