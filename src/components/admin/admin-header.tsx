"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "../ui/button";

type AdminHeaderProps = {
  mobileNavigationOpen: boolean;
  onToggleNavigation: () => void;
  onOpenSearch: () => void;
  translateText: (value: string) => string;
};

export function AdminHeader({
  mobileNavigationOpen,
  onToggleNavigation,
  onOpenSearch,
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
    <header className="admin-shell-header col-start-2 sticky top-0 z-[15] flex items-center gap-2 px-[22px] py-2 bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] border-b border-admin-border backdrop-blur-[12px] max-[900px]:col-start-1 max-[900px]:px-[14px]">
      <Button
        variant="ghost"
        size="icon"
        className="icon mobile"
        ref={menuButtonRef}
        aria-label={translateText(mobileNavigationOpen ? "Close navigation" : "Open navigation")}
        aria-controls="site-navigation"
        aria-expanded={mobileNavigationOpen}
        onClick={onToggleNavigation}
      >
        <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </Button>
      <span className="admin-shell-title">{translateText("KUQuest Admin")}</span>
      <Button variant="outline" size="sm" className="search admin-global-search-trigger" type="button" aria-label={translateText("Search marketplace records")} onClick={onOpenSearch}>
        <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span>{translateText("Search marketplace records")}</span>
      </Button>
      <span className="demo"><i />{pathname}</span>
    </header>
  );
}
