"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  activeAdminNavigation,
  adminNavigation,
  primaryAdminNavigation,
  systemAdminNavigation,
  type AdminNavigationIcon,
} from "../../features/admin/navigation-config";
import type { AdminNavigationCounts } from "../../features/admin/admin-navigation";
import type { AdminLanguage } from "../../features/admin/language/admin-language";
import { AdminLanguageControl } from "./admin-language-control";
import { AdminThemeControl } from "./admin-theme-control";

type AdminSidebarProps = {
  open: boolean;
  onNavigate: () => void;
  adminName: string;
  counts: AdminNavigationCounts | null;
  language: AdminLanguage;
  onLanguageChange: (language: AdminLanguage) => void;
  onLogout: () => void;
  translateText: (value: string) => string;
};

type AdminNavigationItem = (typeof adminNavigation)[number];

const walletIconNode = <><path d="M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 0 12-3v3" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></>;
const navigationIconNodes: Record<AdminNavigationIcon, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
  quest: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M8 9h8M8 13h8M8 17h5" /></>,
  dispute: <path d="M12 3v18M5 7h14M5 7l-3 6h6L5 7Zm14 0-3 6h6l-3-6ZM8 21h8" />,
  report: <path d="M5 21V4m0 0h12l-2 4 2 4H5" />,
  "conduct-report": <><path d="M5 21V4m0 0h12l-2 4 2 4H5" /><path d="m9 16 2 2 4-4" /></>,
  payout: walletIconNode,
  member: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.8" />,
  wallet: walletIconNode,
  activity: <path d="M4 5h16v14H4zM8 9h8M8 13h5" />,
};

function NavigationIcon({ name }: { name: AdminNavigationIcon }) {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
      {navigationIconNodes[name]}
    </svg>
  );
}

function AdminNavigationLink({
  active,
  item,
  counts,
  translateText,
}: {
  active: boolean;
  item: AdminNavigationItem;
  counts: AdminNavigationCounts | null;
  translateText: (value: string) => string;
}) {
  const count = item.count && counts ? counts[item.count] : null;

  return (
    <Link
      className={`admin-nav-link${active ? " active" : ""}`}
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-navigation-key={item.key}
    >
      <span aria-hidden="true"><NavigationIcon name={item.icon} /></span>
      {translateText(item.label)}
      {typeof count === "number" && <b className="admin-nav-count">{count}</b>}
    </Link>
  );
}

export function AdminSidebar({
  open,
  onNavigate,
  adminName,
  counts,
  language,
  onLanguageChange,
  onLogout,
  translateText,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const activeKey = activeAdminNavigation(pathname);
  const [isMobile, setIsMobile] = useState(false);
  const previousPathname = useRef(pathname);
  const initials = adminName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AD";

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (isMobile && open) onNavigate();
  }, [isMobile, onNavigate, open, pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const updateMobileState = () => setIsMobile(mediaQuery.matches);
    const closeOnBreakpointChange = () => {
      updateMobileState();
      onNavigate();
    };
    updateMobileState();
    mediaQuery.addEventListener("change", closeOnBreakpointChange);
    return () => mediaQuery.removeEventListener("change", closeOnBreakpointChange);
  }, [onNavigate]);

  const navigationHidden = isMobile && !open;

  return (
    <aside
      className={`sidebar${open ? " open" : ""}`}
      id="site-navigation"
      aria-hidden={navigationHidden ? true : undefined}
      inert={navigationHidden ? true : undefined}
    >
      <div className="brand">
        <Image src="/kuquest-logo.png?v=2" alt="" width={101} height={51} priority unoptimized />
        <span>KuQuest</span>
      </div>
      <nav aria-label={translateText("Primary navigation")}>
        {primaryAdminNavigation.map((item) => (
          <AdminNavigationLink
            active={item.key === activeKey}
            item={item}
            key={item.key}
            counts={counts}
            translateText={translateText}
          />
        ))}
      </nav>
      <div className="nav-group">
        <small>{translateText("SYSTEM")}</small>
        <nav aria-label={translateText("System navigation")}>
          {systemAdminNavigation.map((item) => (
            <AdminNavigationLink
              active={item.key === activeKey}
              item={item}
              key={item.key}
              counts={counts}
              translateText={translateText}
            />
          ))}
        </nav>
      </div>
      <AdminThemeControl translateText={translateText} />
      <AdminLanguageControl
        language={language}
        onLanguageChange={onLanguageChange}
        translateText={translateText}
      />
      <div className="profile">
        <span aria-hidden="true">{initials}</span>
        <div>
          <strong>{adminName}</strong>
          <small>{translateText("Admin")}</small>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>
          {translateText("Log out")}
        </button>
      </div>
    </aside>
  );
}
