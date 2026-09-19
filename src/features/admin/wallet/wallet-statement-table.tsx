"use client";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui";
import {
  formatWalletDate,
  formatWalletMoney,
  type WalletLedgerView,
} from "./wallet-model";

export function WalletStatementTable({ transactions }: { transactions: WalletLedgerView[] }) {
  const { translateText } = useAdminShell();
  if (!transactions.length) {
    return <EmptyState title={translateText("No Ledger Transactions")} description={translateText("No committed and sealed Ledger Transactions are available for this Wallet.")} />;
  }

  return <div className="wallet-statement-table-block">
    <p className="wallet-statement-scroll-hint">{translateText("On narrow screens, scroll horizontally to view all Wallet Statement columns.")}</p>
    <section className="overflow-x-auto wallet-statement-table-wrap" aria-label={translateText("Wallet Statement table")}>
      <Table className="wallet-statement-table [&_tbody>tr]:cursor-default [&_tbody>tr>td>strong]:text-xs">
        <caption>{translateText("Wallet Statement")}</caption>
        <TableHeader><TableRow><TableHead>{translateText("Date")}</TableHead><TableHead>{translateText("Event type")}</TableHead><TableHead>{translateText("Signed amount")}</TableHead><TableHead>{translateText("Compartment movement")}</TableHead><TableHead>{translateText("Resulting Wallet balance")}</TableHead></TableRow></TableHeader>
        <TableBody>{transactions.map((transaction) => <TableRow key={transaction.id}>
          <TableCell><time dateTime={transaction.createdAt}>{formatWalletDate(transaction.createdAt)}</time>{transaction.description ? <small>{transaction.description}</small> : null}</TableCell>
          <TableCell><strong>{translateText(transaction.eventType)}</strong><small>{transaction.businessReference}</small></TableCell>
          <TableCell className="money">{formatWalletMoney(transaction.amountSatang)}</TableCell>
          <TableCell className="wallet-statement-movement">{transaction.movement.map((item) => <span key={`${transaction.id}-${item.accountType}`}>{translateText(item.accountType)}: {formatWalletMoney(item.amountSatang)}</span>)}</TableCell>
          <TableCell className="money">{formatWalletMoney(transaction.resultingBalanceSatang)}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </section>
  </div>;
}
