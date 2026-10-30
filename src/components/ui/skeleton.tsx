import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("animate-pulse rounded-admin-sm bg-admin-soft", className)} {...props} />;
}

export { Skeleton };
