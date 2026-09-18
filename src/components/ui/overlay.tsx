"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./utils";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  if (!open) return null;
  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="admin-dialog-title"
      className="fixed inset-0 z-50 m-0 flex min-h-full w-full max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-admin-bg/70"
      onCancel={(event) => { event.preventDefault(); onOpenChange(false); }}
    >
      <div className={cn("w-full max-w-lg rounded-admin-md border border-admin-border bg-admin-surface text-admin-text shadow-admin", className)}>
        <div className="border-b border-admin-border px-5 py-4">
          <h2 id="admin-dialog-title" className="text-lg font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-admin-muted">{description}</p> : null}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </dialog>
  );
}

export const DialogClose = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function DialogClose(
  { className, children = "Close", onClick, ...props },
  ref,
) {
  return <button ref={ref} type="button" className={cn("rounded-admin-sm px-3 py-2 text-sm font-semibold text-admin-muted hover:bg-admin-hover hover:text-admin-text focus-visible:outline-2 focus-visible:outline-admin-accent", className)} onClick={onClick} {...props}>{children}</button>;
});

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
  if (!open) return null;
  return (
    <>
      <button type="button" aria-label="Close drawer" className="fixed inset-0 z-40 cursor-default bg-admin-bg/70" onClick={() => onOpenChange(false)} />
      <dialog open aria-modal="true" aria-label={typeof title === "string" ? title : undefined} className={cn("fixed inset-y-0 right-0 z-50 m-0 flex w-full max-w-xl flex-col border-l border-admin-border bg-admin-surface p-0 text-admin-text shadow-admin", className)} onCancel={(event) => { event.preventDefault(); onOpenChange(false); }}>
        <header className="flex items-start justify-between gap-4 border-b border-admin-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-admin-muted">{description}</p> : null}
          </div>
          <button type="button" aria-label="Close drawer" className="size-10 rounded-admin-sm text-2xl leading-none text-admin-muted hover:bg-admin-hover hover:text-admin-text focus-visible:outline-2 focus-visible:outline-admin-accent" onClick={() => onOpenChange(false)}>×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {actions ? <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-admin-border px-5 py-4">{actions}</footer> : null}
      </dialog>
    </>
  );
}

export function OverlayFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-3", className)} {...props} />;
}
