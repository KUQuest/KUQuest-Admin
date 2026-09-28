import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function AdminOverviewMeta({ className, ...props }: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl
      data-slot="admin-overview-meta"
      className={cn(
        "m-0 grid grid-cols-3 gap-[18px] max-[700px]:grid-cols-1 [&>div]:min-w-0 [&_dt]:mb-1 [&_dt]:text-xs [&_dt]:font-semibold [&_dt]:leading-[1.4] [&_dt]:text-admin-muted [&_dd]:m-0 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:leading-[1.4]",
        className,
      )}
      {...props}
    />
  );
}
