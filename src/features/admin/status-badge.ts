function kebabCase(value: string): string {
  return value.toLowerCase().replace(/_/g, "-");
}

export function statusBadgeClass(status: string): string {
  const value = String(status ?? "").trim().toUpperCase();
  if (value.startsWith("QUEST_")) return `status-quest-${kebabCase(value.slice("QUEST_".length))}`;
  if (value.startsWith("DISPUTE_CASE_")) return `status-dispute-${kebabCase(value.slice("DISPUTE_CASE_".length))}`;
  if (value.startsWith("REPORT_CASE_")) return `status-report-${kebabCase(value.slice("REPORT_CASE_".length))}`;
  if (value.startsWith("CONDUCT_REPORT_")) return `status-conduct-${kebabCase(value.slice("CONDUCT_REPORT_".length))}`;
  if ([
    "PENDING_ADMIN_APPROVAL",
    "SUBMITTED_TO_PROVIDER",
    "PROVIDER_PENDING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
  ].includes(value)) return `status-payout-${kebabCase(value)}`;
  if (["ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"].includes(value)) return `status-wallet-${kebabCase(value)}`;
  return "";
}
