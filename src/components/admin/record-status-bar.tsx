import type { ReactNode } from "react";

import { Card } from "../ui/card";

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
    <Card className={`record-status-bar${className ? ` ${className}` : ""}`}>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </Card>
  );
}
