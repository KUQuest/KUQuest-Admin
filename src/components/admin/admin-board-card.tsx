import type { HTMLAttributes, ReactNode } from "react";

import { Card } from "../ui/card";
import { cn } from "../../lib/utils";

type AdminBoardCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Shared surface for Admin boards. It owns the border, radius, shadow, and clipping. */
export function AdminBoardCard({ className, children, ...props }: AdminBoardCardProps) {
  return (
    <Card as="section" className={cn("overflow-hidden", className)} {...props}>
      {children}
    </Card>
  );
}
