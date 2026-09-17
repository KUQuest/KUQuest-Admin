import { describe, expect, it } from "bun:test";

import { loadDashboardData } from "../../src/features/admin/dashboard/dashboard-bootstrap";
import { ADMIN_DEMO_DATA_KEY } from "../../src/features/admin/data/legacy-admin-data-adapter";
import { loadMembersFromMock } from "../../src/features/admin/member/member-adapter";
import { loadConductReportsFromMock } from "../../src/features/admin/conduct-report/conduct-report-adapter";
import { conductReportsOnly } from "../../src/features/admin/conduct-report/conduct-report-model";
import {
  loadAllDisputeCasesFromMock,
  loadDisputeCasesFromMock,
} from "../../src/features/admin/dispute/dispute-adapter";
import { loadReportCasesFromMock } from "../../src/features/admin/report/report-adapter";
import { reportCasesOnly } from "../../src/features/admin/report/report-model";
import { mockAllPayoutDetails, mockPayoutDetail } from "../../src/features/admin/payout/payout-mock-data";
import { payoutDetailViewFromApi } from "../../src/features/admin/payout/payout-model";
import { mockAllWallets } from "../../src/features/admin/wallet/wallet-mock-data";
import {
  MOCK_UNLINKED_FAILED_QUEST_ID,
  mockAllQuests,
  mockDisputeIdForQuest,
  mockQuestDetailForId,
  mockQuests,
} from "../../src/features/admin/quest/quest-mock-data";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

