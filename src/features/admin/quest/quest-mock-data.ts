import type { AdminQuest, AdminQuestDetail, AdminQuestFinance } from "../api/admin-api";

export const MOCK_OPEN_QUEST_ID = "00000000-0000-0000-0000-000000000001";
export const MOCK_TEAM_QUEST_ID = "00000000-0000-0000-0000-000000000002";
export const MOCK_FAILED_QUEST_ID = "00000000-0000-0000-0000-000000000003";
export const MOCK_HIDDEN_QUEST_ID = "00000000-0000-0000-0000-000000000004";
export const MOCK_UNLINKED_FAILED_QUEST_ID = "00000000-0000-0000-0000-000000000005";
export const MOCK_DISPUTE_CASE_ID = "00000000-0000-0000-0000-000000000101";
export const MOCK_NEW_DISPUTE_CASE_ID = "00000000-0000-0000-0000-000000000102";
export const MOCK_ASSIGNED_WORKER_ID = "00000000-0000-0000-0000-000000000020";

export const mockHirer = {
  id: "00000000-0000-0000-0000-000000000010",
  firstName: "Kamonwan",
  lastName: "Lertwiroj",
  email: "hirer@ku.th",
};

export const assignedWorker = {
  id: MOCK_ASSIGNED_WORKER_ID,
  firstName: "Nicha",
  lastName: "Worker",
  email: "worker@ku.th",
};

export function mockQuestSummary(overrides: Partial<AdminQuest> = {}): AdminQuest {
  return {
    id: MOCK_OPEN_QUEST_ID,
    displayId: "QST-OPEN",
    apiVersion: "v1",
    version: 4,
    title: "Inspect campus signs",
    questStatus: "QUEST_OPEN",
    mode: "FIRST_COME_FIRST_SERVED",
    participation: "SINGLE",
    headcount: 1,
    rewardSatang: 12000,
    questFundingTotalSatang: 12240,
    startTime: "2026-09-17T08:48:00.000Z",
    dueAt: "2026-09-24T08:48:00.000Z",
    hiddenAt: null,
    createdAt: "2026-09-14T08:48:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
    hirer: mockHirer,
    ...overrides,
  };
}

export const mockUnlinkedFailedQuest = mockQuestSummary({
  id: MOCK_UNLINKED_FAILED_QUEST_ID,
  displayId: "QST-NO-DISPUTE",
  title: "Failed Quest without a Dispute Case",
  questStatus: "QUEST_FAILED",
});

export const mockQuests: AdminQuest[] = [
  mockQuestSummary(),
  mockQuestSummary({
    id: MOCK_TEAM_QUEST_ID,
    displayId: "QST-TEAM",
    title: "Map library access points",
    questStatus: "QUEST_ASSIGNED",
    participation: "GROUP",
  }),
  mockQuestSummary({
    id: MOCK_FAILED_QUEST_ID,
    displayId: "QST-FAILED",
    title: "Review flood route markers",
    questStatus: "QUEST_FAILED",
  }),
  mockQuestSummary({
    id: MOCK_HIDDEN_QUEST_ID,
    displayId: "QST-HIDDEN",
    title: "Restore reviewed campus signs",
    version: 5,
    hiddenAt: "2026-09-14T09:10:00.000Z",
  }),
  mockUnlinkedFailedQuest,
];

