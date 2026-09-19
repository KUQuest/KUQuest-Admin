"use client";

import Link from "next/link";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { AdminPageHeader } from "../../../components/admin/admin-page-header";
import { Button, Card, CardHeader } from "../../../components/ui";
import { memberRoutes } from "../admin-routes";
import { adminRecordFact, adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection } from "../../../components/admin/admin-record-styles";
import { walletStatusLabel, type WalletStatus } from "../domain/rulebook";
import {
  formatWalletDate,
  formatWalletMoney,
  walletStatusClass,
} from "./wallet-model";
import type { WalletStatementPageData } from "./wallet-service";
import { WalletStatementTable } from "./wallet-statement-table";

function WalletStatusBadge({ status }: { status: WalletStatus }) {
  const { translateText } = useAdminShell();
  return <span className={`badge ${walletStatusClass(status)}`}>{translateText(walletStatusLabel(status))}</span>;
}

export function AdminWalletStatementPage({ data }: { data: WalletStatementPageData }) {
  const { translateText } = useAdminShell();
  const { wallet, ledger } = data;

  return <main className="admin-route-page wallet-statement-route-page" tabIndex={-1}>
    <AdminPageHeader kicker={translateText("Member Wallet")} title={translateText("Wallet Statement")} description={`${wallet.memberName} · ${wallet.email}`} actions={wallet.memberAvailable ? <Button asChild variant="outline"><Link href={memberRoutes.detail(wallet.memberId)}>{translateText("Back to Member")}</Link></Button> : null} />
    <Card as="section" className="overflow-hidden" aria-label={translateText("Wallet Statement")}>
      <Card as="section" className="wallet-record">
        <div className="drawer-title"><span className="att-icon neutral">W</span><div><h2>{wallet.memberName}</h2><p>{wallet.email} · {wallet.memberId}</p></div></div>
        <div className={adminRecordFacts}>
          <div className={adminRecordFact}><span>{translateText("Wallet Status")}</span><strong><WalletStatusBadge status={wallet.status} /></strong></div>
          <div className={adminRecordFact}><span>{translateText("Current Wallet Balance")}</span><strong>{formatWalletMoney(wallet.currentBalanceSatang)}</strong></div>
          <div className={adminRecordFact}><span>{translateText("Wallet record")}</span><strong>{wallet.id}</strong></div>
          <div className={adminRecordFact}><span>{translateText("Latest Wallet Transaction Date")}</span><strong>{formatWalletDate(wallet.latestTransactionAt)}</strong></div>
        </div>
      </Card>
      <Card as="section" className={adminRecordSection}>
        <CardHeader flush className={adminRecordHeader}><h2 className={adminRecordHeading}>{translateText("Wallet Statement")}</h2></CardHeader>
        <p>{translateText("Committed and sealed Ledger Transactions affecting this Wallet.")}</p>
        <WalletStatementTable transactions={ledger} />
      </Card>
    </Card>
  </main>;
}
