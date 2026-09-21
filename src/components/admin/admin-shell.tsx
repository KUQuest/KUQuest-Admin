"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { type AdminIdentity } from "../../features/admin/api/admin-api";
import { adminApiProvider } from "../../features/admin/api/admin-provider";
import { useAdminNavigationCountsQuery } from "../../features/admin/admin-navigation-query";
import { AdminGlobalSearch } from "../../features/admin/search/admin-global-search";
import {
  translateAdminText,
  type AdminLanguage,
} from "../../features/admin/language/admin-language";
import { isAdminMockEnabled } from "../../lib/auth/admin-auth-mode";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { AdminShellProvider } from "./admin-shell-context";
import { AdminQueryProvider } from "./admin-query-provider";
import { ADMIN_SESSION_KEY } from "../../features/admin/admin-auth";
import { ADMIN_MOCK_SESSION_COOKIE } from "../../lib/auth/admin-session-policy";

const ADMIN_LANGUAGE_KEY = "kuquest-admin-language";

type AdminShellProps = {
  identity: AdminIdentity;
  children: ReactNode;
};

function identityName(identity: AdminIdentity): string {
  return `${identity.firstName} ${identity.lastName}`.trim() || identity.email;
}

function hasBrowserMockSession(): boolean {
  return document.cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=", 2);
    return name === ADMIN_MOCK_SESSION_COOKIE && Boolean(value);
  });
}

export function AdminShell({ identity, children }: AdminShellProps) {
  return <AdminQueryProvider><AdminShellContent identity={identity}>{children}</AdminShellContent></AdminQueryProvider>;
}

function AdminShellContent({ identity, children }: AdminShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [language, setLanguage] = useState<AdminLanguage>("en");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const adminName = identityName(identity);
  const { data: navigationCounts } = useAdminNavigationCountsQuery();

  const closeMobileNavigation = useCallback(() => setMobileNavigationOpen(false), []);
  const toggleMobileNavigation = useCallback(
    () => setMobileNavigationOpen((open) => !open),
    [],
  );
  const changeLanguage = useCallback((nextLanguage: AdminLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem(ADMIN_LANGUAGE_KEY, nextLanguage);
  }, []);
  const openGlobalSearch = useCallback(() => setGlobalSearchOpen(true), []);
  const closeGlobalSearch = useCallback(() => setGlobalSearchOpen(false), []);
  const handleLogout = useCallback(() => {
    const finishLogout = () => {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      document.cookie = `${ADMIN_MOCK_SESSION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
      window.location.replace("/login");
    };

    if (isAdminMockEnabled()) {
      finishLogout();
      return;
    }

    void adminApiProvider.auth.signOut()
      .catch((error: unknown) => console.error("Admin sign-out failed", error))
      .finally(finishLogout);
  }, []);
  const translateText = useCallback(
    (value: string) => translateAdminText(language, value),
    [language],
  );

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(ADMIN_LANGUAGE_KEY);
    if (storedLanguage === "en" || storedLanguage === "th") setLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let checking = false;

    const redirectIfSessionMissing = async () => {
      if (cancelled || checking) return;
      checking = true;
      try {
        if (isAdminMockEnabled()) {
          if (!hasBrowserMockSession()) window.location.replace("/login");
          return;
        }

        const session = await adminApiProvider.auth.getSession();
        if (!session && !cancelled) window.location.replace("/login");
      } catch {
        if (!cancelled) window.location.replace("/login");
      } finally {
        checking = false;
      }
    };

    window.addEventListener("pageshow", redirectIfSessionMissing);
    window.addEventListener("popstate", redirectIfSessionMissing);
    void redirectIfSessionMissing();
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", redirectIfSessionMissing);
      window.removeEventListener("popstate", redirectIfSessionMissing);
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
        <div className="admin-shell-layout admin-shell min-h-screen grid !grid-cols-[240px_minmax(0,1fr)] grid-rows-[56px_1fr] max-[900px]:!grid-cols-1">
          <AdminSidebar
            open={mobileNavigationOpen}
            onNavigate={closeMobileNavigation}
            adminName={adminName}
            counts={navigationCounts ?? null}
            language={language}
            onLanguageChange={changeLanguage}
            onLogout={handleLogout}
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
