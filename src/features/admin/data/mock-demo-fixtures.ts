import type { AdminReview, AdminUser } from "./admin-records";
import type { MemberStatus, WalletStatus } from "../domain/rulebook";

export type MockDemoMemberSeed = {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  memberStatus: MemberStatus;
  walletStatus: WalletStatus;
  index: number;
};

const memberStatuses = ["Normal", "Flag", "Temp Ban", "Perm Ban"] as const;
const walletStatuses = ["ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"] as const;

/**
 * Generate enough deterministic Members for page-size and pagination QA.
 * The three canonical Members are seeded separately by the dashboard fixture.
 */
export const MOCK_DEMO_RECORD_COUNT = 200;

/**
 * Stable demo Members used by mock-only boards. Keep these records factual and
 * deterministic so a page refresh does not change the Admin decision context.
 */
export const mockDemoMemberSeeds: MockDemoMemberSeed[] = Array.from({ length: MOCK_DEMO_RECORD_COUNT }, (_, index) => {
  const number = index + 1;
  const memberStatus = memberStatuses[index % memberStatuses.length];
  const walletStatus = walletStatuses[index % walletStatuses.length];
  return {
    id: `68000${String(100 + index).padStart(3, "0")}`,
    title: `Demo Member ${String(number).padStart(2, "0")}`,
    firstName: "Demo",
    lastName: `Member ${String(number).padStart(2, "0")}`,
    email: `demo.member${String(number).padStart(2, "0")}@ku.th`,
    studentId: `651020${String(100 + index).padStart(4, "0")}`,
    memberStatus,
    walletStatus,
    index,
  };
});

export function mockDemoReviews(index: number): AdminReview[] {
  const status: AdminReview["status"] = index % 5 === 0
    ? "Hidden"
    : index % 3 === 0
      ? "Reported"
      : "Visible";
  const tone: AdminReview["tone"] = status === "Visible" ? "success" : status === "Reported" ? "warning" : "neutral";
  return [
    {
      reviewer: `Reviewer ${String(index + 1).padStart(2, "0")}`,
      rating: 2 + (index % 4),
      review: index % 4 === 0
        ? ""
        : "Demo review for UI edge-case testing.",
      date: `2026-09-${String((index % 9) + 1).padStart(2, "0")}`,
      reports: status === "Reported" ? 2 : status === "Hidden" ? 1 : 0,
      status,
      tone,
      ...(status === "Hidden" ? { statusBeforeHidden: "Reported" as const, toneBeforeHidden: "warning" as const } : {}),
    },
    {
      reviewer: `Reviewer ${String(index + 25).padStart(2, "0")}`,
      rating: 5,
      review: "Clear communication and complete Quest evidence.",
      date: `2026-08-${String((index % 9) + 10).padStart(2, "0")}`,
      reports: 0,
      status: "Visible",
      tone: "success",
    },
  ];
}

export function mockDemoMemberRecord(seed: MockDemoMemberSeed): AdminUser {
  const { index } = seed;
  const violationCount = seed.memberStatus === "Flag"
    ? 1
    : seed.memberStatus === "Temp Ban"
      ? 2
      : seed.memberStatus === "Perm Ban"
        ? 3
        : 0;
  const createdAt = new Date(Date.UTC(2026, 5, 1 + index, 3, 0, 0)).toISOString();
  const lastActiveAt = index % 7 === 0
    ? "Not recorded"
    : new Date(Date.UTC(2026, 8, 10 - (index % 8), 8, 30, 0)).toISOString();
  const walletId = `WAL-${1006 + index}`;
  const base: AdminUser = {
    id: seed.id,
    title: seed.title,
    person: seed.email,
    studentId: seed.studentId,
    memberStatus: seed.memberStatus,
    walletStatus: seed.walletStatus,
    walletId,
    walletSpendingBalanceSatang: seed.walletStatus === "CLOSED" ? 0 : 50000 + index * 7500,
    walletEarningsBalanceSatang: seed.walletStatus === "CLOSED" ? 0 : 25000 + index * 4000,
    walletFundingReservedSatang: seed.walletStatus === "CLOSED" ? 0 : index % 4 === 0 ? 0 : 10000 + index * 500,
    walletReservedForPayoutsSatang: seed.walletStatus === "CLOSED" ? 0 : index % 6 === 0 ? 0 : 5000 + index * 250,
    reviews: mockDemoReviews(index),
    confirmedViolationCount: violationCount,
    accountCreatedAt: createdAt,
    createdAt,
    lastActiveAt,
    about: index % 6 === 0 ? "" : "Demo Profile used to test Admin review context.",
    telephone: index % 5 === 0 ? null : `08${String(10000000 + index).slice(-8)}`,
    tags: index % 4 === 0 ? ["University"] : ["University", "Marketplace"],
    ...(seed.memberStatus === "Normal" ? {} : {
      statusReason: `Demo ${seed.memberStatus} state for moderation workflow testing.`,
      statusAppliedAt: new Date(Date.UTC(2026, 7, 10 + index, 9, 0, 0)).toISOString(),
      statusAppliedBy: "admin-demo",
    }),
    ...(seed.memberStatus === "Flag" ? { redFlagExpiresAt: "2026-09-30T09:00:00.000Z" } : {}),
    ...(seed.memberStatus === "Temp Ban" ? { banExpiresAt: "2026-09-24T09:00:00.000Z" } : {}),
    ...(seed.memberStatus === "Normal" && index === 0 ? { newUserExemptionRemaining: 2 } : {}),
    faculty: index % 2 === 0 ? "Engineering" : "Management Sciences",
    department: index % 2 === 0 ? "Computer Engineering" : "Business Administration",
    occupation: "Student",
    ...(index % 3 === 0 ? {
      moderationHistory: [{
        event: `${seed.memberStatus} state recorded`,
        at: "2026-09-10T09:00:00.000Z",
        by: "admin-demo",
        reason: "Demo moderation history for UI review.",
        outcome: seed.memberStatus === "Normal" ? "No active penalty" : `${seed.memberStatus} applied`,
      }],
    } : {}),
    ...(index % 4 === 1 ? {
      adminNotes: [{
        at: "2026-09-11T10:00:00.000Z",
        by: "admin-demo",
        note: "Demo note: verify the related moderation record before acting.",
      }],
    } : {}),
  };

  return base;
}
