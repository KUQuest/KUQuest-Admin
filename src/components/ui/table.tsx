import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    data-slot="table"
    className={cn(
      "w-full min-w-[40rem] border-collapse text-left text-sm text-admin-text",
      "[&_caption]:sr-only [&_thead]:border-b [&_thead]:border-admin-border [&_thead]:bg-admin-soft",
      "[&_th]:h-10 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-admin-muted",
      "[&_tbody>tr]:border-b [&_tbody>tr]:border-admin-border-subtle [&_tbody>tr:hover]:bg-admin-hover",
      "[&_td]:h-[58px] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
      "[&_td>strong]:block [&_td_small]:mt-0.5 [&_td_small]:block [&_td_small]:text-xs [&_td_small]:text-admin-muted",
      className,
    )}
    {...props}
  />
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} data-slot="table-header" className={cn("border-b border-admin-border bg-admin-soft text-admin-muted", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} data-slot="table-body" className={cn("divide-y divide-admin-border", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} data-slot="table-row" className={cn("hover:bg-admin-hover", className)} {...props} />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th ref={ref} scope="col" data-slot="table-head" className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide", className)} {...props} />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} data-slot="table-cell" className={cn("px-4 py-3 align-top text-admin-text", className)} {...props} />
));
TableCell.displayName = "TableCell";
