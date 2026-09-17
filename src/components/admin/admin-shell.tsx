"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  adminNavigationCountsFromMockData,
  adminNavigationCountsFromOverview,
  type AdminNavigationCounts,
} from "../../features/admin/admin-navigation";
import { adminApi, type AdminIdentity } from "../../features/admin/api/admin-api";
import { loadDashboardData } from "../../features/admin/dashboard/dashboard-bootstrap";
import { AdminGlobalSearch } from "../../features/admin/search/admin-global-search";
import {
  translateAdminText,
  type AdminLanguage,
} from "../../features/admin/language/admin-language";
import { isAdminMockEnabled } from "../../lib/auth/admin-auth-mode";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { AdminShellProvider } from "./admin-shell-context";

type AdminShellProps = {
  identity: AdminIdentity;
  children: ReactNode;
};

function identityName(identity: AdminIdentity): string {
  return `${identity.firstName} ${identity.lastName}`.trim() || identity.email;
}

export function AdminShell({ identity, children }: AdminShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [language, setLanguage] = useState<AdminLanguage>("en");
  const [navigationCounts, setNavigationCounts] = useState<AdminNavigationCounts | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const adminName = identityName(identity);

  const closeMobileNavigation = useCallback(() => setMobileNavigationOpen(false), []);
  const toggleMobileNavigation = useCallback(
    () => setMobileNavigationOpen((open) => !open),
    [],
  );
  const changeLanguage = useCallback((nextLanguage: AdminLanguage) => {
    setLanguage(nextLanguage);
  }, []);
  const openGlobalSearch = useCallback(() => setGlobalSearchOpen(true), []);
  const closeGlobalSearch = useCallback(() => setGlobalSearchOpen(false), []);
  const translateText = useCallback(
    (value: string) => translateAdminText(language, value),
    [language],
  );

  useEffect(() => {
    let cancelled = false;

    const loadNavigationCounts = async () => {
      if (isAdminMockEnabled()) {
        const counts = adminNavigationCountsFromMockData(loadDashboardData(localStorage).collections);
        if (!cancelled) setNavigationCounts(counts);
        return;
      }

      try {
        const overview = await adminApi.getOverview();
        if (!cancelled) setNavigationCounts(adminNavigationCountsFromOverview(overview));
      } catch {
        if (!cancelled) setNavigationCounts(null);
      }
    };

    void loadNavigationCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const openSearchWithShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    document.addEventListener("keydown", openSearchWithShortcut);
    return () => document.removeEventListener("keydown", openSearchWithShortcut);
  }, []);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavigationOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavigationOpen]);

  return (
    <AdminShellProvider language={language} translateText={translateText} openGlobalSearch={openGlobalSearch}>
      <div className="shell admin-shell">
        <AdminSidebar
          open={mobileNavigationOpen}
          onNavigate={closeMobileNavigation}
          adminName={adminName}
          counts={navigationCounts}
          language={language}
          onLanguageChange={changeLanguage}
          translateText={translateText}
        />
        <AdminHeader
          mobileNavigationOpen={mobileNavigationOpen}
          onToggleNavigation={toggleMobileNavigation}
          onOpenSearch={openGlobalSearch}
          translateText={translateText}
        />
        {children}
        <AdminGlobalSearch open={globalSearchOpen} onClose={closeGlobalSearch} />
      </div>
    </AdminShellProvider>
  );
}
