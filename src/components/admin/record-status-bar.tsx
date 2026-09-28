import type { ReactNode } from "react";

import { Card } from "../ui/card";
import { cn } from "../../lib/utils";

export type RecordStatusItem = {
  id: string;
  label: ReactNode;
  value: ReactNode;
};

type RecordStatusBarProps = {
  items: RecordStatusItem[];
  className?: string;
};

/** Shared status summary for full Admin record pages. */
export function RecordStatusBar({ items, className }: RecordStatusBarProps) {
  return (
    <Card className={cn("record-status-bar mb-[18px] grid overflow-hidden !grid-cols-5 max-[1000px]:!grid-cols-3 max-[700px]:!grid-cols-2 max-[500px]:!grid-cols-1", className)}>
      {items.map((item) => (
        <div className="grid min-w-0 !grid-cols-1 !gap-1 border-r border-admin-border px-[15px] py-[13px] last:border-r-0 max-[500px]:border-r-0 max-[500px]:border-b max-[500px]:last:border-b-0" key={item.id}>
          <span className="block min-w-0">{item.label}</span>
          <strong className="block min-w-0 break-words">{item.value}</strong>
        </div>
      ))}
    </Card>
  );
}
