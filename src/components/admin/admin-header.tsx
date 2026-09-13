"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type AdminHeaderProps = {
  mobileNavigationOpen: boolean;
  onToggleNavigation: () => void;
  translateText: (value: string) => string;
};

export function AdminHeader({
  mobileNavigationOpen,
  onToggleNavigation,
  translateText,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasNavigationOpen = useRef(false);
  const previousPathname = useRef(pathname);
  const restoreFocusAfterNavigation = useRef(false);

  useEffect(() => {
    if (wasNavigationOpen.current && !mobileNavigationOpen) {
      restoreFocusAfterNavigation.current = true;
      menuButtonRef.current?.focus();
    }
    wasNavigationOpen.current = mobileNavigationOpen;
  }, [mobileNavigationOpen]);

  useEffect(() => {
    if (previousPathname.current !== pathname && restoreFocusAfterNavigation.current) {
      window.setTimeout(() => {
        if (window.matchMedia("(max-width: 900px)").matches) menuButtonRef.current?.focus();
      }, 0);
      restoreFocusAfterNavigation.current = false;
    }
    previousPathname.current = pathname;
  }, [pathname]);

  return (
    <header>
      <button
        className="icon mobile"
        type="button"
        ref={menuButtonRef}
        aria-label={translateText(mobileNavigationOpen ? "Close navigation" : "Open navigation")}
        aria-controls="site-navigation"
        aria-expanded={mobileNavigationOpen}
        onClick={onToggleNavigation}
      >
        <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <span className="admin-shell-title">KUQuest Admin</span>
      <span className="demo"><i />{pathname}</span>
    </header>
  );
}
