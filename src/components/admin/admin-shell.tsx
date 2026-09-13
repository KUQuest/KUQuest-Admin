"use client";

import { useState, type ReactNode } from "react";

import type { AdminIdentity } from "../../features/admin/api/admin-api";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

type AdminShellProps = {
  identity: AdminIdentity;
  children: ReactNode;
  modal: ReactNode;
};

function identityName(identity: AdminIdentity): string {
  return `${identity.firstName} ${identity.lastName}`.trim() || identity.email;
}

export function AdminShell({ identity, children, modal }: AdminShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const adminName = identityName(identity);

  return (
    <div className="shell admin-shell">
      <AdminSidebar
        open={mobileNavigationOpen}
        onNavigate={() => setMobileNavigationOpen(false)}
        adminName={adminName}
      />
      <AdminHeader
        mobileNavigationOpen={mobileNavigationOpen}
        onToggleNavigation={() => setMobileNavigationOpen((open) => !open)}
      />
      {children}
      {modal}
    </div>
  );
}
