"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { isAdminMockEnabled } from "../../../lib/auth/admin-auth-mode";
import { adminApi, type AdminFinanceOverview, type AdminMemberListItem, type AdminPayout, type AdminQuest } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { activityRoutes } from "../admin-routes";
import { memberStatusLabel, walletStatusLabel } from "../domain/rulebook";
import type { PersistedAdminData } from "../data/admin-records";
import { loadDashboardData } from "./dashboard-bootstrap";
import { dashboardActivityFromApi, dashboardActivityKey, type DashboardActivity } from "./dashboard-model";
import {
  overviewCloneFallbackWithoutApiData,
  overviewCloneModelFromApi,
  overviewCloneModelFromMockData,
  overviewSearchResultsFromApi,
  overviewSearchResultsFromMockData,
  questStateTones,
  type OverviewCloneModel,
  type OverviewCloneQueue,
  type OverviewSearchResult,
} from "./overview-clone-model";

const ACTIVITY_STORAGE_KEY = "kuquest-admin-activity-v2";

type ApiSearchData = {
  quests: AdminQuest[];
  members: AdminMemberListItem[];
  payouts: AdminPayout[];
};

type SearchData =
  | { source: "mock"; data: PersistedAdminData }
  | { source: "api"; data: ApiSearchData };

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

function relativeTime(timestamp: number, translateText: (value: string) => string): string {
  if (!timestamp) return translateText("Time not provided");
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return translateText("Just now");
  if (minutes < 60) return `${minutes} ${translateText(minutes === 1 ? "minute ago" : "minutes ago")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${translateText(hours === 1 ? "hour ago" : "hours ago")}`;
  const days = Math.floor(hours / 24);
  return `${days} ${translateText(days === 1 ? "day ago" : "days ago")}`;
}

function queueSourceLabel(row: OverviewCloneQueue, translateText: (value: string) => string): string {
  if (row.source === "Admin API") return translateText("Admin API count");
  if (row.source === "Unavailable") return translateText("Not provided by the Admin API");
  return translateText("Local fallback · API path unavailable");
}

