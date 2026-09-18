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
    <Card className={cn("mb-[18px] grid overflow-hidden [grid-template-columns:repeat(5,minmax(0,1fr))] max-[1000px]:[grid-template-columns:repeat(3,minmax(0,1fr))] max-[700px]:[grid-template-columns:repeat(2,minmax(0,1fr))] max-[500px]:grid-cols-1", className)}>
      {items.map((item) => (
        <div className="border-r border-admin-border px-[15px] py-[13px] last:border-r-0 max-[500px]:border-r-0 max-[500px]:border-b max-[500px]:last:border-b-0" key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </Card>
  );
}
