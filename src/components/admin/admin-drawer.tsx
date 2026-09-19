"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "../ui/button";
import { CardContent, CardFooter, CardHeader } from "../ui/card";
import { cn } from "../ui/utils";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type AdminDrawerProps = {
  ariaLabel: string;
  title: ReactNode;
  titleId: string;
  subtitle: ReactNode;
  className?: string;
  closeButtonAriaLabel?: string;
  opener?: HTMLElement | null;
  openerAttribute?: string;
  openerValue?: string;
  outsideClassName?: string;
  escapeDisabled?: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
};

export function AdminDrawer({
  ariaLabel,
  title,
  titleId,
  subtitle,
  className,
  closeButtonAriaLabel,
  opener,
  openerAttribute,
  openerValue,
  outsideClassName,
  escapeDisabled = false,
  onClose,
  children,
  actions,
}: AdminDrawerProps) {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const escapeDisabledRef = useRef(escapeDisabled);
  onCloseRef.current = onClose;
  escapeDisabledRef.current = escapeDisabled;

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    const activeElement = document.activeElement;
    const matchingOpener = openerAttribute
      ? Array.from(document.querySelectorAll<HTMLElement>(`[${openerAttribute}]`)).find((element) => (
        element.getAttribute(openerAttribute) === openerValue
        && (element.tagName === "A" || element.tagName === "BUTTON")
      ))
      : null;
    openerRef.current = opener?.isConnected
      ? opener
      : activeElement instanceof HTMLElement && (!openerAttribute || activeElement.getAttribute(openerAttribute) === openerValue)
      ? activeElement
      : matchingOpener ?? null;

    const shell = drawer.closest<HTMLElement>(".admin-shell");
    const outsideElements = shell
      ? Array.from(shell.querySelectorAll<HTMLElement>("*")).filter((element) => (
        element instanceof HTMLElement
        && element !== drawer
        && !drawer.contains(element)
        && !element.contains(drawer)
        && !element.closest(".scrim")
        && (!outsideClassName || !element.closest(`.${outsideClassName}`))
      ))
      : [];
    const previousInert = outsideElements.map((element) => element.inert);
    outsideElements.forEach((element) => { element.inert = true; });
    const focusableElements = () => Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.getClientRects().length > 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (escapeDisabledRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus({ preventScroll: true });
        return;
      }
      const current = document.activeElement;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (current === drawer || current === first || !drawer.contains(current))) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (current === last || !drawer.contains(current))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const restoreFocus = (attempt = 0) => {
      const target = openerRef.current?.isConnected
        ? openerRef.current
        : openerAttribute
        ? Array.from(document.querySelectorAll<HTMLElement>(`[${openerAttribute}]`)).find((element) => (
          element.getAttribute(openerAttribute) === openerValue
          && (element.tagName === "A" || element.tagName === "BUTTON")
        ))
        : null;
      if (target) target.focus({ preventScroll: true });
      if (!target && attempt < 60) requestAnimationFrame(() => restoreFocus(attempt + 1));
    };

    document.addEventListener("keydown", handleKeyDown);
    drawer.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      outsideElements.forEach((element, index) => { element.inert = previousInert[index] ?? false; });
      restoreFocus();
    };
  }, [opener, openerAttribute, openerValue, outsideClassName]);

  return <>
    <button className="scrim fixed inset-0 z-40 cursor-default border-0 bg-admin-scrim p-0" type="button" tabIndex={-1} aria-label={ariaLabel} onClick={onClose} />
    <dialog ref={drawerRef} data-slot="admin-drawer" className={cn("drawer open fixed inset-y-0 right-0 z-[45] m-0 flex h-dvh w-full max-w-[640px] flex-col overflow-hidden border-0 bg-admin-surface p-0 shadow-admin", className)} aria-modal="true" aria-labelledby={titleId} tabIndex={-1} open>
      <CardHeader flush data-slot="drawer-header" className="drawer-top sticky top-0 z-[3] flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-admin-border bg-admin-surface/95 px-5 py-3 backdrop-blur-md"><div className="min-w-0"><strong id={titleId} className="block text-lg font-semibold leading-tight text-admin-text">{title}</strong><small className="mt-0.5 block text-sm text-admin-muted">{subtitle}</small></div><Button variant="ghost" size="icon" className="icon shrink-0" type="button" aria-label={closeButtonAriaLabel ?? ariaLabel} onClick={onClose}><span className="close-lines" /></Button></CardHeader>
      <CardContent flush data-slot="drawer-content" className="drawer-body admin-drawer-content min-h-0 flex-1 overflow-y-auto px-6 py-5 pb-28">{children}</CardContent>
      {actions ? <CardFooter flush data-slot="drawer-footer" className="drawer-actions sticky bottom-0 z-[3] flex shrink-0 flex-col gap-2 border-t border-admin-border bg-admin-surface/95 px-5 py-3 backdrop-blur-md md:flex-row">{actions}</CardFooter> : null}
    </dialog>
  </>;
}
