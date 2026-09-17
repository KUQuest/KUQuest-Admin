import type {
  AdminApiQuestStatus,
  AdminQuest,
  AdminQuestDetail,
  AdminQuestFinance,
  AdminQuestMember,
} from "../api/admin-api";
import { mockDemoMemberSeeds } from "../data/mock-demo-fixtures";

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

const questStatusPaths: Record<AdminApiQuestStatus, AdminApiQuestStatus[]> = {
  QUEST_DRAFT: ["QUEST_DRAFT"],
  QUEST_OPEN: ["QUEST_DRAFT", "QUEST_OPEN"],
  QUEST_AWAITING_CONSENT: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_AWAITING_CONSENT"],
  QUEST_ASSIGNED: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED"],
  QUEST_IN_PROGRESS: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED", "QUEST_IN_PROGRESS"],
  QUEST_SUBMITTED: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED", "QUEST_IN_PROGRESS", "QUEST_SUBMITTED"],
  QUEST_APPROVED: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED", "QUEST_IN_PROGRESS", "QUEST_SUBMITTED", "QUEST_APPROVED"],
  QUEST_REWORK: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED", "QUEST_IN_PROGRESS", "QUEST_SUBMITTED", "QUEST_REWORK"],
  QUEST_COMPLETED: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED", "QUEST_IN_PROGRESS", "QUEST_SUBMITTED", "QUEST_APPROVED", "QUEST_COMPLETED"],
  QUEST_CANCELLED: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_CANCELLED"],
  QUEST_DISPUTED: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED", "QUEST_IN_PROGRESS", "QUEST_FAILED", "QUEST_DISPUTED"],
  QUEST_FAILED: ["QUEST_DRAFT", "QUEST_OPEN", "QUEST_ASSIGNED", "QUEST_IN_PROGRESS", "QUEST_FAILED"],
};

function questTimelineFor(quest: AdminQuest): AdminQuestDetail["timeline"] {
  const statuses = questStatusPaths[quest.questStatus];
  const createdAt = Date.parse(quest.createdAt);
  const updatedAt = Date.parse(quest.updatedAt);
  const timelineStart = Number.isFinite(createdAt) ? createdAt : Date.now();
  const hasDateRange = Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt >= createdAt;
  const timelineEnd = hasDateRange ? updatedAt : timelineStart;
  const elapsed = Math.max(0, timelineEnd - timelineStart);
  const interval = statuses.length > 1 ? Math.max(1, Math.floor(elapsed / (statuses.length - 1))) : 0;

  return statuses.map((status, index) => ({
    event: index === 0 ? "QUEST_CREATED" : "QUEST_STATUS_CHANGED",
    status,
    occurredAt: index === statuses.length - 1 && hasDateRange
      ? quest.updatedAt
      : new Date(timelineStart + interval * index).toISOString(),
    actorId: null,
    reasonCode: null,
  }));
}

const demoQuestStates = [
  "QUEST_OPEN",
  "QUEST_IN_PROGRESS",
  "QUEST_COMPLETED",
  "QUEST_DRAFT",
  "QUEST_CANCELLED",
] as const;

const teamQuestTitles = [
  "Audit campus accessibility",
  "Photograph event spaces",
  "Map shared study areas",
  "Review community garden signs",
] as const;

type DemoQuestMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

function demoQuestMemberFor(index: number): DemoQuestMember {
  const seed = mockDemoMemberSeeds[index];
  if (seed) {
    return {
      id: seed.id,
      firstName: seed.firstName,
      lastName: seed.lastName,
      email: seed.email,
    };
  }

  const sequence = String(index + 1).padStart(3, "0");
  return {
    id: String(68000200 + index),
    firstName: "Demo",
    lastName: `Member ${sequence}`,
    email: `demo.member${sequence}@ku.th`,
  };
}

