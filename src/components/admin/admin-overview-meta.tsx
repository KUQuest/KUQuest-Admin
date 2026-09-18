import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function AdminOverviewMeta({ className, ...props }: HTMLAttributes<HTMLDListElement>) {
  return <dl className={cn("overview-meta m-0 grid !grid-cols-3 gap-[18px] max-[700px]:!grid-cols-1", className)} {...props} />;
}
