"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type AdminModalPortalProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
};

/**
 * Mount a blocking Admin modal outside a drawer's transformed scroll region.
 * The layer owns centering and keyboard focus so every decision form uses the
 * same viewport surface.
 */
export function AdminModalPortal({ open, onClose, children }: AdminModalPortalProps) {
  const [mounted, setMounted] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted || !open) return;
    const layer = layerRef.current;
    if (!layer) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = () => Array.from(layer.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.getClientRects().length > 0);
    const firstFocusable = () => focusableElements()[0] ?? layer.querySelector<HTMLElement>("dialog") ?? layer;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      event.stopPropagation();
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        layer.focus({ preventScroll: true });
        return;
      }
      const current = document.activeElement;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (current === first || !layer.contains(current))) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (current === last || !layer.contains(current))) {
        event.preventDefault();
        first?.focus({ preventScroll: true });
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target === layer) onCloseRef.current?.();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    layer.addEventListener("pointerdown", handlePointerDown);
    const frame = window.requestAnimationFrame(() => firstFocusable()?.focus({ preventScroll: true }));

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown, true);
      layer.removeEventListener("pointerdown", handlePointerDown);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [mounted, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div ref={layerRef} className="admin-modal-layer" role="presentation" tabIndex={-1}>
      {children}
    </div>,
    document.body,
  );
}
