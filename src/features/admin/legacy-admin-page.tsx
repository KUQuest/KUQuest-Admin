"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

/* oxlint-disable jsx-a11y/prefer-tag-over-role */

type LegacyPage = "home" | "quest" | "dispute" | "report" | "user" | "login";
type LegacyScriptPlan = {
  sequential: string[];
  parallel: string[];
};

const adminFoundationScripts = [
  "/legacy/auth.js?v=1",
  "/legacy/language.js?v=8-review-removal-reason",
  "/legacy/script.js?v=94-penalty-ladder",
  "/legacy/fresh-mock-data.js?v=49-penalty-ladder",
  "/legacy/resource-controls.js?v=49-penalty-ladder",
  "/legacy/theme.js?v=1",
];

const adminScripts: LegacyScriptPlan = {
  sequential: adminFoundationScripts,
  parallel: [
    "/legacy/functional-controls.js?v=5",
    "/legacy/deep-links.js?v=11",
  ],
};

const questScripts: LegacyScriptPlan = {
  sequential: [
    ...adminFoundationScripts,
    "/legacy/quest-detail.js?v=41",
    "/legacy/quest-page.js?v=29",
    "/legacy/quest-change-review.js?v=10",
  ],
  parallel: ["/legacy/functional-controls.js?v=5"],
};

const disputeScripts: LegacyScriptPlan = {
  sequential: [
    ...adminFoundationScripts,
    "/legacy/dispute-detail.js?v=34",
    "/legacy/dispute-page.js?v=14",
  ],
  parallel: ["/legacy/functional-controls.js?v=5"],
};

const reportScripts: LegacyScriptPlan = {
  sequential: [...adminFoundationScripts, "/legacy/report-page.js?v=17-penalty-ladder"],
  parallel: ["/legacy/functional-controls.js?v=5"],
};

const userScripts: LegacyScriptPlan = {
    sequential: [...adminFoundationScripts, "/legacy/user-page.js?v=12-review-removal-reason"],
  parallel: ["/legacy/functional-controls.js?v=5"],
};

const loginScripts: LegacyScriptPlan = {
  sequential: ["/legacy/language.js?v=8-review-removal-reason", "/legacy/login.js?v=1"],
  parallel: [],
};
const legacyScriptLoads = new Map<string, Promise<void>>();

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.dataset.kuquestLegacy = "true";
    script.onload = () => {
      script.dataset.kuquestLegacyLoaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.append(script);
  });

function loadScripts(plan: LegacyScriptPlan) {
  const scripts = [...plan.sequential, ...plan.parallel];
  const marker = scripts.join("|");
  const existingLoad = legacyScriptLoads.get(marker);
  if (existingLoad) return existingLoad;
  if (document.body.dataset.kuquestLegacyPage === marker) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-kuquest-legacy]",
  );
  if (existing) return Promise.resolve();
  document.body.dataset.kuquestLegacyPage = marker;

  let chain = Promise.resolve();
  for (const src of plan.sequential) chain = chain.then(() => loadScript(src));
  chain = chain.then(() => Promise.all(plan.parallel.map(loadScript)).then(() => undefined));
  legacyScriptLoads.set(marker, chain);
  return chain;
}

function hardNavigate(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  window.location.assign(event.currentTarget.href);
}

function handleLogout() {
  localStorage.removeItem("kuquest-admin-session");
  window.location.assign("/login");
}

function LanguageControl({ className = "", disabled = false }: { className?: string; disabled?: boolean }) {
  return (
    <div className={`language-control${className ? ` ${className}` : ""}`} data-language-control>
      <span className="language-control-label">Language</span>
      <div className="language-options" role="group" aria-label="Language options">
        <button className="language-option" type="button" data-language-option="en" aria-pressed="true" disabled={disabled}>
          English
        </button>
        <button className="language-option" type="button" data-language-option="th" aria-pressed="false" disabled={disabled}>
          ไทย
        </button>
      </div>
    </div>
  );
}

