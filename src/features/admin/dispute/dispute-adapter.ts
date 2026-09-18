import type { PersistedAdminData } from "../data/admin-records";
import { ADMIN_DEMO_DATA_KEY, type BrowserStorage } from "../data/legacy-admin-data-adapter";
import { pageMockItems } from "../data/mock-pagination";
import { loadDashboardData } from "../dashboard/dashboard-bootstrap";
import type { DisputeResolution } from "../api/admin-api";
import {
  disputeCaseDecisionDetailsForCommand,
  disputeCaseModelFromRecord,
  disputeCasesOnly,
  isDisputeCaseActionable,
  isDisputeCaseRecord,
  type DisputeCaseCommand,
  type DisputeCaseModel,
  type DisputeCaseRecord,
} from "./dispute-model";

export type DisputeCaseMockPage = {
  source: "mock";
  items: DisputeCaseModel[];
  nextCursor: string | null;
};

// Keep the first page compatible with the original two-case fixture while
// making additional mock pages available to Admin QA.
export const DISPUTE_CASE_MOCK_PAGE_SIZE = 2;

export function newDisputeCaseIdempotencyKey(disputeId: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-resolve-dispute-${disputeId}-${uuid}`;
}

function disputeRecords(data: PersistedAdminData): DisputeCaseRecord[] {
  return disputeCasesOnly(data.collections.disputes);
}

export function loadDisputeCasesFromMock(storage: BrowserStorage, cursor?: string): DisputeCaseMockPage {
  const records = disputeRecords(loadDashboardData(storage));
  const models = records.flatMap((record) => {
    const model = disputeCaseModelFromRecord(record, "mock");
    return model ? [model] : [];
  });
  const page = pageMockItems(models, cursor, DISPUTE_CASE_MOCK_PAGE_SIZE);
  return {
    source: "mock",
    items: page.items,
    nextCursor: page.nextCursor,
  };
}

/** Load the complete mock Dispute Case collection for local pagination. */
export function loadAllDisputeCasesFromMock(storage: BrowserStorage): DisputeCaseMockPage {
  const records = disputeRecords(loadDashboardData(storage));
  const items = records.flatMap((record) => {
    const model = disputeCaseModelFromRecord(record, "mock");
    return model ? [model] : [];
  });
  return { source: "mock", items, nextCursor: null };
}

export function findDisputeCaseFromMock(
  storage: BrowserStorage,
  disputeId: string,
): DisputeCaseRecord | null {
  return disputeRecords(loadDashboardData(storage)).find((record) => record.id === disputeId) ?? null;
}

function persist(storage: BrowserStorage, data: PersistedAdminData): void {
  try {
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(data));
  } catch {
    // The in-memory demo record is still useful when browser storage is full.
  }
}

export function saveMockDisputeDecision(
  storage: BrowserStorage,
  disputeId: string,
  command: DisputeCaseCommand,
  reason: string,
  options: Pick<DisputeResolution, "workerId" | "amountSatang" | "reasonCode">,
): DisputeCaseRecord | null {
  const data = loadDashboardData(storage);
  const dispute = disputeRecords(data).find((candidate) => candidate.id === disputeId);
  if (!dispute || !isDisputeCaseRecord(dispute)) return null;
  if (!isDisputeCaseActionable(dispute.status)) return null;

  if (
    command === "DISPUTE_CASE_RESOLVED"
    && (!options.workerId || options.amountSatang === undefined || options.amountSatang <= 0)
  ) return null;

  const now = new Date().toISOString();
  const metadata = disputeCaseDecisionDetailsForCommand(command);
  dispute.status = command;
  dispute.disputeCaseStatus = command;
  dispute.decision = metadata.choice;
  dispute.decisionLabel = metadata.label;
  dispute.decisionReason = reason;
  dispute.reasonCode = options.reasonCode;
  dispute.resolvedBy = "Admin";
  dispute.resolutionAt = now;
  dispute.closedAt = now;
  dispute.tone = command === "DISPUTE_CASE_RESOLVED" ? "success" : "neutral";
  dispute.resolution = command === "DISPUTE_CASE_RESOLVED"
    ? "Dispute Case resolved; the full remaining amount was transferred to the Worker Earnings Balance."
    : "Dispute Case dismissed; no money movement was made.";
  dispute.resolvedWorkerId = command === "DISPUTE_CASE_RESOLVED" ? options.workerId : null;
  dispute.resolvedAmountSatang = command === "DISPUTE_CASE_RESOLVED" ? options.amountSatang : null;
  if (typeof dispute.version === "number") dispute.version += 1;
  persist(storage, data);
  return dispute;
}
