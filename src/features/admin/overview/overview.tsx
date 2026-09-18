"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Card } from "../../../components/ui/card";
import { isAdminMockEnabled } from "../../../lib/auth/admin-auth-mode";
import type { AdminFinanceOverview } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { activityRoutes } from "../admin-routes";
import { memberStatusLabel, walletStatusLabel } from "../domain/rulebook";
import { dashboardActivityKey } from "../dashboard/dashboard-model";
import { CONDUCT_REPORT_UPDATED_EVENT } from "../conduct-report/conduct-report-model";
import { DISPUTE_CASE_UPDATED_EVENT } from "../dispute/dispute-model";
import { REPORT_CASE_UPDATED_EVENT } from "../report/report-model";
import { PAYOUT_MOCK_UPDATED_EVENT } from "../payout/payout-mock-state";
import {
  loadOverviewModelFromMock,
} from "./overview-adapter";
import { mockFinanceOverview } from "./overview-finance-mock-data";
import {
  questStateTones,
  type OverviewModel,
  type OverviewQueue,
} from "./overview-model";
import type { OverviewPageData } from "./overview-service";

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

function queueSourceLabel(row: OverviewQueue, translateText: (value: string) => string): string {
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

function translateOverviewValue(value: string, translateText: (value: string) => string): string {
  const relativeTimeMatch = /^(\d+) (minute|minutes|hour|hours|day|days) ago$/.exec(value);
  if (relativeTimeMatch) return `${relativeTimeMatch[1]} ${translateText(`${relativeTimeMatch[2]} ago`)}`;
  return translateText(value);
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
  const sourceLabel = isAdminApiEnabled() ? "Admin API" : "Local demo data";
  if (loading) {
    return <Card as="section" className="overview-command-center-finance overview-command-center-finance-member-focused" aria-labelledby="overview-finance-heading"><div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p>{translateText("Member Wallet totals and lifetime volume.")}</p></div><span>{translateText(sourceLabel)}</span></div><p className="overview-command-center-note">{translateText(isAdminApiEnabled() ? "Reading the Finance Overview from the Admin API…" : "Loading the Finance Overview…")}</p></Card>;
  }
  if (error || !overview) {
    return <Card as="section" className="overview-command-center-finance overview-command-center-finance-member-focused" aria-labelledby="overview-finance-heading"><div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p>{translateText("Member Wallet totals and lifetime volume.")}</p></div><span>{translateText("Unavailable")}</span></div><p className="overview-command-center-note">{error ? translateText(error) : translateText("Finance Overview is not available.")}</p></Card>;
  }

  return <Card as="section" className="overview-command-center-finance overview-command-center-finance-member-focused" aria-labelledby="overview-finance-heading">
    <div className="overview-command-center-section-head"><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p>{translateText("Member Wallet totals and lifetime volume.")}</p></div><span>{translateText(sourceLabel)}</span></div>
    <div className="overview-command-center-finance-groups">
      <FinanceGroup title={translateText("All Member Wallet Summary")}>
        <div className="overview-command-center-finance-metrics"><FinanceMetric label={translateText("All Spending balance")} value={overview.memberBalancesSummary.totalSpendingSatang} /><FinanceMetric label={translateText("All Earnings balance")} value={overview.memberBalancesSummary.totalEarningsSatang} /><FinanceMetric label={translateText("All Funding reserved")} value={overview.memberBalancesSummary.totalFundingReservedSatang} /><FinanceMetric label={translateText("All Payout reserved")} value={overview.memberBalancesSummary.totalPayoutReservedSatang} /><FinanceMetric label={translateText("Total circulating")} value={overview.memberBalancesSummary.totalCirculatingSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title={translateText("Lifetime Volume")}>
        <div className="overview-command-center-finance-metrics"><FinanceMetric label={translateText("Top-ups deposited")} value={overview.volumeLifetime.totalTopUpDepositedSatang} /><FinanceMetric label={translateText("Payouts completed")} value={overview.volumeLifetime.totalPayoutCompletedSatang} /><FinanceMetric label={translateText("Platform fees earned")} value={overview.volumeLifetime.totalPlatformFeesEarnedSatang} /></div>
      </FinanceGroup>
    </div>
  </Card>;
}

function OverviewLoading({ message }: { message: string }) {
  return <main id="dashboard-main" className="overview-command-center" tabIndex={-1} aria-busy="true"><Card as="section" className="panel"><p>{message}</p></Card></main>;
}

export function AdminOverview({
  initialData,
}: {
  initialData?: OverviewPageData;
} = {}) {
  const { translateText } = useAdminShell();
  const router = useRouter();
  const [model, setModel] = useState<OverviewModel | null>(initialData?.model ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [financeOverview, setFinanceOverview] = useState<AdminFinanceOverview | null>(
    initialData?.financeOverview ?? (isAdminMockEnabled() ? mockFinanceOverview : null),
  );
  const financeOverviewLoading = false;
  const [financeOverviewError, setFinanceOverviewError] = useState<string | null>(initialData?.financeOverviewError ?? null);
  useEffect(() => {
    let cancelled = false;
    const updateEvents = [
      CONDUCT_REPORT_UPDATED_EVENT,
      DISPUTE_CASE_UPDATED_EVENT,
      PAYOUT_MOCK_UPDATED_EVENT,
      REPORT_CASE_UPDATED_EVENT,
    ];

    if (isAdminApiEnabled()) {
      if (initialData) {
        setModel(initialData.model);
        setLoadError(null);
        setFinanceOverview(initialData.financeOverview);
        setFinanceOverviewError(initialData.financeOverviewError);
      }
      const refreshApi = () => {
        if (!cancelled) router.refresh();
      };
      const refreshApiWhenVisible = () => {
        if (document.visibilityState === "visible") refreshApi();
      };

      updateEvents.forEach((eventName) => window.addEventListener(eventName, refreshApi));
      window.addEventListener("focus", refreshApi);
      document.addEventListener("visibilitychange", refreshApiWhenVisible);

      return () => {
        cancelled = true;
        updateEvents.forEach((eventName) => window.removeEventListener(eventName, refreshApi));
        window.removeEventListener("focus", refreshApi);
        document.removeEventListener("visibilitychange", refreshApiWhenVisible);
      };
    }

    const refreshModel = () => {
      try {
        const nextModel = loadOverviewModelFromMock(localStorage);
        if (!cancelled) {
          setModel(nextModel);
          setLoadError(null);
        }
      } catch (error: unknown) {
        console.error("Overview failed to load", error);
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "The Overview could not load.");
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshModel();
    };

    refreshModel();
    updateEvents.forEach((eventName) => window.addEventListener(eventName, refreshModel));
    window.addEventListener("focus", refreshModel);
    window.addEventListener("storage", refreshModel);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      updateEvents.forEach((eventName) => window.removeEventListener(eventName, refreshModel));
      window.removeEventListener("focus", refreshModel);
      window.removeEventListener("storage", refreshModel);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [initialData, router]);

  if (!model) return <OverviewLoading message={translateText(loadError ?? "Loading marketplace overview…")} />;
  if (loadError) return <OverviewLoading message={translateText(loadError)} />;

  return (
    <>
      <main id="dashboard-main" className="overview-command-center" tabIndex={-1}>
        <header className="overview-command-center-header">
          <div>
            <span className="overview-command-center-kicker">{translateText("KUQuest Admin")}</span>
            <h1>{translateText("Overview")}</h1>
            <p>{translateText("One view of marketplace work, risk, and money.")}</p>
          </div>
        </header>

        <Card as="section" className="overview-command-center-command" aria-label={translateText("Work left")}>
          <div className="overview-command-center-hero">
            <div className="overview-command-center-hero-copy">
              <small>{translateText("Work left")}</small>
              <strong>{countLabel(model.totalWorkLeft)}</strong>
              <span>{translateText("open decisions")}</span>
              {model.hasSummaryOnlyData && <span className="overview-command-center-hero-note">{translateText("The Admin API provided queue counts without all queue details.")}</span>}
              {model.hasUnavailableData && <span className="overview-command-center-hero-note">{translateText("Some Overview values are not provided by the Admin API.")}</span>}
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
        </Card>

        <FinanceOverviewSection overview={financeOverview} loading={financeOverviewLoading} error={financeOverviewError} translateText={translateText} />

        <div className="overview-command-center-grid">
          <Card as="section" className="overview-command-center-table" aria-labelledby="overview-command-queue-heading">
            <div className="overview-command-center-section-head">
              <div><h2 id="overview-command-queue-heading">{translateText("Queue map")}</h2><p>{translateText("What needs attention now.")}</p></div>
              <span>{translateText("Current counts")}</span>
            </div>
            <div className="overview-command-center-table-head"><span>{translateText("Queue")}</span><span>{translateText("Detail")}</span><span>{translateText("State")}</span><span>{translateText("Waiting")}</span></div>
            <ul className="overview-command-center-queue">
              {model.queues.map((row) => {
                const processHref = row.oldestHref;
                return <li key={row.id}>
                  <span className="overview-command-center-queue-title"><strong><Link href={row.listHref}>{translateText(row.title)}</Link></strong><small>{countLabel(row.count)} {translateText("open")}</small>{isAdminMockEnabled() && row.count !== null && row.count > 0 && processHref ? <Link className="link overview-queue-process" href={processHref}>{translateText("Process next")}</Link> : null}</span>
                  <span className="overview-command-center-queue-oldest">
                    {row.oldestHref ? <Link href={row.oldestHref}>{translateOverviewValue(row.oldest, translateText)}</Link> : translateOverviewValue(row.oldest, translateText)}
                    {row.oldestId ? <small>{row.oldestId}</small> : null}
                  </span>
                  <span className={`overview-command-center-queue-status ${row.tone}`}><strong>{translateText(row.status)}</strong></span>
                  <span className="overview-command-center-queue-waiting"><strong>{translateOverviewValue(row.waiting, translateText)}</strong></span>
                </li>;
              })}
            </ul>
          </Card>

          <Card as="section" className="overview-command-center-activity" aria-labelledby="overview-command-activity-heading">
            <div className="overview-command-center-section-head">
              <div><h2 id="overview-command-activity-heading"><Link href={activityRoutes.list()}>{translateText("Activity Log")}</Link></h2><p>{translateText("Recent Admin changes.")}</p></div>
              <span>{translateText("Latest")} {model.activity.length}</span>
            </div>
            {model.activity.length ? (
              <ol className="overview-command-center-timeline overview-command-center-timeline-scrollable">
                {model.activity.map((entry, index) => (
                  <li key={dashboardActivityKey(entry, index)}>
                    <span className="overview-command-center-timeline-marker" aria-hidden="true">{index + 1}</span>
                    <span className="overview-command-center-timeline-avatar" aria-hidden="true">{entry.actor}</span>
                    <span><strong>{translateOverviewValue(entry.title, translateText)}</strong><small>{translateOverviewValue(entry.detail, translateText)} · {relativeTime(entry.timestamp, translateText)}</small></span>
                  </li>
                ))}
              </ol>
            ) : <p className="overview-command-center-note">{translateText("No administrative activity is available.")}</p>}
          </Card>
        </div>

        <div className="overview-command-center-snapshot">
          <Card as="section" className="overview-command-center-snapshot-card" aria-labelledby="overview-command-quest-heading">
            <div className="overview-command-center-section-head"><div><h2 id="overview-command-quest-heading">{translateText("Quest States")}</h2><p>{translateText("Current distribution across Quests.")}</p></div><span>{countLabel(model.questTotal)} {translateText("total")}</span></div>
            <ul className="overview-command-center-status-list">
              {model.questStates.map((entry) => (
                <li key={entry.status} className={`overview-command-center-status-row ${questStateTones[entry.status]}`}>
                  <span className="overview-command-center-status-dot" aria-hidden="true" />
                  <span><strong>{translateText(entry.label)}</strong><small>{translateText("Quest status")}</small></span>
                  <strong>{countLabel(entry.count)}</strong>
                </li>
              ))}
            </ul>
          </Card>

          <Card as="section" className="overview-command-center-snapshot-card" aria-labelledby="overview-command-members-heading">
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
          </Card>

          <Card as="section" className="overview-command-center-snapshot-card" aria-labelledby="overview-command-wallets-heading">
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
            {model.walletStatusSource === "Unavailable" ? <p className="overview-command-center-note">{translateText("Wallet status counts are not provided by the Admin API.")}</p> : model.walletStatusSource === "Local fallback" ? <p className="overview-command-center-note">{translateText("Wallet status counts use local fallback data because the Admin API does not provide them.")}</p> : null}
          </Card>
        </div>
      </main>
    </>
  );
}
