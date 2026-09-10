"use client";

import { useEffect, useState } from "react";

import { adminApi } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { memberStatusLabel, walletStatusLabel } from "../domain/rulebook";
import { loadDashboardData } from "./dashboard-bootstrap";
import { dashboardActivityFromApi, type DashboardActivity } from "./dashboard-model";
import {
  overviewCloneModelFromApi,
  overviewCloneFallbackFromMockData,
  overviewCloneModelFromMockData,
  questStateTones,
  type OverviewCloneModel,
  type OverviewCloneQueue,
} from "./overview-clone-model";

const ACTIVITY_STORAGE_KEY = "kuquest-admin-activity-v2";

function localActivityEvents(): DashboardActivity[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): DashboardActivity[] => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      return [{
        actor: typeof record.actor === "string" ? record.actor : "AD",
        title: typeof record.title === "string" ? record.title : "Administrative activity",
        detail: typeof record.detail === "string" ? record.detail : "",
        timestamp: typeof record.timestamp === "number" ? record.timestamp : 0,
      }];
    });
  } catch {
    return [];
  }
}

function relativeTime(timestamp: number): string {
  if (!timestamp) return "Time not provided";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function queueSourceLabel(row: OverviewCloneQueue): string {
  return row.source === "Admin API" ? "Admin API count" : "Local fallback · API path unavailable";
}

function countLabel(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

function OverviewCloneLoading({ message }: { message: string }) {
  return <main id="dashboard-main" className="overview-command-center" tabIndex={-1}><section className="panel"><p>{message}</p></section></main>;
}

export function OverviewClone() {
  const [model, setModel] = useState<OverviewCloneModel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      if (isAdminApiEnabled()) {
        const [_, overview, activityPage] = await Promise.all([
          import("../legacy/fresh-mock-data"),
          adminApi.getOverview(),
          adminApi.listActivityLogs({ limit: 4, sort: "newest" }),
        ]);
        const fallback = overviewCloneFallbackFromMockData(loadDashboardData(localStorage));
        if (!cancelled) {
          setModel(overviewCloneModelFromApi(
            overview,
            activityPage.items.map(dashboardActivityFromApi),
            fallback,
          ));
        }
        return;
      }

      const data = loadDashboardData(localStorage);
      if (!cancelled) setModel(overviewCloneModelFromMockData(data, localActivityEvents()));
    };

    void loadOverview().catch((error: unknown) => {
      console.error("Overview clone failed to load", error);
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "The Admin API is unavailable.");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) return <OverviewCloneLoading message={loadError ?? "Loading marketplace overview…"} />;
  if (loadError) return <OverviewCloneLoading message={loadError} />;

  const sourceLabel = model.source === "Admin API"
    ? model.hasFallbackQueues ? "Live Admin API · local fallback for missing queues" : "Live Admin API"
    : "Local demo data";

  return (
    <main id="dashboard-main" className="overview-command-center" tabIndex={-1}>
      <header className="overview-command-center-header">
        <div>
          <span className="overview-command-center-kicker">KUQuest Admin</span>
          <h1>Overview</h1>
          <p>One view of marketplace work, risk, and money.</p>
        </div>
        <div className="overview-command-center-updated">
          <span className="overview-command-center-dot" aria-hidden="true" />
          <span>{sourceLabel} · Updated {relativeTime(model.loadedAt)}</span>
        </div>
      </header>

      <section className="overview-command-center-command" aria-label="Work left">
        <div className="overview-command-center-hero">
          <div className="overview-command-center-hero-copy">
            <small>Work left</small>
            <strong>{countLabel(model.totalWorkLeft)}</strong>
            <span>open decisions</span>
          </div>
          <div className="overview-command-center-hero-stats">
            {model.queues.map((row) => (
              <div key={row.id}>
                <span>{row.title}</span>
                <strong>{countLabel(row.count)}</strong>
                <small>{queueSourceLabel(row)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="overview-command-center-grid">
        <section className="overview-command-center-table" aria-labelledby="overview-command-queue-heading">
          <div className="overview-command-center-section-head">
            <div><h2 id="overview-command-queue-heading">Queue map</h2><p>What needs attention now.</p></div>
            <span>Current counts</span>
          </div>
          <div className="overview-command-center-table-head"><span>Queue</span><span>Detail</span><span>State</span><span>Waiting</span></div>
          <ul className="overview-command-center-queue">
            {model.queues.map((row) => (
              <li key={row.id}>
                <span className="overview-command-center-queue-title"><strong>{row.title}</strong><small>{countLabel(row.count)} open</small></span>
                <span className="overview-command-center-queue-oldest">{row.oldest}</span>
                <span className={`overview-command-center-queue-status ${row.tone}`}>{row.status}</span>
                <span className="overview-command-center-queue-waiting">{row.waiting}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="overview-command-center-activity" aria-labelledby="overview-command-activity-heading">
          <div className="overview-command-center-section-head">
            <div><h2 id="overview-command-activity-heading">Activity Log</h2><p>Recent Admin changes.</p></div>
            <span>Latest {model.activity.length}</span>
          </div>
          {model.activity.length ? (
            <ol className="overview-command-center-timeline">
              {model.activity.map((entry, index) => (
                <li key={`${entry.timestamp}-${entry.actor}-${entry.title}`}>
                  <span className="overview-command-center-timeline-marker" aria-hidden="true">{index + 1}</span>
                  <span className="overview-command-center-timeline-avatar" aria-hidden="true">{entry.actor}</span>
                  <span><strong>{entry.title}</strong><small>{entry.detail} · {relativeTime(entry.timestamp)}</small></span>
                </li>
              ))}
            </ol>
          ) : <p className="overview-command-center-note">No administrative activity is available.</p>}
        </section>
      </div>

      <div className="overview-command-center-snapshot">
        <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-quest-heading">
          <div className="overview-command-center-section-head"><div><h2 id="overview-command-quest-heading">Quest States</h2><p>Current distribution across Quests.</p></div><span>{countLabel(model.questTotal)} total</span></div>
          <ul className="overview-command-center-state-list">
            {model.questStates.map((entry) => (
              <li key={entry.status}>
                <span><span>{entry.label}</span><strong>{countLabel(entry.count)}</strong></span>
                <span className="overview-command-center-state-track" aria-hidden="true"><span className={`overview-command-center-state-bar ${questStateTones[entry.status]}`} style={{ width: `${entry.percentage}%` }} /></span>
              </li>
            ))}
          </ul>
        </section>

        <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-members-heading">
          <div className="overview-command-center-section-head"><div><h2 id="overview-command-members-heading">Members</h2><p>Count by Member status.</p></div><span>Local fallback</span></div>
          <ul className="overview-command-center-status-list">
            {model.memberStatusCounts.map((entry) => (
              <li key={entry.status} className={`overview-command-center-status-row overview-member-${entry.status.toLowerCase().replaceAll(" ", "-")}`}>
                <span className="overview-command-center-status-dot" aria-hidden="true" />
                <span><strong>{memberStatusLabel(entry.status)}</strong><small>Member status</small></span>
                <strong>{countLabel(entry.count)}</strong>
              </li>
            ))}
          </ul>
          <p className="overview-command-center-note">Member status counts use local fallback data because the Admin API does not provide a Member list.</p>
        </section>

        <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-wallets-heading">
          <div className="overview-command-center-section-head"><div><h2 id="overview-command-wallets-heading">Wallets</h2><p>Count by Wallet status.</p></div><span>Local fallback</span></div>
          <ul className="overview-command-center-status-list">
            {model.walletStatusCounts.map((entry) => (
              <li key={entry.status} className={`overview-command-center-status-row overview-wallet-${entry.status.toLowerCase()}`}>
                <span className="overview-command-center-status-dot" aria-hidden="true" />
                <span><strong>{walletStatusLabel(entry.status)}</strong><small>Wallet status</small></span>
                <strong>{countLabel(entry.count)}</strong>
              </li>
            ))}
          </ul>
          <div className="overview-command-center-status-fact"><span>Payouts in flight</span><strong>{model.inFlightPayouts === null ? "—" : countLabel(model.inFlightPayouts)}</strong></div>
          <p className="overview-command-center-note">Wallet status counts use local fallback data because the Admin API does not provide a Wallet list.</p>
        </section>
      </div>
    </main>
  );
}
