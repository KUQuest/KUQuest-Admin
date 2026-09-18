"use client";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import {
  formatWalletDate,
  formatWalletMoney,
  type WalletLedgerView,
} from "./wallet-model";

export function WalletStatementTable({ transactions }: { transactions: WalletLedgerView[] }) {
  const { translateText } = useAdminShell();
  if (!transactions.length) {
    return <div className="empty"><h3>{translateText("No Ledger Transactions")}</h3><p>{translateText("No committed and sealed Ledger Transactions are available for this Wallet.")}</p></div>;
  }

  return <div className="wallet-statement-table-block">
    <p className="wallet-statement-scroll-hint">{translateText("On narrow screens, scroll horizontally to view all Wallet Statement columns.")}</p>
    <section className="table-wrap wallet-statement-table-wrap" aria-label={translateText("Wallet Statement table")}>
      <table className="data wallet-statement-table">
        <caption>{translateText("Wallet Statement")}</caption>
        <thead><tr><th scope="col">{translateText("Date")}</th><th scope="col">{translateText("Event type")}</th><th scope="col">{translateText("Signed amount")}</th><th scope="col">{translateText("Compartment movement")}</th><th scope="col">{translateText("Resulting Wallet balance")}</th></tr></thead>
        <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
          <td><time dateTime={transaction.createdAt}>{formatWalletDate(transaction.createdAt)}</time>{transaction.description ? <small>{transaction.description}</small> : null}</td>
          <td><strong>{translateText(transaction.eventType)}</strong><small>{transaction.businessReference}</small></td>
          <td className="money">{formatWalletMoney(transaction.amountSatang)}</td>
          <td className="wallet-statement-movement">{transaction.movement.map((item) => <span key={`${transaction.id}-${item.accountType}`}>{translateText(item.accountType)}: {formatWalletMoney(item.amountSatang)}</span>)}</td>
          <td className="money">{formatWalletMoney(transaction.resultingBalanceSatang)}</td>
        </tr>)}</tbody>
      </table>
    </section>
  </div>;
}
