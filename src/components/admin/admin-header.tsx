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
    <header className="admin-shell-header col-start-2 sticky top-0 z-[15] flex items-center gap-2 border-b border-admin-border bg-admin-bg/95 px-[22px] py-2 backdrop-blur-[12px] max-[900px]:col-start-1 max-[900px]:px-[14px]">
      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 max-[900px]:inline-flex"
        ref={menuButtonRef}
        aria-label={translateText(mobileNavigationOpen ? "Close navigation" : "Open navigation")}
        aria-controls="site-navigation"
        aria-expanded={mobileNavigationOpen}
        onClick={onToggleNavigation}
      >
        <svg className="size-[17px] fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </Button>
      <span className="admin-shell-title whitespace-nowrap text-base text-admin-text">{translateText("KUQuest Admin")}</span>
      <Button variant="outline" size="sm" className="admin-global-search-trigger h-9 w-[min(520px,54vw)] justify-start gap-2 overflow-hidden border-admin-border-strong px-3 text-admin-muted max-[600px]:size-11 max-[600px]:w-11 max-[600px]:justify-center max-[600px]:px-0" type="button" aria-label={translateText("Search all records")} onClick={onOpenSearch}>
        <svg className="size-[17px] shrink-0 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <span className="truncate max-[600px]:hidden">{translateText("Search all records")}</span>
      </Button>
      <span className="ml-auto flex items-center gap-1.5 text-xs text-admin-muted max-[600px]:hidden"><i className="size-1.5 rounded-full bg-admin-success" />{pathname}</span>
    </header>
  );
}
