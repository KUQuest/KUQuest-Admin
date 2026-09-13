"use client";

import { usePathname } from "next/navigation";

type AdminHeaderProps = {
  mobileNavigationOpen: boolean;
  onToggleNavigation: () => void;
};

export function AdminHeader({ mobileNavigationOpen, onToggleNavigation }: AdminHeaderProps) {
  const pathname = usePathname();

  return (
    <header>
      <button
        className="icon mobile"
        type="button"
        aria-label="Open navigation"
        aria-controls="site-navigation"
        aria-expanded={mobileNavigationOpen}
        onClick={onToggleNavigation}
      >
        <span aria-hidden="true">☰</span>
      </button>
      <span className="admin-shell-title">KUQuest Admin</span>
      <span className="demo"><i />{pathname}</span>
    </header>
  );
}
