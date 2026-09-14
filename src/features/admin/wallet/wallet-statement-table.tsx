import {
  formatWalletDate,
  formatWalletMoney,
  type WalletLedgerView,
} from "./wallet-model";

export function WalletStatementTable({ transactions }: { transactions: WalletLedgerView[] }) {
  if (!transactions.length) {
    return <div className="empty"><h3>No Ledger Transactions</h3><p>No committed and sealed Ledger Transactions are available for this Wallet.</p></div>;
  }

  return <section className="table-wrap" aria-label="Wallet Statement table">
    <table className="data wallet-statement-table">
      <caption>Wallet Statement</caption>
      <thead><tr><th scope="col">Date</th><th scope="col">Event type</th><th scope="col">Signed amount</th><th scope="col">Compartment movement</th><th scope="col">Resulting Wallet balance</th></tr></thead>
      <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
        <td><time dateTime={transaction.createdAt}>{formatWalletDate(transaction.createdAt)}</time>{transaction.description ? <small>{transaction.description}</small> : null}</td>
        <td><strong>{transaction.eventType}</strong><small>{transaction.businessReference}</small></td>
        <td className="money">{formatWalletMoney(transaction.amountSatang)}</td>
        <td className="wallet-statement-movement">{transaction.movement.map((item) => <span key={`${transaction.id}-${item.accountType}`}>{item.accountType}: {formatWalletMoney(item.amountSatang)}</span>)}</td>
        <td className="money">{formatWalletMoney(transaction.resultingBalanceSatang)}</td>
      </tr>)}</tbody>
    </table>
  </section>;
}
