"use client";

import { useEffect, useRef, type ReactNode } from "react";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type AdminDrawerProps = {
  ariaLabel: string;
  title: ReactNode;
  titleId: string;
  subtitle: ReactNode;
  className?: string;
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
    <button className="scrim" type="button" tabIndex={-1} aria-label={ariaLabel} onClick={onClose} />
    <dialog ref={drawerRef} className={`drawer open${className ? ` ${className}` : ""}`} aria-modal="true" aria-labelledby={titleId} tabIndex={-1} open>
      <div className="drawer-top"><div><strong id={titleId}>{title}</strong><small>{subtitle}</small></div><button className="icon" type="button" aria-label={ariaLabel} onClick={onClose}><span className="close-lines" /></button></div>
      <div className="drawer-body">{children}</div>
      {actions ? <div className="drawer-actions">{actions}</div> : null}
    </dialog>
  </>;
}
