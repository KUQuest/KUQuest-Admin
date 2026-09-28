"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50 bg-admin-bg/70" />
        <DialogPrimitive.Content data-slot="dialog-content" className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-admin-md border border-admin-border bg-admin-surface text-admin-text shadow-admin", className)}>
          <div className="border-b border-admin-border px-5 py-4">
            <DialogPrimitive.Title data-slot="dialog-title" className="text-lg font-semibold">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description data-slot="dialog-description" className="mt-1 text-sm text-admin-muted">{description}</DialogPrimitive.Description> : null}
          </div>
          <div className="p-5">{children}</div>
          <DialogPrimitive.Close aria-label="Close dialog" className="absolute right-4 top-4 rounded-admin-sm p-2 text-admin-muted hover:bg-admin-hover hover:text-admin-text focus-visible:outline-2 focus-visible:outline-admin-accent"><X className="size-4" /></DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DialogClose = DialogPrimitive.Close;

export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function Drawer({ open, onOpenChange, title, description, children, actions, className }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-slot="drawer-overlay" className="fixed inset-0 z-40 bg-admin-bg/70" />
        <DialogPrimitive.Content data-slot="drawer-content" className={cn("fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-admin-border bg-admin-surface p-0 text-admin-text shadow-admin", className)}>
          <header className="flex items-start justify-between gap-4 border-b border-admin-border px-5 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description className="mt-1 text-sm text-admin-muted">{description}</DialogPrimitive.Description> : null}
            </div>
            <DialogPrimitive.Close aria-label="Close drawer" className="rounded-admin-sm p-2 text-admin-muted hover:bg-admin-hover hover:text-admin-text focus-visible:outline-2 focus-visible:outline-admin-accent"><X className="size-5" /></DialogPrimitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {actions ? <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-admin-border px-5 py-4">{actions}</footer> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function OverlayFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-3", className)} {...props} />;
}
