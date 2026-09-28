import type { ReactNode } from "react";

type AdminRecordGridProps = {
  primary: ReactNode;
  side: ReactNode;
};

export function AdminRecordGrid({ primary, side }: AdminRecordGridProps) {
  return (
    <div className="grid items-start gap-[18px] !grid-cols-[minmax(0,1.65fr)_minmax(290px,0.72fr)] max-[1000px]:!grid-cols-1">
      <div className="grid min-w-0 !grid-cols-1 gap-[18px]">{primary}</div>
      <aside className="grid min-w-0 !grid-cols-1 gap-[18px]">{side}</aside>
    </div>
  );
}
