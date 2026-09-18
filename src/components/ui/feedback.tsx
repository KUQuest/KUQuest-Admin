import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "./badge";

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-admin-soft text-admin-muted",
  info: "bg-admin-accent-soft text-admin-accent-strong",
  success: "bg-admin-success-soft text-admin-success",
  warning: "bg-admin-warning-soft text-admin-warning",
  danger: "bg-admin-danger-soft text-admin-danger",
};

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: BadgeTone;
  title?: string;
  children: ReactNode;
};

export function Alert({ className, tone = "info", title, children, role = "status", ...props }: AlertProps) {
  return (
    <div
      role={role}
      className={cn("rounded-admin-sm border border-admin-border px-4 py-3 text-sm", badgeToneClasses[tone], className)}
      {...props}
    >
      {title ? <strong className="block font-semibold">{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ className, title, description, action, ...props }: EmptyStateProps) {
  return (
    <div className={cn("rounded-admin-md border border-dashed border-admin-border p-6 text-center", className)} {...props}>
      <h3 className="text-base font-semibold text-admin-text">{title}</h3>
      {description ? <p className="mt-1 text-sm text-admin-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