function LegacyScripts({ page, recordId, onReady }: { page: LegacyPage; recordId?: string; onReady?: () => void }) {
  useEffect(() => {
    let cancelled = false;
    const notifyReady = () => {
      if (!cancelled) onReady?.();
    };
    if (page === "login") {
      document.body.classList.add("login-page");
      void loadScripts(loginScripts).then(notifyReady).catch((error: unknown) => console.error(error));
      return () => {
        cancelled = true;
        document.body.classList.remove("login-page");
      };
    }

    document.body.classList.remove("login-page");
    window.__KUQUEST_RECORD_ID__ = recordId;
    void loadScripts(
      page === "quest"
        ? questScripts
        : page === "dispute"
          ? disputeScripts
          : page === "report"
            ? reportScripts
            : page === "user"
              ? userScripts
              : adminScripts,
    ).then(notifyReady).catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [onReady, page, recordId]);

  return null;
}

function LegacyOverlays({ detailSearch = false }: { detailSearch?: boolean }) {
  return (
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
      <div
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
      </div>
      <div id="toasts" className="toasts" aria-live="polite" />
    </>
  );
}

export function LegacyAdminPage({ page, recordId }: { page: Exclude<LegacyPage, "login">; recordId?: string }) {
  const detailPage = page !== "home" && page !== "user";

  return (
    <>
      <div className="shell">
        <aside className="sidebar" id="site-navigation">
          <div className="brand">
            <Image src="/kuquest-logo.png?v=2" alt="" width={101} height={51} priority unoptimized />
            <span>KuQuest</span>
          </div>
          <nav id="nav" aria-label="Primary navigation" />
          <div className="nav-group">
            <small>SYSTEM</small>
            <button data-view="activity" type="button">
              <span data-static-icon="history" />Activity log
            </button>
          </div>
          <div className="theme-control" data-theme-control>
            <button
              className="theme-trigger"
              type="button"
              data-theme-trigger
              aria-expanded="false"
              aria-controls="theme-options"
            >
              <span className="theme-trigger-copy">
                <strong>Theme</strong>
                <small data-theme-current>Grey-white</small>
              </span>
              <span className="theme-trigger-chevron" aria-hidden="true">⌄</span>
            </button>
            <div className="theme-menu" id="theme-options" data-theme-menu hidden>
              <p className="theme-menu-title">Choose a theme</p>
              <div className="theme-options" role="group" aria-label="Theme options">
                <button className="theme-option" type="button" data-theme-option="grey" aria-pressed="true">
                  <span className="theme-swatch theme-swatch-grey" aria-hidden="true" />
                  <span className="theme-option-copy"><strong>Grey-white</strong><small>Neutral workspace</small></span>
                  <span className="theme-option-check" aria-hidden="true">✓</span>
                </button>
                <button className="theme-option" type="button" data-theme-option="green" aria-pressed="false">
                  <span className="theme-swatch theme-swatch-green" aria-hidden="true" />
                  <span className="theme-option-copy"><strong>Light green</strong><small>Original KuQuest palette</small></span>
                  <span className="theme-option-check" aria-hidden="true">✓</span>
                </button>
                <button className="theme-option" type="button" data-theme-option="dark" aria-pressed="false">
                  <span className="theme-swatch theme-swatch-dark" aria-hidden="true" />
                  <span className="theme-option-copy"><strong>Dark</strong><small>Low-light workspace</small></span>
                  <span className="theme-option-check" aria-hidden="true">✓</span>
                </button>
              </div>
            </div>
          </div>
          <LanguageControl />
          <div className="profile">
            <span>NP</span>
            <div><strong>Nicha P.</strong><small>Administrator</small></div>
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
                aria-expanded="false"
                type="button"
              >
                <span data-static-icon="menu" />
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
                aria-expanded="false"
                type="button"
              >
                <span data-static-icon="menu" />
              </button>
              <button className="search" id="open-search" aria-label="Search quests, users, and payouts" type="button">
                <span data-static-icon="search" />
                <span>Search quests, users, payouts…</span>
                <kbd>⌘ K</kbd>
              </button>
            </>
          )}
        </header>
        <main id="main" tabIndex={-1} />
      </div>
      <LegacyOverlays detailSearch={detailPage} />
      <LegacyScripts page={page} recordId={recordId} />
    </>
  );
}

export function LegacyLoginPage() {
  const [legacyReady, setLegacyReady] = useState(false);
  const handleLegacyReady = useCallback(() => setLegacyReady(true), []);

  return (
    <>
      <main className="login-shell" aria-labelledby="login-title">
        <section className="login-panel">
          <Link className="login-brand" href="/login" onClick={hardNavigate} aria-label="KuQuest admin sign in">
            <Image src="/kuquest-logo.png?v=2" alt="" width={101} height={51} priority unoptimized />
            <span>KuQuest</span>
          </Link>
          <div className="login-copy">
            <h1 id="login-title">Sign in to admin</h1>
            <p>Use your Kasetsart University email to access.</p>
          </div>
          <form id="login-form" noValidate>
            <label htmlFor="admin-email">University email</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@ku.th"
              aria-describedby="email-help email-error"
              required
            />
            <p className="field-help" id="email-help">Only <strong>@ku.th</strong> accounts can access this console.</p>
            <p className="login-error" id="email-error" role="alert" hidden />
            <div className="password-label">
              <label htmlFor="admin-password">Password</label>
              <button type="button" className="text-button" id="toggle-password" aria-controls="admin-password" disabled={!legacyReady}>Show</button>
            </div>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-describedby="password-error"
              required
            />
            <p className="login-error" id="password-error" role="alert" hidden />
            <button className="btn primary login-submit" type="submit" disabled={!legacyReady}>Sign in</button>
          </form>
          <LanguageControl className="login-language" disabled={!legacyReady} />
        </section>
      </main>
      <LegacyScripts page="login" onReady={handleLegacyReady} />
    </>
  );
}

declare global {
  interface Window {
    __KUQUEST_RECORD_ID__?: string;
  }
}
