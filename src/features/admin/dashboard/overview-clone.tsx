"use client";

import { useEffect, useState, type ReactNode } from "react";

import { adminApi, type AdminFinanceOverview } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { memberStatusLabel, walletStatusLabel } from "../domain/rulebook";
import { loadDashboardData } from "./dashboard-bootstrap";
import { dashboardActivityFromApi, dashboardActivityKey, type DashboardActivity } from "./dashboard-model";
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
    return parsed.flatMap((entry, index): DashboardActivity[] => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      const timestamp = typeof record.timestamp === "number" ? record.timestamp : 0;
      const storedId = typeof record.id === "string" ? record.id.trim() : "";
      return [{
        id: storedId || `local-${index}-${timestamp}`,
        actor: typeof record.actor === "string" ? record.actor : "AD",
        title: typeof record.title === "string" ? record.title : "Administrative activity",
        detail: typeof record.detail === "string" ? record.detail : "",
        timestamp,
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

function moneyFromSatang(value: number): string {
  return `฿${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)}`;
}

function financeDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not provided";
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })} ICT`;
}

function FinanceMetric({ label, value }: { label: string; value: number }) {
  return <div className="overview-command-center-finance-metric"><span>{label}</span><strong>{moneyFromSatang(value)}</strong></div>;
}

function FinanceGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="overview-command-center-finance-group"><h3>{title}</h3>{children}</div>;
}

function FinanceOverviewSection({
  overview,
  loading,
  error,
}: {
  overview: AdminFinanceOverview | null;
  loading: boolean;
  error: string | null;
}) {
  if (!isAdminApiEnabled()) return null;
  if (loading) {
    return <section className="overview-command-center-finance" aria-labelledby="overview-finance-heading"><div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">Finance Overview</h2><p>Platform and Member Wallet totals.</p></div><span>Admin API</span></div><p className="overview-command-center-note">Reading the Finance Overview from the Admin API…</p></section>;
  }
  if (error || !overview) {
    return <section className="overview-command-center-finance" aria-labelledby="overview-finance-heading"><div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">Finance Overview</h2><p>Platform and Member Wallet totals.</p></div><span>Unavailable</span></div><p className="overview-command-center-note">{error || "Finance Overview is not available."}</p></section>;
  }

  const integrityLabel = overview.integrity.subledgerBalanced ? "Balanced" : "Needs review";
  const integrityClass = overview.integrity.subledgerBalanced ? "is-balanced" : "needs-review";
  return <section className="overview-command-center-finance" aria-labelledby="overview-finance-heading">
    <div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">Finance Overview</h2><p>Platform and Member Wallet totals.</p></div><span>Admin API</span></div>
    <div className="overview-command-center-finance-groups">
      <FinanceGroup title="Platform Balances">
        <div className="overview-command-center-finance-metrics"><FinanceMetric label="Revenue" value={overview.platformBalances.revenueSatang} /><FinanceMetric label="Suspense" value={overview.platformBalances.suspenseSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title="Member Wallet Summary">
        <div className="overview-command-center-finance-metrics"><FinanceMetric label="Spending balance" value={overview.memberBalancesSummary.totalSpendingSatang} /><FinanceMetric label="Earnings balance" value={overview.memberBalancesSummary.totalEarningsSatang} /><FinanceMetric label="Funding reserved" value={overview.memberBalancesSummary.totalFundingReservedSatang} /><FinanceMetric label="Payout reserved" value={overview.memberBalancesSummary.totalPayoutReservedSatang} /><FinanceMetric label="Total circulating" value={overview.memberBalancesSummary.totalCirculatingSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title="Lifetime Volume">
        <div className="overview-command-center-finance-metrics"><FinanceMetric label="Top-ups deposited" value={overview.volumeLifetime.totalTopUpDepositedSatang} /><FinanceMetric label="Payouts completed" value={overview.volumeLifetime.totalPayoutCompletedSatang} /><FinanceMetric label="Platform fees earned" value={overview.volumeLifetime.totalPlatformFeesEarnedSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title="Ledger Integrity">
        <div className="overview-command-center-finance-integrity"><div><span>Subledger status</span><strong className={integrityClass}>{integrityLabel}</strong></div><div><span>Posting discrepancy</span><strong>{moneyFromSatang(overview.integrity.totalPostingsDiscrepancySatang)}</strong></div><div><span>Last audited</span><strong>{financeDateLabel(overview.integrity.lastAuditedAt)}</strong></div></div>
      </FinanceGroup>
    </div>
  </section>;
}

function OverviewCloneLoading({ message }: { message: string }) {
  return <main id="dashboard-main" className="overview-command-center" tabIndex={-1}><section className="panel"><p>{message}</p></section></main>;
}

export function OverviewClone() {
  const [model, setModel] = useState<OverviewCloneModel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [financeOverview, setFinanceOverview] = useState<AdminFinanceOverview | null>(null);
  const [financeOverviewLoading, setFinanceOverviewLoading] = useState(isAdminApiEnabled());
  const [financeOverviewError, setFinanceOverviewError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isAdminApiEnabled()) return;
    let cancelled = false;
    void adminApi.getFinanceOverview()
      .then((overview) => {
        if (!cancelled) setFinanceOverview(overview);
        return undefined;
      })
      .catch((error: unknown) => {
        if (!cancelled) setFinanceOverviewError(error instanceof Error ? error.message : "Finance Overview is not available.");
        return undefined;
      })
      .finally(() => {
        if (!cancelled) setFinanceOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) return <OverviewCloneLoading message={loadError ?? "Loading marketplace overview…"} />;
  if (loadError) return <OverviewCloneLoading message={loadError} />;

  return (
    <main id="dashboard-main" className="overview-command-center" tabIndex={-1}>
      <header className="overview-command-center-header">
        <div>
          <span className="overview-command-center-kicker">KUQuest Admin</span>
          <h1>Overview</h1>
          <p>One view of marketplace work, risk, and money.</p>
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

      <FinanceOverviewSection overview={financeOverview} loading={financeOverviewLoading} error={financeOverviewError} />

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
                <li key={dashboardActivityKey(entry, index)}>
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
          <ul className="overview-command-center-status-list">
            {model.questStates.map((entry) => (
              <li key={entry.status} className={`overview-command-center-status-row ${questStateTones[entry.status]}`}>
                <span className="overview-command-center-status-dot" aria-hidden="true" />
                <span><strong>{entry.label}</strong><small>Quest status</small></span>
                <strong>{countLabel(entry.count)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-members-heading">
          <div className="overview-command-center-section-head"><div><h2 id="overview-command-members-heading">Members</h2><p>Count by Member status.</p></div><span>{model.memberStatusSource}</span></div>
          <ul className="overview-command-center-status-list">
            {model.memberStatusCounts.map((entry) => (
              <li key={entry.status} className={`overview-command-center-status-row overview-member-${entry.status.toLowerCase().replaceAll(" ", "-")}`}>
                <span className="overview-command-center-status-dot" aria-hidden="true" />
                <span><strong>{memberStatusLabel(entry.status)}</strong><small>Member status</small></span>
                <strong>{countLabel(entry.count)}</strong>
              </li>
            ))}
          </ul>
          {model.memberStatusSource === "Local fallback" ? <p className="overview-command-center-note">Member status counts use local fallback data because the Admin API does not provide them.</p> : null}
        </section>

        <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-wallets-heading">
          <div className="overview-command-center-section-head"><div><h2 id="overview-command-wallets-heading">Wallets</h2><p>Count by Wallet status.</p></div><span>{model.walletStatusSource}</span></div>
          <ul className="overview-command-center-status-list">
            {model.walletStatusCounts.map((entry) => (
              <li key={entry.status} className={`overview-command-center-status-row overview-wallet-${entry.status.toLowerCase()}`}>
                <span className="overview-command-center-status-dot" aria-hidden="true" />
                <span><strong>{walletStatusLabel(entry.status)}</strong><small>Wallet status</small></span>
                <strong>{countLabel(entry.count)}</strong>
              </li>
            ))}
          </ul>
          {model.walletStatusSource === "Local fallback" ? <p className="overview-command-center-note">Wallet status counts use local fallback data because the Admin API does not provide them.</p> : null}
        </section>
      </div>
    </main>
  );
}