export function mockQuestDetail(quest: AdminQuest): AdminQuestDetail {
  const detail: AdminQuestDetail = {
    ...quest,
    description: `Full description for ${quest.title}.`,
    condition: {
      text: "Complete the requested work and submit verifiable evidence.",
      items: [{ position: 0, text: "Submit the requested work before the due date." }],
    },
    locations: [{ label: "Kasetsart Innovation Centre" }],
    proofRequired: true,
    tagId: null,
    fundingReservationId: "00000000-0000-0000-0000-000000000201",
    policyRevisionId: "00000000-0000-0000-0000-000000000202",
    platformFeeBps: 200,
    platformFeePerWorkerSatang: 240,
    questEscrowSatang: 12240,
    cancelledAt: null,
    cancelledByUserId: null,
    cancelledByAdminId: null,
    candidates: { applications: [], teams: [] },
    assignments: quest.id === MOCK_UNLINKED_FAILED_QUEST_ID || quest.id === MOCK_TEAM_QUEST_ID
      ? [{
          id: "00000000-0000-0000-0000-000000000420",
          worker: assignedWorker,
          assignmentStatus: "ASSIGNMENT_INCOMPLETE",
          startedAt: "2026-09-14T09:00:00.000Z",
          createdAt: "2026-09-14T08:50:00.000Z",
        }]
      : [],
    proofSubmissions: [],
    editHistory: [],
    adminActions: [],
  };

  if (quest.id === MOCK_OPEN_QUEST_ID) {
    detail.images = [{
      imageId: "00000000-0000-0000-0000-000000000501",
      fileId: "00000000-0000-0000-0000-000000000502",
      position: 0,
      url: "https://cdn.example.com/quest-signs.jpg",
      urlExpiresAt: "2026-09-14T10:15:00.000Z",
    }];
  }

  if (quest.id === MOCK_TEAM_QUEST_ID) {
    detail.editHistory = [{
      kind: "EDIT_REQUEST",
      id: "00000000-0000-0000-0000-000000000601",
      apiVersion: "v2",
      requestStatus: "EDIT_REQUEST_PENDING",
      failureCode: null,
      requestedByUserId: mockHirer.id,
      proposedChanges: {
        previousCondition: [{ position: 0, text: "Complete the requested work and submit verifiable evidence." }],
        proposedCondition: [{ position: 0, text: "Complete the revised requested work and submit verifiable evidence." }],
      },
      createdAt: "2026-09-14T09:15:00.000Z",
      expiresAt: "2026-09-14T09:25:00.000Z",
      resolvedAt: null,
      responses: [{
        workerId: MOCK_ASSIGNED_WORKER_ID,
        decision: null,
        reason: null,
        respondedAt: null,
      }],
    }];
  }

  return detail;
}

export function mockQuestDetailForId(questId: string): AdminQuestDetail | null {
  const quest = mockQuests.find((item) => item.id === questId);
  return quest ? mockQuestDetail(quest) : null;
}

export function mockQuestFinance(quest: AdminQuest): AdminQuestFinance {
  return {
    quest: {
      id: quest.id,
      title: quest.title,
      questStatus: quest.questStatus,
      headcount: quest.headcount,
      rewardSatang: quest.rewardSatang,
      platformFeePerWorkerSatang: 240,
      questFundingTotalSatang: quest.questFundingTotalSatang,
      hirer: { ...mockHirer, studentId: "6599900015" },
    },
    reservation: {
      id: "00000000-0000-0000-0000-000000000201",
      status: "ACTIVE",
      totalReservedSatang: 12240,
      remainingSatang: 12240,
      createdAt: "2026-09-14T08:48:00.000Z",
    },
    transfers: [],
    ledgerTransactions: [{
      id: "00000000-0000-0000-0000-000000000401",
      businessReference: "QUEST-FUNDING-OPEN",
      eventType: "QUEST_FUNDING_RESERVED",
      description: "Funding Reservation created for the Quest.",
      createdAt: "2026-09-14T08:49:00.000Z",
      sealedAt: "2026-09-14T08:49:01.000Z",
      postings: [{
        id: "00000000-0000-0000-0000-000000000402",
        accountId: "account-1",
        accountType: "FUNDING_RESERVED",
        walletId: "00000000-0000-0000-0000-000000000010",
        ownerUserId: mockHirer.id,
        amountSatang: 12240,
      }],
    }],
  };
}

export function mockDisputeIdForQuest(questId: string): string | null {
  return questId === MOCK_FAILED_QUEST_ID ? MOCK_DISPUTE_CASE_ID : null;
}