function countLabel(count: number | null): string {
  return count === null ? "—" : new Intl.NumberFormat("en-US").format(count);
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

function SearchIcon() {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
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
  translateText,
}: {
  overview: AdminFinanceOverview | null;
  loading: boolean;
  error: string | null;
  translateText: (value: string) => string;
}) {
  if (!isAdminApiEnabled()) return null;
  if (loading) {
    return <section className="overview-command-center-finance" aria-labelledby="overview-finance-heading"><div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p>{translateText("Platform and Member Wallet totals.")}</p></div><span>Admin API</span></div><p className="overview-command-center-note">{translateText("Reading the Finance Overview from the Admin API…")}</p></section>;
  }
  if (error || !overview) {
    return <section className="overview-command-center-finance" aria-labelledby="overview-finance-heading"><div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p>{translateText("Platform and Member Wallet totals.")}</p></div><span>{translateText("Unavailable")}</span></div><p className="overview-command-center-note">{error || translateText("Finance Overview is not available.")}</p></section>;
  }

  const integrityLabel = overview.integrity.subledgerBalanced ? "Balanced" : "Needs review";
  const integrityClass = overview.integrity.subledgerBalanced ? "is-balanced" : "needs-review";
  return <section className="overview-command-center-finance" aria-labelledby="overview-finance-heading">
    <div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p>{translateText("Platform and Member Wallet totals.")}</p></div><span>Admin API</span></div>
    <div className="overview-command-center-finance-groups">
      <FinanceGroup title={translateText("Platform Balances")}>
        <div className="overview-command-center-finance-metrics"><FinanceMetric label={translateText("Revenue")} value={overview.platformBalances.revenueSatang} /><FinanceMetric label={translateText("Suspense")} value={overview.platformBalances.suspenseSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title={translateText("Member Wallet Summary")}>
        <div className="overview-command-center-finance-metrics"><FinanceMetric label={translateText("Spending balance")} value={overview.memberBalancesSummary.totalSpendingSatang} /><FinanceMetric label={translateText("Earnings balance")} value={overview.memberBalancesSummary.totalEarningsSatang} /><FinanceMetric label={translateText("Funding reserved")} value={overview.memberBalancesSummary.totalFundingReservedSatang} /><FinanceMetric label={translateText("Payout reserved")} value={overview.memberBalancesSummary.totalPayoutReservedSatang} /><FinanceMetric label={translateText("Total circulating")} value={overview.memberBalancesSummary.totalCirculatingSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title={translateText("Lifetime Volume")}>
        <div className="overview-command-center-finance-metrics"><FinanceMetric label={translateText("Top-ups deposited")} value={overview.volumeLifetime.totalTopUpDepositedSatang} /><FinanceMetric label={translateText("Payouts completed")} value={overview.volumeLifetime.totalPayoutCompletedSatang} /><FinanceMetric label={translateText("Platform fees earned")} value={overview.volumeLifetime.totalPlatformFeesEarnedSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title={translateText("Ledger Integrity")}>
        <div className="overview-command-center-finance-integrity"><div><span>{translateText("Subledger status")}</span><strong className={integrityClass}>{translateText(integrityLabel)}</strong></div><div><span>{translateText("Posting discrepancy")}</span><strong>{moneyFromSatang(overview.integrity.totalPostingsDiscrepancySatang)}</strong></div><div><span>{translateText("Last audited")}</span><strong>{financeDateLabel(overview.integrity.lastAuditedAt)}</strong></div></div>
      </FinanceGroup>
    </div>
  </section>;
}

function OverviewCloneLoading({ message }: { message: string }) {
  return <main id="dashboard-main" className="overview-command-center" tabIndex={-1} aria-busy="true"><section className="panel"><p>{message}</p></section></main>;
}

function searchResultMarker(kind: OverviewSearchResult["kind"]): string {
  return kind === "member" ? "M" : kind === "payout" ? "P" : "Q";
}

function OverviewSearch({
  open,
  onClose,
  translateText,
}: {
  open: boolean;
  onClose: () => void;
  translateText: (value: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQuery("");
    setData(null);
    setError(null);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);

    if (isAdminMockEnabled()) {
      setData({ source: "mock", data: loadDashboardData(localStorage) });
      return () => {
        document.removeEventListener("keydown", closeOnEscape);
      };
    }

    setLoading(true);
    void Promise.allSettled([
      adminApi.listQuests({ limit: 100, sort: "newest" }),
      adminApi.listMembers({ limit: 100 }),
      adminApi.listPayouts({ limit: 100, sort: "newest" }),
    ]).then(([quests, members, payouts]) => {
      if (cancelled) return null;
      const fulfilled = [quests, members, payouts].filter((result) => result.status === "fulfilled");
      if (!fulfilled.length) {
        setError(translateText("The Admin API search is not available."));
      }
      setData({
        source: "api",
        data: {
          quests: quests.status === "fulfilled" ? quests.value.items : [],
          members: members.status === "fulfilled" ? members.value.items : [],
          payouts: payouts.status === "fulfilled" ? payouts.value.items : [],
        },
      });
      return null;
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open, translateText]);

  if (!open) return null;
  const results = data?.source === "mock"
    ? overviewSearchResultsFromMockData(data.data, query)
    : data?.source === "api"
      ? overviewSearchResultsFromApi(data.data, query)
      : [];

  return (
    <dialog open id="overview-command" className="command" aria-modal="true" aria-label={translateText("Search marketplace records")}>
      <button className="command-backdrop" type="button" aria-label={translateText("Close search")} onClick={onClose} />
      <div className="command-box">
        <div className="command-input">
          <SearchIcon />
          <input
            type="search"
            aria-label={translateText("Search marketplace records")}
            placeholder={translateText("Search by name, Quest, Student ID, or Payout…")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <kbd>Esc</kbd>
        </div>
        <div id="overview-command-results">
          {loading && <p className="empty">{translateText("Loading search records…")}</p>}
          {error && <p className="empty">{error}</p>}
          {results.map((result) => (
            <Link key={`${result.kind}-${result.id}`} className="result" href={result.href} onClick={onClose}>
              <span aria-hidden="true">{searchResultMarker(result.kind)}</span>
              <span><strong>{result.title}</strong><small>{result.id} · {translateText(result.detail)}</small></span>
              <small>{translateText(result.kind === "member" ? "Member" : result.kind === "payout" ? "Payout" : "Quest")}</small>
            </Link>
          ))}
          {!loading && !error && query && !results.length && <p className="empty">{translateText("No matching records")}</p>}
        </div>
      </div>
    </dialog>
  );
}

export function AdminOverview() {
  const { translateText } = useAdminShell();
  const [model, setModel] = useState<OverviewCloneModel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [financeOverview, setFinanceOverview] = useState<AdminFinanceOverview | null>(null);
  const [financeOverviewLoading, setFinanceOverviewLoading] = useState(isAdminApiEnabled());
  const [financeOverviewError, setFinanceOverviewError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      if (isAdminApiEnabled()) {
        const [overview, activityPage] = await Promise.all([
          adminApi.getOverview(),
          adminApi.listActivityLogs({ limit: 4, sort: "newest" }).catch(() => ({ items: [], nextCursor: null })),
        ]);
        if (!cancelled) {
          setModel(overviewCloneModelFromApi(
            overview,
            activityPage.items.map(dashboardActivityFromApi),
            overviewCloneFallbackWithoutApiData(),
          ));
        }
        return;
      }

      const data = loadDashboardData(localStorage);
      if (!cancelled) setModel(overviewCloneModelFromMockData(data, localActivityEvents()));
    };

    void loadOverview().catch((error: unknown) => {
      console.error("Overview failed to load", error);
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

  useEffect(() => {
    const openSearchWithShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", openSearchWithShortcut);
    return () => document.removeEventListener("keydown", openSearchWithShortcut);
  }, []);

  if (!model) return <OverviewCloneLoading message={translateText(loadError ?? "Loading marketplace overview…")} />;
  if (loadError) return <OverviewCloneLoading message={loadError} />;

  return (
    <>
      <main id="dashboard-main" className="overview-command-center" tabIndex={-1}>
        <header className="overview-command-center-header">
          <div>
            <span className="overview-command-center-kicker">{translateText("KUQuest Admin")}</span>
            <h1>{translateText("Overview")}</h1>
            <p>{translateText("One view of marketplace work, risk, and money.")}</p>
          </div>
          <button className="search overview-search-trigger" type="button" aria-label={translateText("Search marketplace records")} onClick={() => setSearchOpen(true)}>
            <SearchIcon />
            <span>{translateText("Search by name, Quest, Student ID, or Payout…")}</span>
            <kbd>⌘ K</kbd>
          </button>
        </header>

        <section className="overview-command-center-command" aria-label={translateText("Work left")}>
          <div className="overview-command-center-hero">
            <div className="overview-command-center-hero-copy">
              <small>{translateText("Work left")}</small>
              <strong>{countLabel(model.totalWorkLeft)}</strong>
              <span>{translateText("open decisions")}</span>
              {model.hasFallbackQueues && <span className="overview-command-center-hero-note">{translateText("Some Overview counters are not provided by the Admin API.")}</span>}
            </div>
            <div className="overview-command-center-hero-stats">
              {model.queues.map((row) => (
                <div key={row.id}>
                  <Link href={row.listHref}>{translateText(row.title)}</Link>
                  <strong>{countLabel(row.count)}</strong>
                  <small>{queueSourceLabel(row, translateText)}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FinanceOverviewSection overview={financeOverview} loading={financeOverviewLoading} error={financeOverviewError} translateText={translateText} />

        <div className="overview-command-center-grid">
          <section className="overview-command-center-table" aria-labelledby="overview-command-queue-heading">
            <div className="overview-command-center-section-head">
              <div><h2 id="overview-command-queue-heading">{translateText("Queue map")}</h2><p>{translateText("What needs attention now.")}</p></div>
              <span>{translateText("Current counts")}</span>
            </div>
            <div className="overview-command-center-table-head"><span>{translateText("Queue")}</span><span>{translateText("Detail")}</span><span>{translateText("State")}</span><span>{translateText("Waiting")}</span></div>
            <ul className="overview-command-center-queue">
              {model.queues.map((row) => (
                <li key={row.id}>
                  <span className="overview-command-center-queue-title"><strong><Link href={row.listHref}>{translateText(row.title)}</Link></strong><small>{countLabel(row.count)} {translateText("open")}</small></span>
                  <span className="overview-command-center-queue-oldest">{row.oldestHref ? <Link href={row.oldestHref}>{row.oldest}</Link> : row.oldest}</span>
                  <span className={`overview-command-center-queue-status ${row.tone}`}>{translateText(row.status)}</span>
                  <span className="overview-command-center-queue-waiting">{row.waiting}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview-command-center-activity" aria-labelledby="overview-command-activity-heading">
            <div className="overview-command-center-section-head">
              <div><h2 id="overview-command-activity-heading"><Link href={activityRoutes.list()}>{translateText("Activity Log")}</Link></h2><p>{translateText("Recent Admin changes.")}</p></div>
              <span>{translateText("Latest")} {model.activity.length}</span>
            </div>
            {model.activity.length ? (
              <ol className="overview-command-center-timeline">
                {model.activity.map((entry, index) => (
                  <li key={dashboardActivityKey(entry, index)}>
                    <span className="overview-command-center-timeline-marker" aria-hidden="true">{index + 1}</span>
                    <span className="overview-command-center-timeline-avatar" aria-hidden="true">{entry.actor}</span>
                    <span><strong>{entry.title}</strong><small>{entry.detail} · {relativeTime(entry.timestamp, translateText)}</small></span>
                  </li>
                ))}
              </ol>
            ) : <p className="overview-command-center-note">{translateText("No administrative activity is available.")}</p>}
          </section>
        </div>

        <div className="overview-command-center-snapshot">
          <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-quest-heading">
            <div className="overview-command-center-section-head"><div><h2 id="overview-command-quest-heading">{translateText("Quest States")}</h2><p>{translateText("Current distribution across Quests.")}</p></div><span>{countLabel(model.questTotal)} {translateText("total")}</span></div>
            <ul className="overview-command-center-state-list">
              {model.questStates.map((entry) => (
                <li key={entry.status}>
                  <span><span>{translateText(entry.label)}</span><strong>{countLabel(entry.count)}</strong></span>
                  <span className="overview-command-center-state-track" aria-hidden="true"><span className={`overview-command-center-state-bar ${questStateTones[entry.status]}`} style={{ width: `${entry.percentage}%` }} /></span>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-members-heading">
            <div className="overview-command-center-section-head"><div><h2 id="overview-command-members-heading">{translateText("Members")}</h2><p>{translateText("Count by Member status.")}</p></div><span>{translateText(model.memberStatusSource)}</span></div>
            <ul className="overview-command-center-status-list">
              {model.memberStatusCounts.map((entry) => (
                <li key={entry.status} className={`overview-command-center-status-row overview-member-${entry.status.toLowerCase().replaceAll(" ", "-")}`}>
                  <span className="overview-command-center-status-dot" aria-hidden="true" />
                  <span><strong>{translateText(memberStatusLabel(entry.status))}</strong><small>{translateText("Member status")}</small></span>
                  <strong>{countLabel(entry.count)}</strong>
                </li>
              ))}
            </ul>
            {model.memberStatusSource === "Unavailable" ? <p className="overview-command-center-note">{translateText("Member status counts are not provided by the Admin API.")}</p> : model.memberStatusSource === "Local fallback" ? <p className="overview-command-center-note">{translateText("Member status counts use local fallback data because the Admin API does not provide them.")}</p> : null}
          </section>

          <section className="overview-command-center-snapshot-card" aria-labelledby="overview-command-wallets-heading">
            <div className="overview-command-center-section-head"><div><h2 id="overview-command-wallets-heading">{translateText("Wallets")}</h2><p>{translateText("Count by Wallet status.")}</p></div><span>{translateText(model.walletStatusSource)}</span></div>
            <ul className="overview-command-center-status-list">
              {model.walletStatusCounts.map((entry) => (
                <li key={entry.status} className={`overview-command-center-status-row overview-wallet-${entry.status.toLowerCase()}`}>
                  <span className="overview-command-center-status-dot" aria-hidden="true" />
                  <span><strong>{translateText(walletStatusLabel(entry.status))}</strong><small>{translateText("Wallet status")}</small></span>
                  <strong>{countLabel(entry.count)}</strong>
                </li>
              ))}
            </ul>
            <div className="overview-command-center-status-fact"><span>{translateText("Payouts in flight")}</span><strong>{model.inFlightPayouts === null ? "—" : countLabel(model.inFlightPayouts)}</strong></div>
            {model.walletStatusSource === "Unavailable" ? <p className="overview-command-center-note">{translateText("Wallet status counts are not provided by the Admin API.")}</p> : model.walletStatusSource === "Local fallback" ? <p className="overview-command-center-note">{translateText("Wallet status counts use local fallback data because the Admin API does not provide them.")}</p> : null}
          </section>
        </div>
      </main>
      <OverviewSearch open={searchOpen} onClose={closeSearch} translateText={translateText} />
    </>
  );
}

export const OverviewClone = AdminOverview;
