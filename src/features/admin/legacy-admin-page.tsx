"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

import "../../app/admin-extensions.css";
import "../../app/theme.css";

import { readAdminData } from "./data/legacy-admin-data-adapter";
import type { PersistedAdminData } from "./data/admin-records";
import { adminApi, type AdminIdentity } from "./api/admin-api";
import { isAdminApiEnabled } from "./api/admin-provider";
import { hardNavigate } from "./navigation";
import { AdminThemeControl } from "./theme/admin-theme-control";
import type { LegacyPage } from "./legacy/legacy-runtime-loader";
import { ADMIN_SESSION_KEY, requireAdminSession } from "./legacy/auth";

const LegacyRuntimeLoader = dynamic(
  () => import("./legacy/legacy-runtime-loader").then(({ LegacyRuntimeLoader: RuntimeLoader }) => RuntimeLoader),
  { ssr: false },
);

const AdminDashboard = dynamic(
  () => import("./dashboard/admin-dashboard").then(({ AdminDashboard: Dashboard }) => Dashboard),
  {
    ssr: false,
    loading: () => <main id="dashboard-main" tabIndex={-1}><section className="panel"><p>Loading marketplace overview…</p></section></main>,
  },
);

/* oxlint-disable jsx-a11y/prefer-tag-over-role */

type DashboardView = "home" | "quests" | "disputes" | "reports" | "payouts" | "users";

const dashboardNavItems: Array<{ view: DashboardView; label: string; icon: DashboardView }> = [
  { view: "home", label: "Overview", icon: "home" },
  { view: "quests", label: "Quests", icon: "quests" },
  { view: "disputes", label: "Disputes", icon: "disputes" },
  { view: "reports", label: "Reports", icon: "reports" },
  { view: "payouts", label: "Payouts", icon: "payouts" },
  { view: "users", label: "Users", icon: "users" },
];

