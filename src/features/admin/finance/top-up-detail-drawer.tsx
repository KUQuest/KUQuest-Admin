"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminRecordFact as Fact } from "../../../components/admin/admin-record-fields";
import { adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection } from "../../../components/admin/admin-record-styles";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button, Card, CardHeader } from "../../../components/ui";
import type { AdminTopUpListItem } from "../api/admin-api";
import { memberRoutes } from "../admin-routes";
import { formatAdminTimestamp } from "../date-format";
import { formatMoneySatang } from "../member/member-wallet-model";
import { statusBadgeClass } from "../status-badge";
import { topUpDisplayId, topUpStatusHistoryStateFromQuery, TOP_UP_BOARD_TABS } from "./top-ups-board-model";
import { useFinanceTopUpStatusHistoryQuery } from "./finance-query";

function TopUpDrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return <Card as="section" className={adminRecordSection}><CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{title}</h3></CardHeader>{children}</Card>;
}

export function formatTopUpPaymentMethod(value: string): string {
  if (value === "PROMPTPAY_QR") return "PromptPay QR";
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

export function TopUpDetailDrawer({
  topUp,
  opener,
  onClose,
  showMemberProfileLink = true,
}: {
  topUp: AdminTopUpListItem;
  opener: HTMLElement | null;
  onClose: () => void;
  showMemberProfileLink?: boolean;
}) {
  const { translateText } = useAdminShell();
  const historyQuery = useFinanceTopUpStatusHistoryQuery(topUp.id);
  const memberName = `${topUp.member.firstName} ${topUp.member.lastName}`.trim();
  const statusLabel = TOP_UP_BOARD_TABS.find((item) => item.id === topUp.topUpStatus)?.label ?? topUp.topUpStatus;
  const historyState = topUpStatusHistoryStateFromQuery(historyQuery);

  return <AdminDrawer
    ariaLabel={translateText("Close Top-up detail")}
    title={topUpDisplayId(topUp)}
    titleId="top-up-drawer-title"
    subtitle={translateText("Top-up detail drawer")}
    className="top-up-drawer [&>.drawer-body]:grid [&>.drawer-body]:content-start [&>.drawer-body]:gap-3.5 [&>.drawer-body]:!min-w-0 [&>.drawer-body]:!grid-cols-[minmax(0,1fr)]"
    opener={opener}
    onClose={onClose}
    actions={<>
      {showMemberProfileLink && <Button asChild variant="outline"><Link href={memberRoutes.detail(topUp.userId)}>{translateText("See Member profile")}</Link></Button>}
      <Button variant="outline" type="button" onClick={onClose}>{translateText("Close record")}</Button>
    </>}
  >
    <TopUpDrawerSection title={translateText("Top-up summary")}>
      <div className={adminRecordFacts}>
        <Fact label={translateText("Status")}><span className={`badge ${statusBadgeClass(topUp.topUpStatus)}`}>{translateText(statusLabel)}</span></Fact>
        <Fact label={translateText("Created")}>{formatAdminTimestamp(topUp.createdAt)}</Fact>
        <Fact label={translateText("Expiry deadline")}>{formatAdminTimestamp(topUp.expiresAt)}</Fact>
      </div>
    </TopUpDrawerSection>
    <TopUpDrawerSection title={translateText("Top-up timing")}>
      {historyState.kind === "loading" ? <output className="audit-note">{translateText("Loading Top-up status history…")}</output> : null}
      {historyState.kind === "unavailable" ? <p className="field-error" role="alert">{translateText("Top-up status history is unavailable.")}</p> : null}
      {historyState.kind === "invalid" ? <p className="field-error" role="alert">{translateText("The Top-up status history response is invalid.")}</p> : null}
      {historyState.kind === "empty" ? <p className="audit-note">{translateText("No Top-up status transitions were returned.")}</p> : null}
      {historyState.kind === "history" ? <ol className="grid list-decimal gap-2 pl-7">
        {historyState.entries.map((entry) => {
          const entryLabel = TOP_UP_BOARD_TABS.find((tab) => tab.id === entry.toStatus)?.label ?? entry.toStatus;

          return <li className="grid gap-2 rounded-lg border border-admin-border bg-admin-soft p-2.5" key={entry.id}>
            <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Status")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] [overflow-wrap:anywhere]">{translateText(entryLabel)}</strong></div>
            <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Occurred at")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] tabular-nums [overflow-wrap:anywhere]"><time dateTime={entry.occurredAt}>{formatAdminTimestamp(entry.occurredAt)}</time></strong></div>
            {entry.fromStatus ? <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Previous status")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] [overflow-wrap:anywhere]">{translateText(TOP_UP_BOARD_TABS.find((tab) => tab.id === entry.fromStatus)?.label ?? entry.fromStatus)}</strong></div> : null}
          </li>;
        })}
      </ol> : null}
    </TopUpDrawerSection>
    <TopUpDrawerSection title={translateText("Member details")}>
      <div className={adminRecordFacts}>
        <Fact label={translateText("Member")}>{memberName}</Fact>
        <Fact label={translateText("Student ID")}>{topUp.member.studentId ?? translateText("Student ID not provided")}</Fact>
      </div>
    </TopUpDrawerSection>
    <TopUpDrawerSection title={translateText("Payment details")}>
      <div className={adminRecordFacts}>
        <Fact label={translateText("Credit amount")}>{formatMoneySatang(topUp.creditAmountSatang)}</Fact>
        <Fact label={translateText("Payment total")}>{formatMoneySatang(topUp.paymentTotalSatang)}</Fact>
        <Fact label={translateText("Provider fee")}>{formatMoneySatang(topUp.providerFeeSatang)}</Fact>
        <Fact label={translateText("Provider tax")}>{formatMoneySatang(topUp.providerTaxSatang)}</Fact>
        <Fact label={translateText("Payment method")}>{translateText(formatTopUpPaymentMethod(topUp.paymentMethod))}</Fact>
      </div>
    </TopUpDrawerSection>
    <TopUpDrawerSection title={translateText("Provider details")}>
      <div className={adminRecordFacts}>
        <Fact label={translateText("Provider reference")}>{topUp.providerReference ?? translateText("Provider reference not provided")}</Fact>
      </div>
    </TopUpDrawerSection>
  </AdminDrawer>;
}