describe("expanded mock demo fixtures", () => {
  it("seeds enough records for multiple pages without removing the original records", () => {
    const data = loadDashboardData(memoryStorage());

    expect(data.version).toBe("dashboard-bootstrap-v4-expanded-mock-fixtures");
    expect(data.collections.users.length).toBeGreaterThan(20);
    expect(data.collections.quests.length).toBeGreaterThan(20);
    expect(data.collections.payouts.length).toBeGreaterThan(20);
    expect(data.collections.disputes.length).toBeGreaterThan(10);
    expect(data.collections.reports.length).toBeGreaterThan(20);
    expect(data.collections.users.some((member) => member.id === "68000000")).toBe(true);
    expect(data.collections.reports.some((report) => (
      report && typeof report === "object" && "id" in report && report.id === "RPT-8201"
    ))).toBe(true);
  });

  it("repairs an incomplete expanded seed without replacing stored records", () => {
    const storage = memoryStorage();
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify({
      version: "dashboard-bootstrap-v4-expanded-mock-fixtures",
      collections: {
        users: [{ id: "manual-member", title: "Manual Member" }],
        quests: [],
        payouts: [],
        disputes: [],
        reports: [],
      },
    }));

    const data = loadDashboardData(storage);
    expect(data.collections.users.some((member) => member.id === "manual-member")).toBe(true);
    expect(data.collections.users.length).toBeGreaterThan(20);
    expect(data.collections.reports.length).toBeGreaterThan(20);
  });

  it("keeps required moderation relationships complete in Mock fixtures", () => {
    const data = loadDashboardData(memoryStorage());
    const conductReports = conductReportsOnly(data.collections.reports);
    const reportCases = reportCasesOnly(data.collections.reports);

    expect(conductReports).toHaveLength(203);
    expect(conductReports.every((report) => (
      typeof report.questId === "string" && report.questId.trim().length > 0
      && typeof report.questTitle === "string" && report.questTitle.trim().length > 0
      && typeof report.questRecord === "string" && report.questRecord.trim().length > 0
      && typeof report.reportedMemberId === "string" && report.reportedMemberId.trim().length > 0
      && typeof report.reportedUserName === "string" && report.reportedUserName.trim().length > 0
      && typeof report.reporterId === "string" && report.reporterId.trim().length > 0
      && typeof report.reporterName === "string" && report.reporterName.trim().length > 0
    ))).toBe(true);
    expect(reportCases.every((report) => (
      typeof report.reportedMemberId === "string" && report.reportedMemberId.trim().length > 0
      && typeof report.reportedUserName === "string" && report.reportedUserName.trim().length > 0
      && typeof report.reporterId === "string" && report.reporterId.trim().length > 0
      && typeof report.reporterName === "string" && report.reporterName.trim().length > 0
    ))).toBe(true);
  });

  it("repairs missing moderation relationships in an existing Mock session", () => {
    const source = loadDashboardData(memoryStorage());
    const incompleteConduct = source.collections.reports.find((record) => recordValue(record)?.id === "CND-8310");
    const incompleteReport = source.collections.reports.find((record) => recordValue(record)?.id === "RPT-8210");
    expect(incompleteConduct).toBeTruthy();
    expect(incompleteReport).toBeTruthy();

    const storage = memoryStorage();
    storage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify({
      ...source,
      collections: {
        ...source.collections,
        reports: source.collections.reports.map((record) => {
          const value = recordValue(record);
          if (!value) return record;
          if (value.id === "CND-8310") {
            return {
              ...value,
              questId: undefined,
              questTitle: undefined,
              questRecord: null,
              reporterId: undefined,
              reporterName: undefined,
              status: "CONDUCT_REPORT_PENDING",
              conductReportStatus: "CONDUCT_REPORT_PENDING",
            };
          }
          if (value.id === "RPT-8210") {
            return { ...value, reporterId: undefined, reporterName: undefined };
          }
          return record;
        }),
      },
    }));

    const repaired = loadDashboardData(storage);
    const repairedConduct = recordValue(repaired.collections.reports.find((record) => recordValue(record)?.id === "CND-8310"));
    const repairedReport = recordValue(repaired.collections.reports.find((record) => recordValue(record)?.id === "RPT-8210"));

    expect(repairedConduct?.questId).toBe("QST-12011");
    expect(repairedConduct?.questTitle).toBe("Demo Quest 001");
    expect(repairedConduct?.questRecord).toBeTruthy();
    expect(repairedConduct?.reporterId).toBeTruthy();
    expect(repairedConduct?.reporterName).toBeTruthy();
    expect(repairedConduct?.status).toBe("CONDUCT_REPORT_PENDING");
    expect(repairedReport?.reporterId).toBeTruthy();
    expect(repairedReport?.reporterName).toBeTruthy();
  });

  it("keeps mock pagination deterministic for each moderation board", () => {
    const storage = memoryStorage();
    const pages = [
      [loadMembersFromMock, 3],
      [loadReportCasesFromMock, 2],
      [loadConductReportsFromMock, 3],
      [loadDisputeCasesFromMock, 2],
    ] as const;

    for (const [loadPage, expectedSize] of pages) {
      const first = loadPage(storage);
      expect(first.items).toHaveLength(expectedSize);
      expect(first.nextCursor).toBe("mock-page-2");
      const second = loadPage(storage, first.nextCursor ?? undefined);
      expect(second.items.length).toBeGreaterThan(0);
      expect(second.items.some((item) => item.id === first.items[0]?.id)).toBe(false);
    }
  });

  it("resolves every linked mock Dispute Case to a Quest detail", () => {
    const storage = memoryStorage();
    const disputes = loadAllDisputeCasesFromMock(storage).items;
    const linkedDisputes = disputes.filter((dispute) => dispute.questId);

    expect(linkedDisputes).toHaveLength(disputes.length);
    for (const dispute of linkedDisputes) {
      expect(mockQuestDetailForId(dispute.questId)?.id).toBeTruthy();
    }

    // The failed Quest without a Dispute Case remains the explicit unlinked
    // workflow fixture for opening a new Dispute Case.
    expect(mockQuestDetailForId(MOCK_UNLINKED_FAILED_QUEST_ID)?.id).toBe(MOCK_UNLINKED_FAILED_QUEST_ID);
    expect(mockDisputeIdForQuest(MOCK_UNLINKED_FAILED_QUEST_ID)).toBeNull();
  });

  it("contains status and missing-value edge cases for the standalone boards", () => {
    const walletStatuses = new Set(mockAllWallets.map((wallet) => wallet.walletStatus));
    const payoutStatuses = new Set(mockAllPayoutDetails.map((payout) => payout.payoutStatus));
    const questStates = new Set(mockQuests.map((quest) => quest.questStatus));

    expect(walletStatuses).toEqual(new Set(["ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"]));
    expect(payoutStatuses).toEqual(new Set(["PENDING_ADMIN_APPROVAL", "SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "SUCCEEDED", "FAILED", "CANCELLED"]));
    expect(questStates.has("QUEST_OPEN")).toBe(true);
    expect(questStates.has("QUEST_CANCELLED")).toBe(true);
    expect(mockQuests.some((quest) => quest.dueAt === null)).toBe(true);
    expect(mockQuests.some((quest) => quest.rewardSatang === null)).toBe(true);
  });

  it("provides multiple valid Team Quest examples with roster details", () => {
    const teamQuests = mockAllQuests.filter((quest) => quest.participation === "GROUP");
    const teamModes = new Set(teamQuests.map((quest) => quest.mode));

    expect(teamQuests.length).toBeGreaterThanOrEqual(20);
    expect(teamQuests.every((quest) => quest.headcount >= 2 && quest.headcount <= 20)).toBe(true);
    expect(teamModes).toEqual(new Set(["FIRST_COME_FIRST_SERVED", "CANDIDATE"]));

    const assignedTeam = teamQuests.find((quest) => quest.questStatus === "QUEST_ASSIGNED");
    const assignedDetail = assignedTeam ? mockQuestDetailForId(assignedTeam.id) : null;
    expect(assignedDetail?.assignments.length).toBeGreaterThanOrEqual(2);

    const completedTeam = teamQuests.find((quest) => quest.questStatus === "QUEST_COMPLETED");
    const completedDetail = completedTeam ? mockQuestDetailForId(completedTeam.id) : null;
    expect(completedDetail?.proofSubmissions[0]?.submissionStatus).toBe("PROOF_APPROVED");
  });

  it("provides a real review queue and complete Payout timelines", () => {
    const pendingPayouts = mockAllPayoutDetails.filter((payout) => payout.payoutStatus === "PENDING_ADMIN_APPROVAL");
    expect(pendingPayouts.length).toBeGreaterThanOrEqual(51);

    const dashboardPendingPayouts = loadDashboardData(memoryStorage()).collections.payouts.filter((record) => (
      record && typeof record === "object" && !Array.isArray(record)
      && (record as Record<string, unknown>).payoutStatus === "PENDING_ADMIN_APPROVAL"
    ));
    expect(dashboardPendingPayouts).toHaveLength(pendingPayouts.length);

    for (const payout of mockAllPayoutDetails) {
      const first = payout.history[0];
      const last = payout.history.at(-1);
      expect(first?.fromStatus).toBeNull();
      expect(first?.toStatus).toBe("PENDING_ADMIN_APPROVAL");
      expect(last?.toStatus).toBe(payout.payoutStatus);
      for (let index = 1; index < payout.history.length; index += 1) {
        const previous = payout.history[index - 1];
        const current = payout.history[index];
        expect(current?.fromStatus).toBe(previous?.toStatus);
        expect(Date.parse(current?.occurredAt ?? "")).toBeGreaterThanOrEqual(Date.parse(previous?.occurredAt ?? ""));
      }
    }
  });

  it("connects multiple historical Payouts to the same Student", () => {
    const current = mockPayoutDetail("PAY-9700");
    expect(current).not.toBeNull();
    const detail = payoutDetailViewFromApi(current!, mockAllPayoutDetails);

    expect(detail.previousPayouts.map((payout) => payout.id)).toEqual([
      "PAY-9701",
      "PAY-9702",
      "PAY-9703",
    ]);
  });
});
