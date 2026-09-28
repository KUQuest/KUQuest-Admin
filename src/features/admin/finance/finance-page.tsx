"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { Button, Card, CardHeader, EmptyState } from "../../../components/ui";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { formatAdminTimestamp } from "../date-format";
import { memberRoutes } from "../admin-routes";
import { displayAdminId } from "../display-admin-id";
import { ADMIN_API_TOP_UP_STATUSES } from "../api/admin-api";
import { formatMoneySatang } from "../member/member-wallet-model";
import {
  useFinancePolicyQuery,
  useFinanceTopUpQuery,
  useFinanceTopUpReconcileMutation,
  useProviderEventRetryMutation,
} from "./finance-query";
import type { FinancePageData, FinanceTopUpFilter } from "./finance-service";

const TOP_UP_FILTERS: FinanceTopUpFilter[] = ["ALL", ...ADMIN_API_TOP_UP_STATUSES];

function basisPoints(value: number): string {
  return `${value} bps (${(value / 100).toFixed(2)}%)`;
}

function PolicyValues({ initialData }: { initialData: FinancePageData }) {
  const { translateText } = useAdminShell();
  const query = useFinancePolicyQuery(initialData);
  const policy = query.data?.currentPolicy;
  const revisions = query.data?.policyRevisions ?? [];
  const error = query.error instanceof Error
    ? query.error.message
    : initialData.policyError;

  return (
    <Card as="section" className="min-w-0 p-4" aria-labelledby="finance-money-policy-title">
      <CardHeader flush className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="finance-money-policy-title" className="text-lg font-semibold">{translateText("Money Policy")}</h2>
          <p className="mt-1 text-sm text-admin-muted">{translateText("Read the current financial limits and revision history.")}</p>
        </div>
        <Button variant="outline" type="button" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>
          {translateText(query.isFetching ? "Refreshing…" : "Refresh Money Policy")}
        </Button>
      </CardHeader>
      {error ? <p className="field-error" role="alert">{translateText(error)}</p> : null}
      {policy ? <>
        <div className="grid gap-2 rounded-admin-sm border border-admin-border bg-admin-soft p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><span className="block text-sm text-admin-muted">{translateText("Current revision")}</span><strong>#{policy.revision}</strong></div>
          <div><span className="block text-sm text-admin-muted">{translateText("Platform Fee")}</span><strong>{basisPoints(policy.platformFeeBps)}</strong></div>
          <div><span className="block text-sm text-admin-muted">{translateText("Fee rounding")}</span><strong>{translateText(policy.feeRoundingMode)}</strong></div>
          <div><span className="block text-sm text-admin-muted">{translateText("Quote lifetime")}</span><strong>{policy.quoteLifetimeSeconds} {translateText("seconds")}</strong></div>
          <div><span className="block text-sm text-admin-muted">{translateText("Top-up provider fee")}</span><strong>{formatMoneySatang(policy.topUpProviderFeeSatang)}{policy.topUpProviderFeeBps ? ` · ${basisPoints(policy.topUpProviderFeeBps)}` : ""}</strong></div>
          <div><span className="block text-sm text-admin-muted">{translateText("Top-up provider tax")}</span><strong>{basisPoints(policy.topUpProviderTaxBps)}</strong></div>
          <div><span className="block text-sm text-admin-muted">{translateText("Payout provider tax")}</span><strong>{basisPoints(policy.payoutProviderTaxBps)}</strong></div>
          <div><span className="block text-sm text-admin-muted">{translateText("Effective from")}</span><strong>{formatAdminTimestamp(policy.effectiveFrom)}</strong></div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm" aria-label={translateText("Money Policy limits")}>
            <thead><tr className="border-b border-admin-border text-admin-muted"><th className="p-2">{translateText("Transaction type")}</th><th className="p-2">{translateText("Minimum")}</th><th className="p-2">{translateText("Maximum")}</th></tr></thead>
            <tbody>
              <tr className="border-b border-admin-border"><th className="p-2 font-medium">{translateText("Top-up")}</th><td className="p-2">{formatMoneySatang(policy.minimumTopUpSatang)}</td><td className="p-2">{formatMoneySatang(policy.maximumTopUpSatang)}</td></tr>
              <tr className="border-b border-admin-border"><th className="p-2 font-medium">{translateText("Funding Reservation")}</th><td className="p-2">{formatMoneySatang(policy.minimumFundingReservationSatang)}</td><td className="p-2">{formatMoneySatang(policy.maximumFundingReservationSatang)}</td></tr>
              <tr className="border-b border-admin-border"><th className="p-2 font-medium">{translateText("Earnings Conversion")}</th><td className="p-2">{formatMoneySatang(policy.minimumEarningsConversionSatang)}</td><td className="p-2">{formatMoneySatang(policy.maximumEarningsConversionSatang)}</td></tr>
              <tr><th className="p-2 font-medium">{translateText("Payout")}</th><td className="p-2">{formatMoneySatang(policy.minimumPayoutSatang)}</td><td className="p-2">{formatMoneySatang(policy.maximumPayoutSatang)}</td></tr>
            </tbody>
          </table>
        </div>
        {policy.reason ? <p className="mt-3 text-sm text-admin-muted">{translateText("Revision reason")}: {policy.reason}</p> : null}
      </> : !query.isPending ? <p className="audit-note">{translateText("Money Policy is not available.")}</p> : <p aria-live="polite">{translateText("Loading Money Policy…")}</p>}
      <div className="mt-5">
        <h3 className="mb-2 font-semibold">{translateText("Money Policy revisions")}</h3>
        {revisions.length ? <div className="grid gap-2">
          {revisions.map((revision) => <article key={revision.id} className="grid gap-2 rounded-admin-sm border border-admin-border p-3 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
            <strong>#{revision.revision}</strong>
            <span className="text-sm text-admin-muted">{formatAdminTimestamp(revision.effectiveFrom)} – {revision.effectiveUntil ? formatAdminTimestamp(revision.effectiveUntil) : translateText("Current")}</span>
            <span className="text-sm">{translateText("Platform Fee")}: {basisPoints(revision.platformFeeBps)}</span>
          </article>)}
        </div> : <p className="audit-note">{translateText("No Money Policy revisions are available.")}</p>}
      </div>
    </Card>
  );
}

