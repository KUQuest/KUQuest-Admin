import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const badgeToneClasses = {
  neutral: "bg-admin-soft text-admin-muted",
  info: "bg-admin-accent-soft text-admin-accent-strong",
  success: "bg-admin-success-soft text-admin-success",
  warning: "bg-admin-warning-soft text-admin-warning",
  danger: "bg-admin-danger-soft text-admin-danger",
} as const;

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium leading-none", {
  variants: { tone: badgeToneClasses },
  defaultVariants: { tone: "neutral" },
});

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone, className }))} {...props} />;
}
