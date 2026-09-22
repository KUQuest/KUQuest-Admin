"use client";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui";
import {
  formatWalletDate,
  formatWalletMoney,
  walletBusinessReferenceLabel,
  type WalletLedgerView,
  walletEventTypeLabel,
} from "./wallet-model";

export function WalletStatementTable({ transactions }: { transactions: WalletLedgerView[] }) {
  const { translateText } = useAdminShell();
  if (!transactions.length) {
    return <EmptyState title={translateText("No Ledger Transactions")} description={translateText("No committed and sealed Ledger Transactions are available for this Wallet.")} />;
  }

  return <div className="wallet-statement-table-block min-w-0">
    <p className="wallet-statement-scroll-hint mb-2 hidden rounded-[7px] border border-admin-border bg-admin-soft px-2.5 py-2 text-[15px] leading-[1.4] text-admin-muted max-[600px]:block">{translateText("On narrow screens, scroll horizontally to view all Wallet Statement columns.")}</p>
    <section className="wallet-statement-table-wrap min-w-0 overflow-x-auto [scrollbar-gutter:stable] max-[600px]:[overscroll-behavior-inline:contain]" aria-label={translateText("Wallet Statement table")}>
      <Table className="wallet-statement-table min-w-[760px] [&_tbody>tr]:cursor-default [&_tbody>tr>td>strong]:text-xs [&_td.money]:whitespace-nowrap [&_td.wallet-statement-movement]:min-w-[220px] [&_td_small]:mt-[3px]">
        <caption>{translateText("Wallet Statement")}</caption>
        <TableHeader><TableRow><TableHead>{translateText("Date")}</TableHead><TableHead>{translateText("Event type")}</TableHead><TableHead>{translateText("Signed amount")}</TableHead><TableHead>{translateText("Compartment movement")}</TableHead><TableHead>{translateText("Resulting Wallet balance")}</TableHead></TableRow></TableHeader>
        <TableBody>{transactions.map((transaction) => <TableRow key={transaction.id}>
          <TableCell><time dateTime={transaction.createdAt}>{formatWalletDate(transaction.createdAt)}</time>{transaction.description ? <small className="mt-[3px] block text-admin-muted">{transaction.description}</small> : null}</TableCell>
          <TableCell><strong>{translateText(walletEventTypeLabel(transaction.eventType))}</strong><small className="mt-[3px] block text-admin-muted">{walletBusinessReferenceLabel(transaction.businessReference)}</small></TableCell>
          <TableCell className="money">{formatWalletMoney(transaction.amountSatang)}</TableCell>
          <TableCell className="wallet-statement-movement">{transaction.movement.map((item) => <span key={`${transaction.id}-${item.accountType}`}>{translateText(item.accountType)}: {formatWalletMoney(item.amountSatang)}</span>)}</TableCell>
          <TableCell className="money">{formatWalletMoney(transaction.resultingBalanceSatang)}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </section>
  </div>;
}
