"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

import { AdminDashboard } from "./dashboard/admin-dashboard";
import { requireAdminSession } from "./legacy/auth";
import { applyRequestedLegacyRecords } from "./legacy/deep-links";
import { initializeFunctionalControls } from "./legacy/functional-controls";
import { getLegacyAdminRuntime } from "./legacy/runtime";
import { AdminThemeControl } from "./theme/admin-theme-control";

/* oxlint-disable jsx-a11y/prefer-tag-over-role */

type LegacyPage = "home" | "quest" | "dispute" | "report" | "user";

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
    if (!requireAdminSession(window.localStorage, window.location)) return;
    const notifyReady = async () => {
      if (cancelled) return;
      const runtime = getLegacyAdminRuntime(window);
      if (runtime) {
        if (page === "dispute" && typeof window.openDisputeDrawer === "function") {
          const { initializeDisputeInteractions } = await import("./legacy/dispute-interactions");
          window.openDisputeDrawer = initializeDisputeInteractions(document, runtime, window.openDisputeDrawer);
        }
        initializeFunctionalControls(document, runtime);
        applyRequestedLegacyRecords(
          new URLSearchParams(window.location.search),
          runtime,
          window.requestAnimationFrame,
        );
      }
      onReady?.();
    };
    window.__KUQUEST_RECORD_ID__ = recordId;
    window.__KUQUEST_PAGE__ = page;
    void import("./legacy/language")
      .then(() => import("./legacy/page-runtime"))
      .then(({ initializeTypedLegacyPage }) => initializeTypedLegacyPage({ page, recordId, search: window.location.search }))
      .then(notifyReady)
      .catch((error: unknown) => console.error(error));
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

export function LegacyAdminPage({
  page,
  recordId,
  reactDashboard = false,
}: {
  page: LegacyPage;
  recordId?: string;
  reactDashboard?: boolean;
}) {
  const detailPage = page !== "home" && page !== "user";
  const handleLegacyReady = useCallback(() => {
    window.dispatchEvent(new Event("kuquest-legacy-ready"));
  }, []);
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
        <aside className="sidebar" id="site-navigation" onClickCapture={reactDashboard ? navigateFromDashboard : undefined}>
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
          <AdminThemeControl />
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
        <main id="main" tabIndex={-1} hidden={reactDashboard} />
        {reactDashboard && <AdminDashboard />}
      </div>
      <LegacyOverlays detailSearch={detailPage} />
      <LegacyScripts page={page} recordId={recordId} onReady={reactDashboard ? handleLegacyReady : undefined} />
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
