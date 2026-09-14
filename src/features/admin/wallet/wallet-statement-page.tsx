import Link from "next/link";

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
  return <span className={`badge ${walletStatusClass(status)}`}>{walletStatusLabel(status)}</span>;
}

export function AdminWalletStatementPage({ data }: { data: WalletStatementPageData }) {
  const { wallet, ledger } = data;

  return <main className="admin-route-page wallet-statement-route-page" tabIndex={-1}>
    <div className="page-head">
      <div>
        <p className="admin-route-kicker">Member Wallet</p>
        <h1>Wallet Statement</h1>
        <p>{wallet.memberName} · {wallet.email}</p>
      </div>
      <Link className="btn" href={memberRoutes.detail(wallet.memberId)}>Back to Member</Link>
    </div>
    <section className="panel" aria-label="Wallet Statement">
      <section className="wallet-record">
        <div className="drawer-title"><span className="att-icon neutral">W</span><div><h2>{wallet.memberName}</h2><p>{wallet.email} · {wallet.memberId}</p></div></div>
        <div className="facts">
          <div className="fact"><span>Status</span><strong><WalletStatusBadge status={wallet.status} /></strong></div>
          <div className="fact"><span>Current Wallet Balance</span><strong>{formatWalletMoney(wallet.currentBalanceSatang)}</strong></div>
          <div className="fact"><span>Wallet record</span><strong>{wallet.id}</strong></div>
          <div className="fact"><span>Latest Wallet Transaction</span><strong>{formatWalletDate(wallet.latestTransactionAt)}</strong></div>
        </div>
      </section>
      <section className="section">
        <h2>Wallet Statement</h2>
        <p>Every committed and sealed Ledger Transaction for this Wallet, newest first.</p>
        <WalletStatementTable transactions={ledger} />
      </section>
    </section>
  </main>;
}
