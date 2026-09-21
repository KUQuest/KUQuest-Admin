export const ADMIN_SEARCH_RESULT_DESCRIPTORS = [
  { kind: "member", label: "Member", order: 0, icon: "member" },
  { kind: "quest", label: "Quest", order: 1, icon: "quest" },
  { kind: "payout", label: "Payout", order: 2, icon: "wallet" },
  { kind: "dispute", label: "Dispute Case", order: 3, icon: "dispute" },
  { kind: "report", label: "Report Case", order: 4, icon: "report" },
  { kind: "conduct-report", label: "Conduct Report", order: 5, icon: "conduct-report" },
  { kind: "wallet", label: "Wallet", order: 6, icon: "wallet" },
  { kind: "activity", label: "Activity Log", order: 7, icon: "activity" },
] as const;

export type AdminSearchResultKind = (typeof ADMIN_SEARCH_RESULT_DESCRIPTORS)[number]["kind"];
export type AdminSearchResultIcon = (typeof ADMIN_SEARCH_RESULT_DESCRIPTORS)[number]["icon"];

export function isAdminSearchResultKind(value: string | null): value is AdminSearchResultKind {
  return value !== null && ADMIN_SEARCH_RESULT_DESCRIPTORS.some((descriptor) => descriptor.kind === value);
}

export function searchResultDescriptor(kind: AdminSearchResultKind) {
  return ADMIN_SEARCH_RESULT_DESCRIPTORS.find((descriptor) => descriptor.kind === kind)!;
}

export function searchResultLabel(kind: AdminSearchResultKind): string {
  return searchResultDescriptor(kind).label;
}

export function searchResultOrder(kind: AdminSearchResultKind): number {
  return searchResultDescriptor(kind).order;
}
