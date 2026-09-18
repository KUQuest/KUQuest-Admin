import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

type AdminStatusAlertProps = {
  tone: "danger" | "warning" | "success";
  title: ReactNode;
  description: ReactNode;
  badge: ReactNode;
  badgeClassName?: string;
  className?: string;
  as?: "div" | "output";
};

export function AdminStatusAlert({ tone, title, description, badge, badgeClassName, className, as = "div" }: AdminStatusAlertProps) {
  const Component = as;
  const toneClass = tone === "danger"
    ? "bg-admin-danger text-white"
    : tone === "warning"
      ? "bg-admin-warning-soft text-admin-warning"
      : "bg-admin-success-soft text-admin-success";

  return (
    <Component className={cn("mb-[18px] flex items-start gap-3 rounded-admin-md p-[15px] max-[700px]:flex-wrap", toneClass, className)}>
      <span className="shrink-0" aria-hidden="true">⚑</span>
      <div className="min-w-0 flex-1">
        <strong className="block">{title}</strong>
        <p className="mt-[3px] max-w-[72ch] text-inherit">{description}</p>
      </div>
      <span className={cn("badge bg-admin-surface", badgeClassName)}>{badge}</span>
    </Component>
  );
}