function makeDemoQuest(index: number): AdminQuest {
  const state = demoQuestStates[index % demoQuestStates.length];
  const isTeamQuest = index % 7 === 3;
  const teamHeadcount = 2 + (index % 3);
  const rewardSatang = index % 7 === 0 ? null : 7000 + index * 500;
  // Keep canonical workflow records at the top of the default newest-first
  // board while the generated records still span many older dates.
  const createdAt = new Date(Date.UTC(2026, 7, 1, 4, 0, 0) - index * 86_400_000).toISOString();
  const member = demoQuestMemberFor(index);
  return mockQuestSummary({
    id: `00000000-0000-0000-0000-${String(600 + index).padStart(12, "0")}`,
    displayId: `QST-${12011 + index}`,
    title: isTeamQuest
      ? `Team Quest ${String(index + 1).padStart(2, "0")} · ${teamQuestTitles[index % teamQuestTitles.length]}`
      : `Demo Quest ${String(index + 1).padStart(2, "0")}`,
    questStatus: state,
    mode: index % 2 === 0 ? "FIRST_COME_FIRST_SERVED" : "CANDIDATE",
    participation: isTeamQuest ? "GROUP" : "SINGLE",
    headcount: isTeamQuest ? teamHeadcount : 1,
    rewardSatang,
    questFundingTotalSatang: rewardSatang === null ? null : rewardSatang + 240,
    startTime: new Date(Date.UTC(2026, 7, 2, 8, 0, 0) - index * 86_400_000).toISOString(),
    dueAt: index % 6 === 0 ? null : new Date(Date.UTC(2026, 7, 8, 15, 0, 0) - index * 86_400_000).toISOString(),
    hiddenAt: index % 11 === 0 ? new Date(Date.UTC(2026, 7, 3, 9, 0, 0) - index * 86_400_000).toISOString() : null,
    createdAt,
    updatedAt: createdAt,
    hirer: member,
  });
}

// Keep the original demo fixture small for tests that use it as a focused
// scenario. The route service can use mockAllQuests for scale testing.
const mockDemoQuests: AdminQuest[] = Array.from({ length: 24 }, (_, index) => makeDemoQuest(index));
const mockScaleQuests: AdminQuest[] = Array.from({ length: 171 }, (_, index) => makeDemoQuest(index + 24));

