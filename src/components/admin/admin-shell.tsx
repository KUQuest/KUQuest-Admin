"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { AdminIdentity } from "../../features/admin/api/admin-api";
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
  const adminName = identityName(identity);

  const closeMobileNavigation = useCallback(() => setMobileNavigationOpen(false), []);
  const toggleMobileNavigation = useCallback(
    () => setMobileNavigationOpen((open) => !open),
    [],
  );

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
      />
      <AdminHeader
        mobileNavigationOpen={mobileNavigationOpen}
        onToggleNavigation={toggleMobileNavigation}
      />
      {children}
    </div>
  );
}