function TopUpOperations({ initialData }: { initialData: FinancePageData }) {
  const { translateText } = useAdminShell();
  const [status, setStatus] = useState<FinanceTopUpFilter>("ALL");
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const query = useFinanceTopUpQuery(status, initialData);
  const reconcile = useFinanceTopUpReconcileMutation();
  const pages = query.data?.pages ?? [];
  const topUps = pages.flatMap((page) => page.items);
  const error = query.error instanceof Error
    ? query.error.message
    : initialData.topUpError;

  async function reconcileTopUp(topUpId: string) {
    setReconcileNotice(null);
    try {
      const result = await reconcile.mutateAsync(topUpId);
      setReconcileNotice(`${translateText("Top-up reconciliation completed for")} ${displayAdminId(result.topUp.id) ?? translateText("Top-up")} · ${translateText(result.topUp.topUpStatus)}.`);
    } catch (mutationError) {
      setReconcileNotice(mutationError instanceof Error ? mutationError.message : "Top-up reconciliation failed.");
    }
  }

  return (
    <Card as="section" className="min-w-0 p-4" aria-labelledby="finance-top-ups-title">
      <CardHeader flush className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="finance-top-ups-title" className="text-lg font-semibold">{translateText("Top-ups")}</h2>
          <p className="mt-1 text-sm text-admin-muted">{translateText("Review Top-up payments and reconcile a payment with the Provider.")}</p>
        </div>
        <label className="grid gap-1 text-sm font-medium" htmlFor="finance-top-up-status">{translateText("Status")}
          <select id="finance-top-up-status" className="min-h-9 rounded-admin-sm border border-admin-border bg-admin-surface px-2" value={status} onChange={(event) => { setStatus(event.target.value as FinanceTopUpFilter); setReconcileNotice(null); }}>
            {TOP_UP_FILTERS.map((value) => <option key={value} value={value}>{translateText(value === "ALL" ? "All" : value)}</option>)}
          </select>
        </label>
      </CardHeader>
      {error ? <div className="mb-3 rounded-admin-sm border border-admin-danger bg-admin-danger-soft p-3 text-sm" role="alert">{translateText(error)} <Button variant="outline" size="sm" type="button" onClick={() => { void query.refetch(); }}>{translateText("Try again")}</Button></div> : null}
      {reconcileNotice ? <p className={`mb-3 text-sm ${reconcile.error ? "field-error" : "audit-note"}`} role={reconcile.error ? "alert" : "status"}>{translateText(reconcileNotice)}</p> : null}
      {query.isPending && !topUps.length ? <p aria-live="polite">{translateText("Loading Top-ups…")}</p> : topUps.length ? <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm" aria-label={translateText("Top-ups table")}>
            <thead><tr className="border-b border-admin-border text-admin-muted"><th className="p-2">{translateText("Top-up")}</th><th className="p-2">{translateText("Member")}</th><th className="p-2">{translateText("Credit amount")}</th><th className="p-2">{translateText("Payment total")}</th><th className="p-2">{translateText("Status")}</th><th className="p-2">{translateText("Created")}</th><th className="p-2">{translateText("Action")}</th></tr></thead>
            <tbody>{topUps.map((topUp) => <tr key={topUp.id} className="border-b border-admin-border last:border-0">
              <td className="p-2"><strong className="block">{displayAdminId(topUp.id) ?? translateText("Top-up")}</strong><small className="text-admin-muted">{topUp.providerReference ?? translateText("Provider reference not provided")}</small></td>
              <td className="p-2"><Link className="text-admin-accent hover:underline" href={memberRoutes.detail(topUp.userId)}>{`${topUp.member.firstName} ${topUp.member.lastName}`.trim()}</Link><small className="block text-admin-muted">{displayAdminId(topUp.member.studentId) ?? "—"}</small></td>
              <td className="p-2 tabular-nums">{formatMoneySatang(topUp.creditAmountSatang)}</td>
              <td className="p-2 tabular-nums">{formatMoneySatang(topUp.paymentTotalSatang)}</td>
              <td className="p-2">{translateText(topUp.topUpStatus)}</td>
              <td className="p-2">{formatAdminTimestamp(topUp.createdAt)}</td>
              <td className="p-2"><Button variant="outline" size="sm" type="button" disabled={reconcile.isPending} onClick={() => { if (window.confirm(`${translateText("Reconcile this Top-up with the Provider?")}\n${displayAdminId(topUp.member.studentId) ?? `${topUp.member.firstName} ${topUp.member.lastName}`.trim()}`)) void reconcileTopUp(topUp.id); }}>{reconcile.isPending ? translateText("Reconciling…") : translateText("Reconcile")}</Button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {query.hasNextPage ? <div className="mt-3 flex justify-center"><Button variant="outline" type="button" disabled={query.isFetchingNextPage} onClick={() => { void query.fetchNextPage(); }}>{translateText(query.isFetchingNextPage ? "Loading more Top-ups…" : "Load more Top-ups")}</Button></div> : null}
      </> : <EmptyState className="border-0 p-8" title={translateText("No Top-ups found")} description={translateText("No Top-up records match this status.")} />}
    </Card>
  );
}

function ProviderEventRetry() {
  const { translateText } = useAdminShell();
  const [kind, setKind] = useState<"top-up" | "payout">("top-up");
  const [eventId, setEventId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retry = useProviderEventRetryMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedId = eventId.trim();
    if (!normalizedId) return;
    setNotice(null);
    setError(null);
    try {
      const result = await retry.mutateAsync({ kind, eventId: normalizedId });
      setNotice(`${displayAdminId(result.event.providerEventId) ?? translateText("Provider event")} · ${translateText(result.event.processingStatus)} · ${translateText("Attempts")}: ${result.event.attemptCount}`);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Provider Event retry failed.");
    }
  }

  return (
    <Card as="section" className="min-w-0 p-4" aria-labelledby="finance-provider-event-title">
      <CardHeader flush className="mb-3"><h2 id="finance-provider-event-title" className="text-lg font-semibold">{translateText("Retry Provider Event")}</h2></CardHeader>
      <p className="mb-3 text-sm text-admin-muted">{translateText("Enter a known Provider Event ID to retry its processing.")}</p>
      <form className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => { void submit(event); }}>
        <label className="grid gap-1 text-sm font-medium" htmlFor="finance-provider-event-kind">{translateText("Resource type")}
          <select id="finance-provider-event-kind" className="min-h-10 rounded-admin-sm border border-admin-border bg-admin-surface px-2" value={kind} onChange={(event) => setKind(event.target.value as "top-up" | "payout")}>
            <option value="top-up">{translateText("Top-up")}</option>
            <option value="payout">{translateText("Payout")}</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium" htmlFor="finance-provider-event-id">{translateText("Provider Event ID")}
          <input id="finance-provider-event-id" className="min-h-10 rounded-admin-sm border border-admin-border bg-admin-surface px-2" value={eventId} onChange={(event) => setEventId(event.target.value)} required />
        </label>
        <Button variant="outline" type="submit" disabled={retry.isPending || !eventId.trim()}>{translateText(retry.isPending ? "Retrying…" : "Retry event")}</Button>
      </form>
      {error ? <p className="mt-3 field-error" role="alert">{translateText(error)}</p> : null}
      {notice ? <output className="mt-3 block audit-note">{notice}</output> : null}
    </Card>
  );
}

export function AdminFinancePage({ initialData }: { initialData: FinancePageData }) {
  const { translateText } = useAdminShell();

  return (
    <main className="admin-route-page grid min-w-0 content-start gap-4" tabIndex={-1}>
      <AdminPageHeader title={translateText("Finance")} description={translateText("Review Money Policy, Top-ups, and Provider Event operations.")} />
      {initialData.dataSource === "api" ? <>
        <PolicyValues initialData={initialData} />
        <TopUpOperations initialData={initialData} />
        <ProviderEventRetry />
      </> : <Card as="section" className="overflow-hidden"><EmptyState className="border-0 p-[60px_24px]" title={translateText("Finance tools unavailable")} description={translateText("The Admin API is required to read Money Policy and Top-up data.")} /></Card>}
    </main>
  );
}
