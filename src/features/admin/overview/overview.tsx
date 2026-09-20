"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Card, CardHeader } from "../../../components/ui/card";
import { isAdminMockEnabled } from "../../../lib/auth/admin-auth-mode";
import type { AdminFinanceOverview } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { activityRoutes } from "../admin-routes";
import { memberStatusLabel, walletStatusLabel } from "../domain/rulebook";
import { dashboardActivityKey } from "../dashboard/dashboard-model";
import {
  questStateTones,
  type OverviewModel,
  type OverviewQueue,
} from "./overview-model";
import { useOverviewQuery } from "./overview-query";
import type { OverviewPageData } from "./overview-service";

const overviewSectionHead = "flex items-end justify-between gap-6 border-b border-admin-border px-[18px] pb-3 pt-[17px] max-[560px]:items-start max-[560px]:flex-col max-[560px]:gap-2.5";
const overviewNote = "mx-[18px] mb-[17px] mt-[13px] text-xs leading-relaxed text-admin-faint";
const queueToneClasses: Record<string, string> = {
  "overview-queue-status-overdue": "bg-admin-danger-soft text-admin-danger",
  "overview-queue-status-review": "bg-admin-warning-soft text-admin-warning",
};
const questToneClasses: Record<string, string> = {
  "overview-quest-draft": "bg-admin-status-quest-draft text-admin-status-quest-draft",
  "overview-quest-open": "bg-admin-status-quest-open text-admin-status-quest-open",
  "overview-quest-assigned": "bg-admin-status-quest-assigned text-admin-status-quest-assigned",
  "overview-quest-in-progress": "bg-admin-status-quest-in-progress text-admin-status-quest-in-progress",
  "overview-quest-completed": "bg-admin-status-quest-completed text-admin-status-quest-completed",
  "overview-quest-cancelled": "bg-admin-status-quest-cancelled text-admin-status-quest-cancelled",
  "overview-quest-failed": "bg-admin-status-quest-failed text-admin-status-quest-failed",
};
const memberToneClasses: Record<string, string> = {
  normal: "bg-admin-status-member-normal text-admin-status-member-normal",
  flag: "bg-admin-status-member-flag text-admin-status-member-flag",
  "temp-ban": "bg-admin-status-member-temp-ban text-admin-status-member-temp-ban",
  "perm-ban": "bg-admin-status-member-perm-ban text-admin-status-member-perm-ban",
};
const walletToneClasses: Record<string, string> = {
  active: "bg-admin-status-wallet-active text-admin-status-wallet-active",
  frozen: "bg-admin-status-wallet-frozen text-admin-status-wallet-frozen",
  suspended: "bg-admin-status-wallet-suspended text-admin-status-wallet-suspended",
  closed: "bg-admin-status-wallet-closed text-admin-status-wallet-closed",
};

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
  return <div className="overview-command-center-finance-metric grid min-w-0 gap-1"><span className="text-xs leading-tight text-admin-muted">{label}</span><strong className="text-lg tabular-nums text-admin-text">{moneyFromSatang(value)}</strong></div>;
}

function FinanceGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="overview-command-center-finance-group min-w-0 border-r border-admin-border p-[15px_18px_17px] last:border-r-0 max-[560px]:border-b max-[560px]:border-r-0 max-[560px]:last:border-b-0"><h3 className="mb-3 text-[15px] font-semibold text-admin-text">{title}</h3>{children}</div>;
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
    return <Card as="section" className="overview-command-center-finance overview-command-center-finance-member-focused mt-[18px] overflow-hidden" aria-labelledby="overview-finance-heading"><CardHeader flush className={overviewSectionHead}><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("Member Wallet totals and lifetime volume.")}</p></div><span className="whitespace-nowrap text-xs font-extrabold text-admin-muted">{translateText(sourceLabel)}</span></CardHeader><p className={overviewNote}>{translateText(isAdminApiEnabled() ? "Reading the Finance Overview from the Admin API…" : "Loading the Finance Overview…")}</p></Card>;
  }
  if (error || !overview) {
    return <Card as="section" className="overview-command-center-finance overview-command-center-finance-member-focused mt-[18px] overflow-hidden" aria-labelledby="overview-finance-heading"><CardHeader flush className={overviewSectionHead}><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("Member Wallet totals and lifetime volume.")}</p></div><span className="whitespace-nowrap text-xs font-extrabold text-admin-muted">{translateText("Unavailable")}</span></CardHeader><p className={overviewNote}>{error ? translateText(error) : translateText("Finance Overview is not available.")}</p></Card>;
  }

  return <Card as="section" className="overview-command-center-finance overview-command-center-finance-member-focused mt-[18px] overflow-hidden" aria-labelledby="overview-finance-heading">
    <CardHeader flush className={overviewSectionHead}><div><h2 id="overview-finance-heading">{translateText("Finance Overview")}</h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("Member Wallet totals and lifetime volume.")}</p></div><span className="whitespace-nowrap text-xs font-extrabold text-admin-muted">{translateText(sourceLabel)}</span></CardHeader>
    <div className="overview-command-center-finance-groups grid grid-cols-2 border-t border-admin-border max-[560px]:grid-cols-1">
      <FinanceGroup title={translateText("All Member Wallet Summary")}>
        <div className="overview-command-center-finance-metrics grid grid-cols-2 gap-2.5"><FinanceMetric label={translateText("All Spending balance")} value={overview.memberBalancesSummary.totalSpendingSatang} /><FinanceMetric label={translateText("All Earnings balance")} value={overview.memberBalancesSummary.totalEarningsSatang} /><FinanceMetric label={translateText("All Funding reserved")} value={overview.memberBalancesSummary.totalFundingReservedSatang} /><FinanceMetric label={translateText("All Payout reserved")} value={overview.memberBalancesSummary.totalPayoutReservedSatang} /><FinanceMetric label={translateText("Total circulating")} value={overview.memberBalancesSummary.totalCirculatingSatang} /></div>
      </FinanceGroup>
      <FinanceGroup title={translateText("Lifetime Volume")}>
        <div className="overview-command-center-finance-metrics grid grid-cols-2 gap-2.5"><FinanceMetric label={translateText("Top-ups deposited")} value={overview.volumeLifetime.totalTopUpDepositedSatang} /><FinanceMetric label={translateText("Payouts completed")} value={overview.volumeLifetime.totalPayoutCompletedSatang} /><FinanceMetric label={translateText("Platform fees earned")} value={overview.volumeLifetime.totalPlatformFeesEarnedSatang} /></div>
      </FinanceGroup>
    </div>
  </Card>;
}

function OverviewLoading({ message }: { message: string }) {
  return <main id="dashboard-main" className="overview-command-center col-start-2 min-w-0 mx-auto w-full max-w-[1400px] px-[34px] pb-11 pt-[30px] max-[900px]:col-start-1 max-[820px]:px-5 max-[820px]:py-6 max-[560px]:px-5" tabIndex={-1} aria-busy="true"><Card as="section" className="p-5"><p>{message}</p></Card></main>;
}

