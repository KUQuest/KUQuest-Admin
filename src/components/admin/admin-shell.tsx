"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  adminNavigationCountsFromMockData,
  adminNavigationCountsFromOverview,
  type AdminNavigationCounts,
} from "../../features/admin/admin-navigation";
import { adminApi, type AdminIdentity } from "../../features/admin/api/admin-api";
import { loadDashboardData } from "../../features/admin/dashboard/dashboard-bootstrap";
import {
  translateAdminText,
  type AdminLanguage,
} from "../../features/admin/language/admin-language";
import { isAdminMockEnabled } from "../../lib/auth/admin-auth-mode";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

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
  const adminName = identityName(identity);

  const closeMobileNavigation = useCallback(() => setMobileNavigationOpen(false), []);
  const toggleMobileNavigation = useCallback(
    () => setMobileNavigationOpen((open) => !open),
    [],
  );
  const changeLanguage = useCallback((nextLanguage: AdminLanguage) => {
    setLanguage(nextLanguage);
  }, []);
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
    if (!mobileNavigationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavigationOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavigationOpen]);

  return (
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
      />
      {children}
    </div>
  );
}
