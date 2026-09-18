import type { HTMLAttributes, TableHTMLAttributes } from "react";
import { cn } from "./utils";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[40rem] border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-admin-border bg-admin-soft text-admin-muted", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-admin-border", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-admin-hover", className)} {...props} />;
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide", className)} {...props} />;
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-top text-admin-text", className)} {...props} />;
}
