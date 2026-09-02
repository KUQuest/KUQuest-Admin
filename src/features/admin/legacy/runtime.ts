export type LegacyTone = "warning" | "danger" | "success" | "info" | "neutral" | "assigned" | "cancelled" | string;

// The legacy shell reuses a small set of selectors for different controls. This
// intersection is kept at the DOM boundary; individual callers still validate
// the element they received before using control-specific properties.
export type LegacyDomElement = HTMLElement & HTMLInputElement & HTMLTextAreaElement & HTMLFormElement & HTMLDialogElement & HTMLSelectElement;

export type LegacyHistoryEntry = {
  event?: string;
  at: string;
  by?: string;
  note?: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  [key: string]: string | number | undefined;
};

export type LegacyPenalty = {
  label: string;
  reason: string;
  recordedAt?: string;
  appliedBy?: string;
  durationDays?: number;
  expiresAt?: string;
};

export type LegacyRecordValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | Array<{ name: string; detail: string; src?: string; alt?: string }>
  | Array<string | { name: string; detail: string; src?: string; alt?: string }>
  | Array<[string, string, string]>
  | LegacyRecord
  | LegacyRecord[]
  | Array<[string, string]>
  | LegacyHistoryEntry[]
  | LegacyPenalty;

export type LegacyDisputeCase = {
  [key: string]: string | string[] | Array<[string, string, string]>;
};

export type LegacyRecord = {
  id: string;
  title: string;
  person: string;
  other: string;
  status: string;
  tone: LegacyTone;
  amount: number | null;
  age: string;
  version?: number;
  apiBacked?: boolean;
  studentId?: string;
  questState?: string;
  disputeCaseStatus?: string;
  reportCaseStatus?: string;
  conductReportStatus?: string;
  payoutStatus?: string;
  walletStatus?: string;
  hiddenAt?: string | null;
  hiddenByAdminId?: string | null;
  evidenceRefs?: string[];
  workerId?: string;
  amountSatang?: number;
  fundingTotalSatang?: number;
  questRewardSatang?: number;
  platformFeeSatang?: number;
  platformFeeBps?: number;
  feeRoundingMode?: "UP";
  detail?: string;
  details?: string;
  category?: string;
  disputeDate?: string;
  disputeType?: string;
  evidence?: string[];
  failureReason?: string;
  questId?: string;
  reportedAt?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reporterId?: string;
  reporterName?: string;
  requestedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  principalSatang?: number;
  receiptSatang?: number;
  maximumFeeSatang?: number;
  maximumTaxSatang?: number;
  maximumDebitSatang?: number;
  actualFeeSatang?: number | null;
  actualTaxSatang?: number | null;
  actualDebitSatang?: number | null;
  bankCode?: string;
  bankName?: string;
  destinationType?: string;
  maskedDestinationValue?: string;
  maskedRoutingValue?: string;
  providerReference?: string | null;
  providerStatus?: string | null;
  rejectionReason?: string | null;
  payoutHistory?: LegacyHistoryEntry[];
  payoutHistoryLoaded?: boolean;
  payoutHistoryError?: string;
  resolution?: string;
  resolutionAt?: string;
  selectedParticipant?: string;
  teamParticipants?: Array<[string, string]>;
  teamQuest?: boolean;
  teamSize?: number;
  proof?: Array<string | { name: string; detail: string; src?: string; alt?: string }>;
  reviews?: LegacyRecord[];
  moderationHistory?: LegacyHistoryEntry[];
  adminNotes?: LegacyHistoryEntry[];
  penalty?: LegacyPenalty;
  [key: string]: LegacyRecordValue;
};

export type LegacyRuntimeData = {
  disputes: LegacyRecord[];
  quests: LegacyRecord[];
  users: LegacyRecord[];
  payouts: LegacyRecord[];
  reports: LegacyRecord[];
};

export type LegacyPageState = {
  view: string;
  tab: string;
  query: string;
  questFilters: { mode: string; status: string };
  filters: Record<string, string[]>;
  orderBy: Record<string, string | null>;
  pagination: Record<string, { page: number; size: number | "all" }>;
  visibleColumns: Record<string, string[]>;
};

export type LegacyModalOptions = {
  initialFocus?: string | HTMLElement;
  removeOnClose?: boolean;
  onClose?: () => void;
  keepDrawerOpen?: boolean;
};

export type LegacyAdminRuntime = {
  data: LegacyRuntimeData;
  navigate: (view: string) => void;
  ensureDetailDrawer: (view: string, index: number) => void;
  openDrawer: (view: string, index: number) => void;
  closeActiveLayer: () => void;
  showModalLayer: (layer: HTMLElement, options?: LegacyModalOptions) => () => void;
  toast: (message: string) => void;
  drawer: HTMLElement;
  icon: (name: string) => string;
  persistAdminData?: () => void;
  recordActivity?: (title: string, detail: string, actor?: string) => void;
};

declare global {
  interface Window {
    __KUQUEST_PAGE__?: "home" | "quest" | "dispute" | "report" | "user";
    __KUQUEST_LEGACY_RUNTIME__?: LegacyAdminRuntime;
    data?: LegacyRuntimeData;
    navigate?: (view: string) => void;
    ensureDetailDrawer?: (view: string, index: number) => void;
    openQuestDrawer?: (index: number) => void;
    openDisputeDrawer?: (index: number) => void;
    openDrawer?: (view: string, index: number) => void;
    persistAdminData?: () => void;
    recordActivity?: (title: string, detail: string, actor?: string) => void;
    toast?: (message: string) => void;
    ico?: (name: string) => string;
    __KUQUEST_RESET_RESOURCE_STATE__?: () => void;
  }
}

export function getLegacyAdminRuntime(browserWindow: Window): LegacyAdminRuntime | null {
  return browserWindow.__KUQUEST_LEGACY_RUNTIME__ ?? null;
}