export function AdminOverview({
  initialData,
}: {
  initialData?: OverviewPageData;
} = {}) {
  const { translateText } = useAdminShell();
  const { data, error, isPending } = useOverviewQuery(initialData);
  const model: OverviewModel | null = data?.model ?? null;
  const financeOverview: AdminFinanceOverview | null = data?.financeOverview ?? null;
  const financeOverviewError = data?.financeOverviewError ?? null;

  if (!model) return <OverviewLoading message={translateText(error instanceof Error ? error.message : isPending ? "Loading marketplace overview…" : "The Overview could not load.")} />;

  return (
    <main id="dashboard-main" className="overview-command-center col-start-2 min-w-0 mx-auto w-full max-w-[1400px] px-[34px] pb-11 pt-[30px] max-[900px]:col-start-1 max-[820px]:px-5 max-[820px]:py-6 max-[560px]:px-5" tabIndex={-1}>
        <header className="overview-command-center-header mb-6 flex items-end justify-between gap-6 max-[560px]:items-start max-[560px]:flex-col max-[560px]:gap-2.5">
          <div>
            <span className="overview-command-center-kicker mb-2 block text-[13px] font-extrabold uppercase tracking-[.13em] text-admin-accent">{translateText("KUQuest Admin")}</span>
            <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold leading-none tracking-[-.045em] text-admin-text">{translateText("Overview")}</h1>
            <p className="mt-2 text-[15px] text-admin-muted">{translateText("One view of marketplace work, risk, and money.")}</p>
          </div>
        </header>

        <Card as="section" className="overview-command-center-command mb-[34px] overflow-hidden rounded-admin-lg border-0 bg-admin-accent-strong p-[26px_30px_28px] text-white shadow-[0_16px_30px_color-mix(in_srgb,var(--accent2)_22%,transparent)] max-[820px]:p-[22px_20px_24px]" aria-label={translateText("Work left")}>
          <div className="overview-command-center-hero grid min-h-[220px] grid-cols-[minmax(230px,.85fr)_minmax(0,1.7fr)] gap-[30px] overflow-hidden max-[820px]:grid-cols-1 max-[820px]:gap-5">
            <div className="overview-command-center-hero-copy flex flex-col items-start justify-center border-r border-white/25 max-[820px]:border-b max-[820px]:border-r-0 max-[820px]:pb-5">
              <small className="text-sm font-extrabold uppercase tracking-[.08em] text-white/72">{translateText("Work left")}</small>
              <strong className="mt-2 text-[70px] font-bold leading-[.9] tracking-[-.08em]">{countLabel(model.totalWorkLeft)}</strong>
              <span className="text-sm font-extrabold uppercase tracking-[.08em] text-white/72">{translateText("open decisions")}</span>
              {model.hasSummaryOnlyData && <span className="mt-5 rounded-full border border-white/25 px-2.5 py-1.5 text-[13px] font-bold text-white">{translateText("The Admin API provided queue counts without all queue details.")}</span>}
              {model.hasUnavailableData && <span className="mt-5 rounded-full border border-white/25 px-2.5 py-1.5 text-[13px] font-bold text-white">{translateText("Some Overview values are not provided by the Admin API.")}</span>}
            </div>
            <div className="overview-command-center-hero-stats grid grid-cols-2 content-center gap-2.5 max-[560px]:grid-cols-1">
              {model.queues.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2 rounded-[10px] border border-white/25 bg-white/10 p-3.5">
                  <Link className="col-start-1 [overflow-wrap:anywhere] text-sm font-extrabold text-white no-underline hover:underline hover:underline-offset-2" href={row.listHref}>{translateText(row.title)}</Link>
                  <strong className="col-start-2 row-start-1 text-[34px] leading-none tracking-[-.05em] text-white">{countLabel(row.count)}</strong>
                  <small className="col-span-full text-[13px] text-white/84">{queueSourceLabel(row, translateText)}</small>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <FinanceOverviewSection overview={financeOverview} loading={isPending && !data} error={financeOverviewError} translateText={translateText} />

        <div className="overview-command-center-grid mt-[10px] grid grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)] items-start gap-[18px] max-[820px]:grid-cols-1">
          <Card as="section" className="overview-command-center-table overflow-hidden" aria-labelledby="overview-command-queue-heading">
            <CardHeader flush className={overviewSectionHead}>
              <div><h2 id="overview-command-queue-heading" className="m-0 text-[19px] font-semibold tracking-[-.02em] text-admin-text">{translateText("Queue map")}</h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("What needs attention now.")}</p></div>
              <span className="whitespace-nowrap text-[13px] font-extrabold text-admin-muted">{translateText("Current counts")}</span>
            </CardHeader>
            <div className="overview-command-center-table-head grid grid-cols-[minmax(0,1.15fr)_minmax(150px,1fr)_minmax(105px,.7fr)_minmax(70px,.45fr)] items-center gap-4 bg-admin-soft px-[18px] py-2.5 text-xs font-extrabold uppercase tracking-[.08em] text-admin-faint max-[560px]:grid-cols-[minmax(0,1fr)_auto] [&_span:nth-child(2)]:max-[560px]:hidden [&_span:nth-child(3)]:max-[560px]:hidden"><span>{translateText("Queue")}</span><span>{translateText("Detail")}</span><span>{translateText("State")}</span><span>{translateText("Waiting")}</span></div>
            <ul className="overview-command-center-queue m-0 list-none p-0">
              {model.queues.map((row) => {
                const processHref = row.oldestHref;
                return <li key={row.id} className="grid min-h-16 grid-cols-[minmax(0,1.15fr)_minmax(150px,1fr)_minmax(105px,.7fr)_minmax(70px,.45fr)] items-center gap-4 border-t border-admin-border-subtle px-[18px] py-[11px] max-[560px]:grid-cols-[minmax(0,1fr)_auto]">
                  <span className="overview-command-center-queue-title grid min-w-0 gap-0.5"><strong className="text-sm text-admin-text"><Link className="text-inherit no-underline hover:underline hover:underline-offset-2" href={row.listHref}>{translateText(row.title)}</Link></strong><small className="text-[13px] text-admin-muted">{countLabel(row.count)} {translateText("open")}</small>{isAdminMockEnabled() && row.count !== null && row.count > 0 && processHref ? <Link className="text-sm text-admin-accent underline underline-offset-2" href={processHref}>{translateText("Process next")}</Link> : null}</span>
                  <span className="overview-command-center-queue-oldest min-w-0 overflow-hidden text-[13px] leading-[1.35] text-admin-muted [overflow-wrap:anywhere] max-[560px]:col-span-full max-[560px]:row-start-2">
                    {row.oldestHref ? <Link className="text-inherit hover:underline hover:underline-offset-2" href={row.oldestHref}>{translateOverviewValue(row.oldest, translateText)}</Link> : translateOverviewValue(row.oldest, translateText)}
                    {row.oldestId ? <small className="mt-0.5 block text-xs text-admin-muted">{row.oldestId}</small> : null}
                  </span>
                  <span className={`overview-command-center-queue-status ${row.tone} justify-self-start rounded-full px-2 py-1 text-xs font-extrabold ${queueToneClasses[row.tone] ?? "bg-admin-accent-soft text-admin-accent"} max-[560px]:col-span-full max-[560px]:row-start-3`}><strong>{translateText(row.status)}</strong></span>
                  <span className="overview-command-center-queue-waiting justify-self-start text-[13px] font-bold text-admin-muted max-[560px]:col-start-2 max-[560px]:row-start-1"><strong>{translateOverviewValue(row.waiting, translateText)}</strong></span>
                </li>;
              })}
            </ul>
          </Card>

          <Card as="section" className="overview-command-center-activity overflow-hidden" aria-labelledby="overview-command-activity-heading">
            <CardHeader flush className={overviewSectionHead}>
              <div><h2 id="overview-command-activity-heading" className="m-0 text-[19px] font-semibold tracking-[-.02em] text-admin-text"><Link className="text-inherit no-underline hover:underline hover:underline-offset-2" href={activityRoutes.list()}>{translateText("Activity Log")}</Link></h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("Recent Admin changes.")}</p></div>
              <span className="whitespace-nowrap text-[13px] font-extrabold text-admin-muted">{translateText("Latest")} {model.activity.length}</span>
            </CardHeader>
            {model.activity.length ? (
              <ol className="overview-command-center-timeline overview-command-center-timeline-scrollable m-0 max-h-[360px] list-none overflow-y-auto overscroll-contain px-[18px] py-[7px] [scrollbar-gutter:stable] max-[820px]:max-h-[min(520px,60vh)]">
                {model.activity.map((entry, index) => (
                  <li key={dashboardActivityKey(entry, index)} className="grid min-h-[62px] grid-cols-[20px_32px_minmax(0,1fr)] items-center gap-[9px] border-b border-admin-border-subtle last:border-b-0">
                    <span className="overview-command-center-timeline-marker grid size-5 place-items-center rounded-full border border-admin-border text-[11px] font-extrabold text-admin-faint" aria-hidden="true">{index + 1}</span>
                    <span className="overview-command-center-timeline-avatar grid size-[30px] place-items-center rounded-lg bg-admin-avatar text-xs font-extrabold text-admin-accent-strong" aria-hidden="true">{entry.actor}</span>
                    <span className="grid gap-0.5"><strong className="text-sm text-admin-text">{translateOverviewValue(entry.title, translateText)}</strong><small className="text-[13px] text-admin-muted">{translateOverviewValue(entry.detail, translateText)} · {relativeTime(entry.timestamp, translateText)}</small></span>
                  </li>
                ))}
              </ol>
            ) : <p className={overviewNote}>{translateText("No administrative activity is available.")}</p>}
          </Card>
        </div>

        <div className="overview-command-center-snapshot mt-[18px] grid grid-cols-[1.2fr_1fr_1fr] gap-[18px] max-[1120px]:grid-cols-2 max-[560px]:grid-cols-1">
          <Card as="section" className="overview-command-center-snapshot-card overflow-hidden" aria-labelledby="overview-command-quest-heading">
            <CardHeader flush className={overviewSectionHead}><div><h2 id="overview-command-quest-heading" className="m-0 text-[19px] font-semibold tracking-[-.02em] text-admin-text">{translateText("Quest States")}</h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("Current distribution across Quests.")}</p></div><span className="whitespace-nowrap text-[13px] font-extrabold text-admin-muted">{countLabel(model.questTotal)} {translateText("total")}</span></CardHeader>
            <ul className="overview-command-center-status-list m-0 list-none px-[18px] pt-[5px]">
              {model.questStates.map((entry) => (
                <li key={entry.status} className="overview-command-center-status-row grid min-h-[53px] grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-admin-border-subtle last:border-b-0">
                  <span className={`overview-command-center-status-dot size-2 rounded-full ${questToneClasses[questStateTones[entry.status]]?.split(" ")[0] ?? "bg-admin-accent"}`} aria-hidden="true" />
                  <span className="grid gap-0.5"><strong className="text-admin-text">{translateText(entry.label)}</strong><small className="text-xs text-admin-muted">{translateText("Quest status")}</small></span>
                  <strong className={`text-xl tabular-nums ${questToneClasses[questStateTones[entry.status]]?.split(" ")[1] ?? "text-admin-text"}`}>{countLabel(entry.count)}</strong>
                </li>
              ))}
            </ul>
          </Card>

          <Card as="section" className="overview-command-center-snapshot-card overflow-hidden" aria-labelledby="overview-command-members-heading">
            <CardHeader flush className={overviewSectionHead}><div><h2 id="overview-command-members-heading" className="m-0 text-[19px] font-semibold tracking-[-.02em] text-admin-text">{translateText("Members")}</h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("Count by Member status.")}</p></div><span className="whitespace-nowrap text-[13px] font-extrabold text-admin-muted">{translateText(model.memberStatusSource)}</span></CardHeader>
            <ul className="overview-command-center-status-list m-0 list-none px-[18px] pt-[5px]">
              {model.memberStatusCounts.map((entry) => (
                <li key={entry.status} className="overview-command-center-status-row grid min-h-[53px] grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-admin-border-subtle last:border-b-0">
                  <span className={`overview-command-center-status-dot size-2 rounded-full ${memberToneClasses[entry.status.toLowerCase().replaceAll(" ", "-")]?.split(" ")[0] ?? "bg-admin-accent"}`} aria-hidden="true" />
                  <span className="grid gap-0.5"><strong className="text-admin-text">{translateText(memberStatusLabel(entry.status))}</strong><small className="text-xs text-admin-muted">{translateText("Member status")}</small></span>
                  <strong className={`text-xl tabular-nums ${memberToneClasses[entry.status.toLowerCase().replaceAll(" ", "-")]?.split(" ")[1] ?? "text-admin-text"}`}>{countLabel(entry.count)}</strong>
                </li>
              ))}
            </ul>
            {model.memberStatusSource === "Unavailable" ? <p className={overviewNote}>{translateText("Member status counts are not provided by the Admin API.")}</p> : model.memberStatusSource === "Local fallback" ? <p className={overviewNote}>{translateText("Member status counts use local fallback data because the Admin API does not provide them.")}</p> : null}
          </Card>

          <Card as="section" className="overview-command-center-snapshot-card overflow-hidden" aria-labelledby="overview-command-wallets-heading">
            <CardHeader flush className={overviewSectionHead}><div><h2 id="overview-command-wallets-heading" className="m-0 text-[19px] font-semibold tracking-[-.02em] text-admin-text">{translateText("Wallets")}</h2><p className="mt-2 text-[15px] text-admin-muted">{translateText("Count by Wallet status.")}</p></div><span className="whitespace-nowrap text-[13px] font-extrabold text-admin-muted">{translateText(model.walletStatusSource)}</span></CardHeader>
            <ul className="overview-command-center-status-list m-0 list-none px-[18px] pt-[5px]">
              {model.walletStatusCounts.map((entry) => (
                <li key={entry.status} className="overview-command-center-status-row grid min-h-[53px] grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-admin-border-subtle last:border-b-0">
                  <span className={`overview-command-center-status-dot size-2 rounded-full ${walletToneClasses[entry.status.toLowerCase()]?.split(" ")[0] ?? "bg-admin-accent"}`} aria-hidden="true" />
                  <span className="grid gap-0.5"><strong className="text-admin-text">{translateText(walletStatusLabel(entry.status))}</strong><small className="text-xs text-admin-muted">{translateText("Wallet status")}</small></span>
                  <strong className={`text-xl tabular-nums ${walletToneClasses[entry.status.toLowerCase()]?.split(" ")[1] ?? "text-admin-text"}`}>{countLabel(entry.count)}</strong>
                </li>
              ))}
            </ul>
            {model.walletStatusSource === "Unavailable" ? <p className={overviewNote}>{translateText("Wallet status counts are not provided by the Admin API.")}</p> : model.walletStatusSource === "Local fallback" ? <p className={overviewNote}>{translateText("Wallet status counts use local fallback data because the Admin API does not provide them.")}</p> : null}
          </Card>
        </div>
    </main>
  );
}
