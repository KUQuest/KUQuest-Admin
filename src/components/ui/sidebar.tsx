import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type SidebarProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Sidebar({ className, children, ...props }: SidebarProps) {
  return <aside data-slot="sidebar" className={cn("flex w-64 flex-col border-r border-admin-border bg-admin-sidebar text-admin-text", className)} {...props}>{children}</aside>;
}

export function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sidebar-header" className={cn("border-b border-admin-border px-4 py-4", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sidebar-content" className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-4", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sidebar-footer" className={cn("border-t border-admin-border px-3 py-4", className)} {...props} />;
}
