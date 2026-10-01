"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button, Card, CardHeader, EmptyState } from "../../../components/ui";
import { memberRoutes } from "../admin-routes";
import { ADMIN_API_TOP_UP_STATUSES } from "../api/admin-api";
import { formatAdminTimestamp } from "../date-format";
import { formatMoneySatang } from "../member/member-wallet-model";
import {
  useFinanceTopUpQuery,
  useFinanceTopUpReconcileMutation,
} from "./finance-query";
import type { FinanceTopUpFilter, TopUpPageData } from "./finance-service";

const TOP_UP_FILTERS: FinanceTopUpFilter[] = ["ALL", ...ADMIN_API_TOP_UP_STATUSES];

function TopUpOperations({ initialData }: { initialData: TopUpPageData }) {
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
      setReconcileNotice(`${translateText("Top-up reconciliation completed for")} ${topUpId} · ${translateText(result.topUp.topUpStatus)}.`);
    } catch (mutationError) {
      setReconcileNotice(mutationError instanceof Error ? mutationError.message : "Top-up reconciliation failed.");
    }
  }

  return (
    <Card as="section" className="min-w-0 p-4" aria-label={translateText("Top-ups")}>
      <CardHeader flush className="mb-3 flex flex-wrap items-center justify-end gap-3">
        <label className="grid gap-1 text-sm font-medium" htmlFor="top-up-status">{translateText("Status")}
          <select id="top-up-status" className="min-h-9 rounded-admin-sm border border-admin-border bg-admin-surface px-2" value={status} onChange={(event) => { setStatus(event.target.value as FinanceTopUpFilter); setReconcileNotice(null); }}>
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
              <td className="p-2"><strong className="block">{topUp.id}</strong><small className="text-admin-muted">{topUp.providerReference ?? translateText("Provider reference not provided")}</small></td>
              <td className="p-2"><Link className="text-admin-accent hover:underline" href={memberRoutes.detail(topUp.userId)}>{`${topUp.member.firstName} ${topUp.member.lastName}`.trim()}</Link><small className="block text-admin-muted">{topUp.member.studentId ?? "—"}</small></td>
              <td className="p-2 tabular-nums">{formatMoneySatang(topUp.creditAmountSatang)}</td>
              <td className="p-2 tabular-nums">{formatMoneySatang(topUp.paymentTotalSatang)}</td>
              <td className="p-2">{translateText(topUp.topUpStatus)}</td>
              <td className="p-2">{formatAdminTimestamp(topUp.createdAt)}</td>
              <td className="p-2"><Button variant="outline" size="sm" type="button" disabled={reconcile.isPending} onClick={() => { if (window.confirm(`${translateText("Reconcile this Top-up with the Provider?")}\n${topUp.id}`)) void reconcileTopUp(topUp.id); }}>{reconcile.isPending ? translateText("Reconciling…") : translateText("Reconcile")}</Button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {query.hasNextPage ? <div className="mt-3 flex justify-center"><Button variant="outline" type="button" disabled={query.isFetchingNextPage} onClick={() => { void query.fetchNextPage(); }}>{translateText(query.isFetchingNextPage ? "Loading more Top-ups…" : "Load more Top-ups")}</Button></div> : null}
      </> : <EmptyState className="border-0 p-8" title={translateText("No Top-ups found")} description={translateText("No Top-up records match this status.")} />}
    </Card>
  );
}

export function AdminTopUpsPage({ initialData }: { initialData: TopUpPageData }) {
  const { translateText } = useAdminShell();

  return (
    <main className="admin-route-page grid min-w-0 content-start gap-4" tabIndex={-1}>
      <AdminPageHeader title={translateText("Top-ups")} description={translateText("Review Top-up payments and reconcile a payment with the Provider.")} />
      {initialData.dataSource === "api" ? <TopUpOperations initialData={initialData} /> : (
        <Card as="section" className="overflow-hidden">
          <EmptyState className="border-0 p-[60px_24px]" title={translateText("Top-up tools unavailable")} description={translateText("The Admin API is required to read Top-up data.")} />
        </Card>
      )}
    </main>
  );
}
