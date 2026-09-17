function pathSegment(identifier: string): string {
  if (!identifier.trim()) {
    throw new Error("Admin route identifier cannot be empty.");
  }
  if (identifier === "." || identifier === "..") {
    throw new Error("Admin route identifier cannot be a dot path segment.");
  }
  return encodeURIComponent(identifier);
}

export const overviewRoutes = {
  list: () => "/overview",
} as const;

export const questRoutes = {
  list: () => "/quest",
  detail: (id: string) => `/quest/${pathSegment(id)}`,
} as const;

export const disputeRoutes = {
  list: () => "/dispute",
  detail: (id: string) => `/dispute/${pathSegment(id)}`,
} as const;

export const reportRoutes = {
  list: () => "/report",
  detail: (id: string) => `/report/${pathSegment(id)}`,
} as const;

export const conductReportRoutes = {
  list: () => "/conduct-report",
  detail: (id: string) => `/conduct-report/${pathSegment(id)}`,
} as const;

export const payoutRoutes = {
  list: () => "/payout",
  detail: (id: string) => `/payout/${pathSegment(id)}`,
} as const;

export const memberRoutes = {
  list: () => "/member",
  detail: (id: string) => `/member/${pathSegment(id)}`,
} as const;

export const walletRoutes = {
  list: () => "/wallet",
} as const;

export const activityRoutes = {
  list: () => "/activity",
} as const;