const mockCoreQuests: AdminQuest[] = [
  mockQuestSummary(),
  mockQuestSummary({
    id: MOCK_TEAM_QUEST_ID,
    displayId: "QST-TEAM",
    title: "Map library access points",
    questStatus: "QUEST_ASSIGNED",
    mode: "CANDIDATE",
    participation: "GROUP",
    headcount: 3,
    rewardSatang: 18000,
    questFundingTotalSatang: 18240,
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
  ...mockDemoQuests,
];

export const mockQuests: AdminQuest[] = mockCoreQuests;

// The dashboard demo data keeps the original human-readable Quest references
// used by Dispute Cases (QST-12001, QST-12008, and QST-12206–QST-12210).
// Keep these failed Quests in the board so an Admin can find the Quest from
// the Dispute Case and review it from the Failed tab.
const mockDisputeQuestAliases: AdminQuest[] = [
  mockQuestSummary({
    id: "QST-12001",
    displayId: "QST-12001",
    title: "Verify dorm fire exits",
    questStatus: "QUEST_FAILED",
  }),
  mockQuestSummary({
    id: "QST-12008",
    displayId: "QST-12008",
    title: "Design orientation social cards",
    questStatus: "QUEST_FAILED",
  }),
  ...Array.from({ length: 5 }, (_, offset) => {
    const quest = makeDemoQuest(195 + offset);
    return {
      ...quest,
      questStatus: "QUEST_FAILED" as const,
    };
  }),
];

export const mockAllQuests: AdminQuest[] = [
  ...mockCoreQuests,
  ...mockScaleQuests,
  ...mockDisputeQuestAliases,
];

const teamRosterStates: readonly AdminApiQuestStatus[] = [
  "QUEST_ASSIGNED",
  "QUEST_IN_PROGRESS",
  "QUEST_SUBMITTED",
  "QUEST_APPROVED",
  "QUEST_REWORK",
  "QUEST_COMPLETED",
  "QUEST_FAILED",
  "QUEST_DISPUTED",
];

const teamProofStates: readonly AdminApiQuestStatus[] = [
  "QUEST_SUBMITTED",
  "QUEST_APPROVED",
  "QUEST_REWORK",
  "QUEST_COMPLETED",
  "QUEST_FAILED",
  "QUEST_DISPUTED",
];

function teamMembersFor(quest: AdminQuest): AdminQuestMember[] {
  const memberCount = Math.max(2, Math.min(quest.headcount, 20));
  if (quest.id === MOCK_TEAM_QUEST_ID) {
    return [assignedWorker, demoQuestMemberFor(1), demoQuestMemberFor(2)].slice(0, memberCount);
  }

  const numericId = Number.parseInt(quest.id.slice(-3), 10);
  const baseIndex = 24 + (Number.isFinite(numericId) ? numericId % 120 : 0);
  return Array.from({ length: memberCount }, (_, index) => demoQuestMemberFor(baseIndex + index));
}

function teamNameFor(quest: AdminQuest): string {
  return `${quest.displayId ?? "Quest"} Field Team`;
}

function teamCandidatesFor(
  quest: AdminQuest,
  members: readonly AdminQuestMember[],
): AdminQuestDetail["candidates"]["teams"] {
  if (quest.participation !== "GROUP" || quest.mode !== "CANDIDATE" || quest.questStatus === "QUEST_DRAFT") return [];

  const forming = quest.questStatus === "QUEST_OPEN";
  const teamMembers = members.slice(0, forming ? Math.max(1, members.length - 1) : members.length);
  return [{
    id: `${quest.id}-team`,
    name: teamNameFor(quest),
    teamStatus: forming
      ? "TEAM_FORMING"
      : quest.questStatus === "QUEST_CANCELLED" ? "TEAM_REJECTED" : "TEAM_SELECTED",
    reworkLimit: 0,
    leaderId: teamMembers[0]?.id ?? members[0]?.id ?? mockHirer.id,
    createdAt: quest.createdAt,
    members: teamMembers.map((member, index) => ({
      member,
      joinedAt: new Date(Date.parse(quest.createdAt) + index * 60_000).toISOString(),
    })),
  }];
}

function teamAssignmentsFor(
  quest: AdminQuest,
  members: readonly AdminQuestMember[],
): AdminQuestDetail["assignments"] {
  if (quest.participation !== "GROUP" || !teamRosterStates.includes(quest.questStatus)) return [];

  const completed = quest.questStatus === "QUEST_COMPLETED" || quest.questStatus === "QUEST_APPROVED";
  const incomplete = quest.questStatus === "QUEST_FAILED" || quest.questStatus === "QUEST_DISPUTED";
  const started = quest.questStatus !== "QUEST_ASSIGNED";
  return members.map((worker, index) => ({
    id: `${quest.id}-assignment-${index + 1}`,
    worker,
    assignmentStatus: completed
      ? "ASSIGNMENT_COMPLETED"
      : incomplete ? "ASSIGNMENT_INCOMPLETE" : "ASSIGNMENT_ACTIVE",
    startedAt: started ? quest.startTime : null,
    createdAt: quest.createdAt,
  }));
}

function teamProofSubmissionsFor(
  quest: AdminQuest,
  members: readonly AdminQuestMember[],
): AdminQuestDetail["proofSubmissions"] {
  if (quest.participation !== "GROUP" || !teamProofStates.includes(quest.questStatus)) return [];

  const approved = quest.questStatus === "QUEST_APPROVED" || quest.questStatus === "QUEST_COMPLETED";
  const rejected = quest.questStatus === "QUEST_FAILED" || quest.questStatus === "QUEST_DISPUTED";
  const submittedBy = members[0] ?? assignedWorker;
  return [{
    id: `${quest.id}-proof-1`,
    worker: null,
    team: { id: `${quest.id}-team`, name: teamNameFor(quest) },
    submittedBy,
    content: "The Team submitted the requested work and evidence.",
    submissionStatus: approved ? "PROOF_APPROVED" : rejected ? "PROOF_NOT_APPROVED" : "PROOF_SUBMITTED",
    reviewNote: approved ? "Team evidence accepted by the Hirer." : rejected ? "Team evidence was not approved." : null,
    submittedAt: quest.updatedAt,
    reviewedAt: approved || rejected ? quest.updatedAt : null,
    files: [{
      fileId: `${quest.id}-proof-file-1`,
      contentType: "image/jpeg",
      sizeBytes: 245_000,
      position: 0,
    }],
  }];
}

export function mockQuestDetail(quest: AdminQuest): AdminQuestDetail {
  const teamMembers = quest.participation === "GROUP" ? teamMembersFor(quest) : [];
  const teamAssignments = teamAssignmentsFor(quest, teamMembers);
  const teamCandidates = teamCandidatesFor(quest, teamMembers);
  const teamApplications = quest.participation === "GROUP" && quest.mode === "CANDIDATE" && quest.questStatus === "QUEST_OPEN"
    ? [{
        id: `${quest.id}-application-1`,
        worker: demoQuestMemberFor(80),
        applicationStatus: "APPLICATION_PENDING",
        reworkLimit: 0,
        appliedAt: quest.createdAt,
      }]
    : [];
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
    questEscrowSatang: quest.questFundingTotalSatang,
    cancelledAt: null,
    cancelledByUserId: null,
    cancelledByAdminId: null,
    candidates: { applications: teamApplications, teams: teamCandidates },
    assignments: teamAssignments.length
      ? teamAssignments
      : quest.id === MOCK_UNLINKED_FAILED_QUEST_ID
      ? [{
          id: "00000000-0000-0000-0000-000000000420",
          worker: assignedWorker,
          assignmentStatus: "ASSIGNMENT_INCOMPLETE",
          startedAt: "2026-09-14T09:00:00.000Z",
          createdAt: "2026-09-14T08:50:00.000Z",
        }]
      : [],
    proofSubmissions: teamProofSubmissionsFor(quest, teamMembers),
    editHistory: [],
    timeline: questTimelineFor(quest),
    adminActions: [],
  };

  if (quest.id === MOCK_OPEN_QUEST_ID) {
    detail.images = [{
      imageId: "00000000-0000-0000-0000-000000000501",
      fileId: "00000000-0000-0000-0000-000000000502",
      position: 0,
      // Keep the mock attachment local so the Admin preview is deterministic
      // and does not depend on an unavailable external CDN.
      url: "/library-access-route.webp",
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
      responses: teamMembers.map((member) => ({
        workerId: member.id,
        decision: null,
        reason: null,
        respondedAt: null,
      })),
    }];
  }

  return detail;
}

export function mockQuestDetailForId(questId: string): AdminQuestDetail | null {
  const quest = [...mockAllQuests, ...mockDisputeQuestAliases].find(
    (item) => item.id === questId || item.displayId === questId,
  );
  return quest ? mockQuestDetail(quest) : null;
}

export function mockQuestFinance(quest: AdminQuest): AdminQuestFinance {
  const fundingTotalSatang = quest.questFundingTotalSatang;
  return {
    quest: {
      id: quest.id,
      title: quest.title,
      questStatus: quest.questStatus,
      headcount: quest.headcount,
      rewardSatang: quest.rewardSatang,
      platformFeePerWorkerSatang: fundingTotalSatang === null ? null : 240,
      questFundingTotalSatang: fundingTotalSatang,
      hirer: { ...mockHirer, studentId: "6599900015" },
    },
    reservation: fundingTotalSatang === null ? null : {
      id: "00000000-0000-0000-0000-000000000201",
      status: "ACTIVE",
      totalReservedSatang: fundingTotalSatang,
      remainingSatang: fundingTotalSatang,
      createdAt: "2026-09-14T08:48:00.000Z",
    },
    transfers: [],
    ledgerTransactions: fundingTotalSatang === null ? [] : [{
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
        amountSatang: fundingTotalSatang,
      }],
    }],
  };
}

export function mockDisputeIdForQuest(questId: string): string | null {
  if (questId === MOCK_FAILED_QUEST_ID) return MOCK_DISPUTE_CASE_ID;
  if (questId === "QST-12001") return "DSP-5201";
  if (questId === "QST-12008") return "DSP-5202";

  const demoDisputeQuest = /^QST-(12\d{3})$/.exec(questId);
  if (!demoDisputeQuest) return null;
  const questNumber = Number(demoDisputeQuest[1]);
  if (questNumber < 12206 || questNumber > 12210) return null;
  return `DSP-${5210 + (questNumber - 12011)}`;
}