function DashboardIcon({ name }: { name: DashboardView | "menu" | "search" }) {
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
    quests: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M8 9h8M8 13h8M8 17h5" /></>,
    disputes: <path d="M12 3v18M5 7h14M5 7l-3 6h6L5 7Zm14 0-3 6h6l-3-6ZM8 21h8" />,
    reports: <path d="M5 21V4m0 0h12l-2 4 2 4H5" />,
    payouts: <><path d="M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 0 12-3v3" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></>,
    users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.8" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  } as const;
  return <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function DashboardNavigation() {
  return (
    <nav id="nav" aria-label="Primary navigation">
      {dashboardNavItems.map(({ view, label, icon }) => (
        <button key={view} data-view={view} type="button">
          <span><DashboardIcon name={icon} /></span>{label}
        </button>
      ))}
    </nav>
  );
}

type DashboardSearchResult = {
  view: "users" | "quests" | "payouts";
  id: string;
  title: string;
  detail: string;
  href: string;
};

function recordText(record: unknown, key: string): string {
  if (!record || typeof record !== "object") return "";
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function dashboardSearchResults(data: PersistedAdminData | null, query: string): DashboardSearchResult[] {
  if (!data || !query.trim()) return [];
  const normalizedQuery = query.trim().toLowerCase();
  const users = data.collections.users.map((user): DashboardSearchResult => ({
    view: "users",
    id: user.id,
    title: user.title,
    detail: "User",
    href: `/?view=users&openUser=${encodeURIComponent(user.id)}`,
  }));
  const quests = data.collections.quests.flatMap((record): DashboardSearchResult[] => {
    const id = recordText(record, "id");
    const title = recordText(record, "title");
    return id && title ? [{ view: "quests", id, title, detail: "Quest", href: "/?view=quests" }] : [];
  });
  const payouts = data.collections.payouts.flatMap((record): DashboardSearchResult[] => {
    const id = recordText(record, "id");
    const title = recordText(record, "title");
    return id && title ? [{ view: "payouts", id, title, detail: "Payout", href: "/?view=payouts" }] : [];
  });
  return [...users, ...quests, ...payouts]
    .filter((result) => `${result.id} ${result.title} ${result.detail}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 12);
}

function DashboardGlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PersistedAdminData | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setData(readAdminData(localStorage));
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  const results = dashboardSearchResults(data, query);
  return (
    <div id="dashboard-command" className="command" role="dialog" aria-modal="true" aria-label="Search marketplace records">
      <button className="command-backdrop" type="button" aria-label="Close search" onClick={onClose} />
      <div className="command-box">
        <div className="command-input">
          <DashboardIcon name="search" />
          <input
            type="search"
            aria-label="Search marketplace records"
            placeholder="Search by name, quest, student ID, or payout…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <kbd>Esc</kbd>
        </div>
        <div id="dashboard-command-results">
          {results.map((result) => (
            <button key={`${result.view}-${result.id}`} className="result" type="button" onClick={() => {
              onClose();
              window.location.assign(result.href);
            }}>
              <span aria-hidden="true"><DashboardIcon name={result.view} /></span>
              <span><strong>{result.title}</strong><small>{result.id} · {result.detail}</small></span>
              <small>{result.view}</small>
            </button>
          ))}
          {query && !results.length && <p className="empty">No matching records</p>}
        </div>
      </div>
    </div>
  );
}

function handleLogout() {
  const finishLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.assign("/login");
  };

  if (!isAdminApiEnabled()) {
    finishLogout();
    return;
  }

  void adminApi.signOut()
    .catch((error: unknown) => console.error("Admin sign-out failed", error))
    .finally(finishLogout);
}

function AdminSessionGate({ children, onAdminSession }: { children: ReactNode; onAdminSession?: (identity: AdminIdentity) => void }) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const redirectToLogin = () => {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.location.replace("/login");
    };

    const checkSession = async () => {
      if (!isAdminApiEnabled()) {
        if (!requireAdminSession(window.localStorage, window.location)) return;
        if (!cancelled) setAuthorized(true);
        return;
      }

      try {
        const session = await adminApi.getSession();
        if (cancelled) return;
        if (!session) {
          redirectToLogin();
          return;
        }
        onAdminSession?.(session.user);
        setAuthorized(true);
      } catch (error: unknown) {
        if (cancelled) return;
        console.error("Admin session check failed", error);
        redirectToLogin();
      }
    };

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [onAdminSession]);

  return authorized ? children : null;
}

function LanguageControl({ className = "", disabled = false }: { className?: string; disabled?: boolean }) {
  const selectLanguage = (language: "en" | "th") => {
    const languageRuntime = window.__KUQUEST_LANGUAGE__;
    if (languageRuntime) {
      languageRuntime.set(language);
      return;
    }
    void import("./legacy/language").then(() => window.__KUQUEST_LANGUAGE__?.set(language));
  };

  return (
    <div className={`language-control${className ? ` ${className}` : ""}`} data-language-control>
      <span className="language-control-label">Language</span>
      <div className="language-options" role="group" aria-label="Language options">
        <button className="language-option" type="button" data-language-option="en" aria-pressed="true" disabled={disabled} onClick={() => selectLanguage("en")}>
          English
        </button>
        <button className="language-option" type="button" data-language-option="th" aria-pressed="false" disabled={disabled} onClick={() => selectLanguage("th")}>
          ไทย
        </button>
      </div>
    </div>
  );
}

function LegacyOverlays({ detailSearch = false, includeCommand = true, onAdminSession }: { detailSearch?: boolean; includeCommand?: boolean; onAdminSession?: (identity: AdminIdentity) => void }) {
  return (
    <AdminSessionGate onAdminSession={onAdminSession}>
      <>
      <div id="scrim" className="scrim" hidden />
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the source shell uses an aside drawer */}
      <aside
        id="drawer"
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Record details"
        aria-hidden="true"
        tabIndex={-1}
        inert={true}
      />
      <dialog id="confirm" aria-labelledby="confirm-title" aria-describedby="confirm-copy">
        <form method="dialog" id="confirm-form" noValidate>
          <div className="dialog-body">
            <span className="warning-icon">!</span>
            <h2 id="confirm-title">Confirm action</h2>
            <p id="confirm-copy" />
            <div id="confirm-context" hidden />
            <label htmlFor="confirm-reason">
              Reason for this decision <span aria-hidden="true">*</span>
              <textarea
                id="confirm-reason"
                rows={3}
                maxLength={500}
                required
                aria-describedby="confirm-reason-help confirm-reason-error"
                placeholder="State the evidence and policy behind this decision…"
              />
            </label>
            <div className="field-help" id="confirm-reason-help">
              <span>Required for the permanent audit trail</span>
              <span id="confirm-reason-count">0 / 500</span>
            </div>
            <p className="field-error" id="confirm-reason-error" role="alert" hidden>
              Enter at least 8 characters before confirming.
            </p>
          </div>
          <div className="dialog-actions">
            <button value="cancel" className="btn">Cancel</button>
            <button value="confirm" id="confirm-btn" className="btn danger" disabled>
              Confirm
            </button>
          </div>
        </form>
      </dialog>
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the source shell uses a hidden div overlay */}
      {includeCommand && <div
        id="command"
        className="command"
        role="dialog"
        aria-modal="true"
        aria-label="Search marketplace records"
        hidden
      >
        <div className="command-box">
          <div className="command-input">
            <span data-static-icon="search" />
            <input
              id="global-search"
              type="search"
              aria-label={
                detailSearch
                  ? "Search quests, users, payouts, or student IDs"
                  : "Search marketplace records"
              }
              placeholder={
                detailSearch
                  ? "Search quests, users, payouts, or student IDs"
                  : "Search by name, quest, student ID, or payout…"
              }
            />
            {!detailSearch && <kbd>Esc</kbd>}
          </div>
          <div id="results" />
        </div>
      </div>}
      <div id="toasts" className="toasts" aria-live="polite" />
      </>
    </AdminSessionGate>
  );
}

export function LegacyAdminPage({
  page,
  recordId,
  reactDashboard = false,
}: {
  page: LegacyPage;
  recordId?: string;
  reactDashboard?: boolean;
}) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [dashboardSearchOpen, setDashboardSearchOpen] = useState(false);
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(null);
  const detailPage = page !== "home" && page !== "user";
  const adminName = adminIdentity
    ? `${adminIdentity.firstName} ${adminIdentity.lastName}`.trim() || adminIdentity.email
    : isAdminApiEnabled() ? "Loading…" : "Nicha P.";
  const adminInitials = adminIdentity
    ? `${adminIdentity.firstName.trim().charAt(0)}${adminIdentity.lastName.trim().charAt(0)}`.trim() || "AD"
    : isAdminApiEnabled() ? "…" : "NP";
  const navigateFromDashboard = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-view]") : null;
    const view = target?.dataset.view;
    if (!view) return;
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(view === "home" ? "/" : `/?view=${encodeURIComponent(view)}`);
  }, []);

  return (
    <>
      <div className="shell">
        <aside className={`sidebar${reactDashboard && mobileNavigationOpen ? " open" : ""}`} id="site-navigation" onClickCapture={reactDashboard ? navigateFromDashboard : undefined}>
          <div className="brand">
            <Image src="/kuquest-logo.png?v=2" alt="" width={101} height={51} priority unoptimized />
            <span>KuQuest</span>
          </div>
          {reactDashboard ? <DashboardNavigation /> : <nav id="nav" aria-label="Primary navigation" />}
          <div className="nav-group">
            <small>SYSTEM</small>
            <button data-view="activity" type="button">
              <span data-static-icon="history" />Activity log
            </button>
          </div>
          <AdminThemeControl />
          <LanguageControl />
          <div className="profile">
            <span>{adminInitials}</span>
            <div><strong>{adminName}</strong><small>Administrator</small></div>
            <button className="logout-button" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </aside>
        <header>
          {detailPage ? (
            <>
              <button
                className="icon mobile"
                id="menu"
                aria-label="Open navigation"
                aria-controls="site-navigation"
                aria-expanded={reactDashboard ? mobileNavigationOpen : false}
                type="button"
                onClick={reactDashboard ? () => setMobileNavigationOpen((open) => !open) : undefined}
              >
                {reactDashboard ? <DashboardIcon name="menu" /> : <span data-static-icon="menu" />}
              </button>
              <Link className="back-link" href="/" onClick={hardNavigate}>← Back to admin</Link>
            </>
          ) : (
            <>
              <button
                className="icon mobile"
                id="menu"
                aria-label="Open navigation"
                aria-controls="site-navigation"
                aria-expanded={reactDashboard ? mobileNavigationOpen : false}
                type="button"
                onClick={reactDashboard ? () => setMobileNavigationOpen((open) => !open) : undefined}
              >
                {reactDashboard ? <DashboardIcon name="menu" /> : <span data-static-icon="menu" />}
              </button>
              <button className="search" id="open-search" aria-label="Search quests, users, and payouts" type="button" onClick={reactDashboard ? () => setDashboardSearchOpen(true) : undefined}>
                {reactDashboard ? <DashboardIcon name="search" /> : <span data-static-icon="search" />}
                <span>Search quests, users, payouts…</span>
                <kbd>⌘ K</kbd>
              </button>
            </>
          )}
        </header>
        <main id="main" tabIndex={-1} hidden={reactDashboard} />
        {reactDashboard && <AdminDashboard />}
      </div>
      <LegacyOverlays detailSearch={detailPage} includeCommand={!reactDashboard} onAdminSession={setAdminIdentity} />
      {reactDashboard && <DashboardGlobalSearch open={dashboardSearchOpen} onClose={() => setDashboardSearchOpen(false)} />}
      {!reactDashboard && <LegacyRuntimeLoader page={page} recordId={recordId} />}
    </>
  );
}

declare global {
  interface Window {
    __KUQUEST_RECORD_ID__?: string;
    __KUQUEST_PAGE__?: LegacyPage;
    openDisputeDrawer?: (index: number) => void;
  }
}
