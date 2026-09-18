"use client";

import Link from "next/link";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { memberRoutes } from "../admin-routes";
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
    <div className="page-head">
      <div>
        <p className="admin-route-kicker">{translateText("Member Wallet")}</p>
        <h1>{translateText("Wallet Statement")}</h1>
        <p>{wallet.memberName} · {wallet.email}</p>
      </div>
      {wallet.memberAvailable ? <Link className="btn" href={memberRoutes.detail(wallet.memberId)}>{translateText("Back to Member")}</Link> : null}
    </div>
    <section className="panel" aria-label={translateText("Wallet Statement")}>
      <section className="wallet-record">
        <div className="drawer-title"><span className="att-icon neutral">W</span><div><h2>{wallet.memberName}</h2><p>{wallet.email} · {wallet.memberId}</p></div></div>
        <div className="facts">
          <div className="fact"><span>{translateText("Wallet Status")}</span><strong><WalletStatusBadge status={wallet.status} /></strong></div>
          <div className="fact"><span>{translateText("Current Wallet Balance")}</span><strong>{formatWalletMoney(wallet.currentBalanceSatang)}</strong></div>
          <div className="fact"><span>{translateText("Wallet record")}</span><strong>{wallet.id}</strong></div>
          <div className="fact"><span>{translateText("Latest Wallet Transaction Date")}</span><strong>{formatWalletDate(wallet.latestTransactionAt)}</strong></div>
        </div>
      </section>
      <section className="section">
        <h2>{translateText("Wallet Statement")}</h2>
        <p>{translateText("Committed and sealed Ledger Transactions affecting this Wallet.")}</p>
        <WalletStatementTable transactions={ledger} />
      </section>
    </section>
  </main>;
}
