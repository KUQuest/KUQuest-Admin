"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation, activeAdminNavigation } from "../../features/admin/navigation-config";
import { AdminLanguageControl } from "./admin-language-control";
import { AdminThemeControl } from "../../features/admin/theme/admin-theme-control";

type AdminSidebarProps = {
  open: boolean;
  onNavigate: () => void;
  adminName: string;
};

export function AdminSidebar({ open, onNavigate, adminName }: AdminSidebarProps) {
  const pathname = usePathname();
  const activeKey = activeAdminNavigation(pathname);
  const initials = adminName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AD";

  return (
    <aside className={`sidebar${open ? " open" : ""}`} id="site-navigation">
      <div className="brand">
        <Image src="/kuquest-logo.png?v=2" alt="" width={101} height={51} priority unoptimized />
        <span>KuQuest</span>
      </div>
      <nav aria-label="Primary navigation">
        {adminNavigation.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              className={`admin-nav-link${active ? " active" : ""}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              key={item.key}
              onClick={onNavigate}
            >
              <span aria-hidden="true">·</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <AdminThemeControl />
      <AdminLanguageControl />
      <div className="profile">
        <span>{initials}</span>
        <div><strong>{adminName}</strong><small>Admin</small></div>
      </div>
    </aside>
  );
}
