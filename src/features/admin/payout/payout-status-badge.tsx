"use client";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Badge as UiBadge } from "../../../components/ui";
import { payoutStatusLabel, type PayoutStatus } from "../domain/rulebook";
import { payoutStatusClass } from "./payout-model";

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const { translateText } = useAdminShell();
  return <UiBadge tone="neutral" className={`badge ${payoutStatusClass(status)}`}>{translateText(payoutStatusLabel(status))}</UiBadge>;
}
