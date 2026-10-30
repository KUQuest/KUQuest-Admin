import { z } from "zod";

import type {
  AdminApiRequestOptions,
  AdminMemberCertificate,
  AdminMemberHistory,
  AdminMemberHistoryItem,
  AdminMemberHistoryQuery,
  AdminMemberPenaltyHistory,
  AdminMemberProfileTags,
  AdminMemberReport,
  AdminMemberReportCounts,
  AdminMemberReview,
  AdminMemberWorkExperience,
  AdminMemberWorkExperiences,
  AdminMemberPayout,
  AdminMemberReports,
} from "../api/admin-api";
import {
  adminMemberCertificatesSchema,
  adminMemberHistorySchema,
  adminMemberPenaltyHistorySchema,
  adminMemberProfileTagsSchema,
  adminMemberReportsSchema,
  adminMemberReviewsSchema,
  adminMemberWorkExperiencesSchema,
  adminMemberPayoutsSchema,
} from "../api/admin-api-types-member-profile";
import { adminApiProvider } from "../api/admin-provider";
import { CONDUCT_REPORT_STATUSES, REPORT_CASE_STATUSES } from "../domain/rulebook";
import {
  memberPenaltyHistoryItemKey,
  type MemberApiCollections,
  type MemberCollection,
  type MemberPenaltyHistoryCollection,
  type MemberPenaltyHistorySummary,
} from "./member-model";

const memberPageLimit = 50;
const reportStatuses = [...REPORT_CASE_STATUSES, ...CONDUCT_REPORT_STATUSES];

class MemberApiContractError extends Error {}

type CursorPage<T> = {
  items: T[];
  totalCount: number;
  nextCursor: string | null;
};

const requestFailure = <T>(message: string): MemberCollection<T> => ({
  items: null,
  totalCount: null,
  complete: false,
  error: { kind: "request", message },
});

const contractFailure = <T>(message: string): MemberCollection<T> => ({
  items: null,
  totalCount: null,
  complete: false,
  error: { kind: "contract", message },
});

function parseApiContract<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new MemberApiContractError(message);
  return result.data;
}

function memberDisplayIdMatches(actual: string, expected: string | null): boolean {
  return expected === null || actual === expected;
}

async function loadAllPages<T>(
  readPage: (cursor?: string) => Promise<CursorPage<T>>,
  requestMessage: string,
  contractMessage: string,
  itemKey?: (item: T) => string,
): Promise<MemberCollection<T>> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  const seenItems = new Set<string>();
  let cursor: string | undefined;
  let totalCount: number | null = null;

  while (true) {
    try {
      const page = await readPage(cursor);
      if ((totalCount !== null && page.totalCount !== totalCount)
        || items.length + page.items.length > page.totalCount) {
        throw new MemberApiContractError(contractMessage);
      }
      if (itemKey) {
        for (const item of page.items) {
          const key = itemKey(item);
          if (seenItems.has(key)) throw new MemberApiContractError(contractMessage);
          seenItems.add(key);
        }
      }
      totalCount = page.totalCount;
      items.push(...page.items);
      if (page.nextCursor === null) {
        if (items.length !== totalCount) throw new MemberApiContractError(contractMessage);
        return { items, totalCount, complete: true, error: null };
      }
      if (page.items.length === 0 || seenCursors.has(page.nextCursor)) {
        throw new MemberApiContractError(contractMessage);
      }
      seenCursors.add(page.nextCursor);
      cursor = page.nextCursor;
    } catch (error: unknown) {
      const invalid = error instanceof MemberApiContractError;
      const hasPartialItems = !invalid && items.length > 0;
      return {
        items: hasPartialItems ? items : null,
        totalCount: hasPartialItems ? totalCount : null,
        complete: false,
        error: {
          kind: invalid ? "contract" : "request",
          message: invalid ? contractMessage : requestMessage,
        },
      };
    }
  }
}

function reportMatchesMemberScope(report: AdminMemberReport, memberId: string, scope: "received" | "submitted"): boolean {
  if (report.kind === "REPORT_CASE") {
    if (scope === "received") return report.reportedMember?.id === memberId;
    return report.reporterEntries.some((entry) => entry.reporterMemberId === memberId);
  }
  if (scope === "received") return report.reportedMember.id === memberId;
  return report.filer.id === memberId;
}

function reportCountsMatch(left: AdminMemberReportCounts, right: AdminMemberReportCounts): boolean {
  return reportStatuses.every((status) => left[status] === right[status]);
}

function reportCountsTotal(counts: AdminMemberReportCounts): number {
  return reportStatuses.reduce((total, status) => total + counts[status], 0);
}

async function loadMemberProfileTags(
  memberId: string,
  expectedDisplayId: string | null,
  options: AdminApiRequestOptions,
): Promise<MemberCollection<string>> {
  const requestMessage = "Profile Tags could not be loaded.";
  const contractMessage = "Profile Tags data does not match the Admin API contract.";
  try {
    const response: AdminMemberProfileTags = parseApiContract(
      adminMemberProfileTagsSchema,
      await adminApiProvider.read.getMemberProfileTags(memberId, options),
      contractMessage,
    );
    if (!memberDisplayIdMatches(response.member.displayId, expectedDisplayId)) throw new MemberApiContractError(contractMessage);
    const items = response.tags.map((tag) => tag.name);
    return { items, totalCount: items.length, complete: true, error: null };
  } catch (error: unknown) {
    return error instanceof MemberApiContractError
      ? contractFailure(contractMessage)
      : requestFailure(requestMessage);
  }
}

async function loadMemberWorkExperiences(
  memberId: string,
  expectedDisplayId: string | null,
  options: AdminApiRequestOptions,
): Promise<MemberCollection<AdminMemberWorkExperience>> {
  const requestMessage = "Work Experience could not be loaded.";
  const contractMessage = "Work Experience data does not match the Admin API contract.";
  return loadAllPages(async (cursor) => {
    const response: AdminMemberWorkExperiences = parseApiContract(
      adminMemberWorkExperiencesSchema,
      await adminApiProvider.read.listMemberWorkExperiences(memberId, { limit: memberPageLimit, ...(cursor ? { cursor } : {}) }, options),
      contractMessage,
    );
    if (!memberDisplayIdMatches(response.member.displayId, expectedDisplayId)) throw new MemberApiContractError(contractMessage);
    return response;
  }, requestMessage, contractMessage);
}

async function loadMemberCertificates(
  memberId: string,
  expectedDisplayId: string | null,
  options: AdminApiRequestOptions,
): Promise<MemberCollection<AdminMemberCertificate>> {
  const requestMessage = "Certificates could not be loaded.";
  const contractMessage = "Certificates data does not match the Admin API contract.";
  return loadAllPages(async (cursor) => {
    const response = parseApiContract(
      adminMemberCertificatesSchema,
      await adminApiProvider.read.listMemberCertificates(memberId, { limit: memberPageLimit, ...(cursor ? { cursor } : {}) }, options),
      contractMessage,
    );
    if (!memberDisplayIdMatches(response.member.displayId, expectedDisplayId)) throw new MemberApiContractError(contractMessage);
    return response;
  }, requestMessage, contractMessage);
}

async function loadMemberHistory(
  memberId: string,
  expectedDisplayId: string | null,
  options: AdminApiRequestOptions,
): Promise<MemberCollection<AdminMemberHistoryItem>> {
  const requestMessage = "Quest history could not be loaded.";
  const contractMessage = "Quest history data does not match the Admin API contract.";
  return loadAllPages(async (cursor) => {
    const query: AdminMemberHistoryQuery = { limit: memberPageLimit, ...(cursor ? { cursor } : {}) };
    const response: AdminMemberHistory = parseApiContract(
      adminMemberHistorySchema,
      await adminApiProvider.read.listMemberHistory(memberId, query, options),
      contractMessage,
    );
    if (!memberDisplayIdMatches(response.member.displayId, expectedDisplayId)) throw new MemberApiContractError(contractMessage);
    return response;
  }, requestMessage, contractMessage, (item) => `${item.role}:${item.quest.id}`);
}

async function loadMemberReviews(
  memberId: string,
  options: AdminApiRequestOptions,
): Promise<MemberCollection<AdminMemberReview>> {
  const requestMessage = "Review details could not be loaded.";
  const contractMessage = "Review data does not match the Admin API contract.";
  return loadAllPages(async (cursor) => {
    return parseApiContract(
      adminMemberReviewsSchema,
      await adminApiProvider.read.listMemberReviews(memberId, { limit: memberPageLimit, ...(cursor ? { cursor } : {}) }, options),
      contractMessage,
    );
  }, requestMessage, contractMessage, (item) => item.id);
}

async function loadMemberReports(
  memberId: string,
  scope: "received" | "submitted",
  options: AdminApiRequestOptions,
): Promise<MemberCollection<AdminMemberReport>> {
  const requestMessage = scope === "received" ? "Reports received could not be loaded." : "Reports submitted could not be loaded.";
  const contractMessage = scope === "received"
    ? "Reports received data does not match the Admin API contract."
    : "Reports submitted data does not match the Admin API contract.";
  let countsSnapshot: AdminMemberReportCounts | null = null;
  return loadAllPages(async (cursor) => {
    const query = scope === "received"
      ? { memberId, statusMode: "FULL_HISTORY" as const, limit: memberPageLimit, ...(cursor ? { cursor } : {}) }
      : { submittedByMemberId: memberId, statusMode: "FULL_HISTORY" as const, limit: memberPageLimit, ...(cursor ? { cursor } : {}) };
    const response: AdminMemberReports = parseApiContract(
      adminMemberReportsSchema,
      await adminApiProvider.read.listReports(query, options),
      contractMessage,
    );
    if (reportCountsTotal(response.countsByStatus) !== response.totalCount
      || (countsSnapshot && !reportCountsMatch(countsSnapshot, response.countsByStatus))
      || response.items.some((item) => !reportMatchesMemberScope(item, memberId, scope))) {
      throw new MemberApiContractError(contractMessage);
    }
    countsSnapshot = response.countsByStatus;
    return response;
  }, requestMessage, contractMessage, (item) => `${item.kind}:${item.id}`);
}

async function loadMemberPayouts(
  memberId: string,
  options: AdminApiRequestOptions,
): Promise<MemberCollection<AdminMemberPayout>> {
  const requestMessage = "Payout details could not be loaded.";
  const contractMessage = "Payout data does not match the Admin API contract.";
  return loadAllPages(async (cursor) => {
    const response = parseApiContract(
      adminMemberPayoutsSchema,
      await adminApiProvider.read.listPayouts({
        status: "ALL",
        userId: memberId,
        limit: memberPageLimit,
        ...(cursor ? { cursor } : {}),
        sort: "newest",
      }, options),
      contractMessage,
    );
    if (response.items.some((item) => item.student.id !== memberId)) throw new MemberApiContractError(contractMessage);
    return response;
  }, requestMessage, contractMessage, (item) => item.id);
}

function penaltySummaryFrom(response: AdminMemberPenaltyHistory): MemberPenaltyHistorySummary {
  return {
    confirmedMisconductCount: response.confirmedMisconductCount,
    effectiveActiveMisconductPenaltyCount: response.effectiveActiveMisconductPenaltyCount,
    reviewLadderRecordCount: response.reviewLadderRecordCount,
    versionToken: response.versionToken,
  };
}

function samePenaltySummary(left: MemberPenaltyHistorySummary, right: MemberPenaltyHistorySummary): boolean {
  return left.confirmedMisconductCount === right.confirmedMisconductCount
    && left.effectiveActiveMisconductPenaltyCount === right.effectiveActiveMisconductPenaltyCount
    && left.reviewLadderRecordCount === right.reviewLadderRecordCount
    && left.versionToken === right.versionToken;
}

async function loadMemberPenaltyHistory(
  memberId: string,
  expectedDisplayId: string | null,
  options: AdminApiRequestOptions,
): Promise<MemberPenaltyHistoryCollection> {
  const requestMessage = "Moderation history could not be loaded.";
  const contractMessage = "Moderation history data does not match the Admin API contract.";
  let summary: MemberPenaltyHistorySummary | null = null;
  const collection = await loadAllPages(async (cursor) => {
    const response: AdminMemberPenaltyHistory = parseApiContract(
      adminMemberPenaltyHistorySchema,
      await adminApiProvider.read.listMemberPenaltyHistory(memberId, { limit: memberPageLimit, ...(cursor ? { cursor } : {}) }, options),
      contractMessage,
    );
    if (!memberDisplayIdMatches(response.member.displayId, expectedDisplayId)) throw new MemberApiContractError(contractMessage);
    const pageSummary = penaltySummaryFrom(response);
    if (summary && !samePenaltySummary(summary, pageSummary)) throw new MemberApiContractError(contractMessage);
    summary = pageSummary;
    return response;
  }, requestMessage, contractMessage, memberPenaltyHistoryItemKey);
  return { ...collection, summary: collection.complete ? summary : null };
}

export async function loadMemberProfileCollections(
  memberId: string,
  expectedDisplayId: string | null,
  options: AdminApiRequestOptions,
): Promise<MemberApiCollections> {
  const [profileTags, workExperiences, certificates, questHistory, reviews, reportsReceived, reportsSubmitted, payouts, penaltyHistory] = await Promise.all([
    loadMemberProfileTags(memberId, expectedDisplayId, options),
    loadMemberWorkExperiences(memberId, expectedDisplayId, options),
    loadMemberCertificates(memberId, expectedDisplayId, options),
    loadMemberHistory(memberId, expectedDisplayId, options),
    loadMemberReviews(memberId, options),
    loadMemberReports(memberId, "received", options),
    loadMemberReports(memberId, "submitted", options),
    loadMemberPayouts(memberId, options),
    loadMemberPenaltyHistory(memberId, expectedDisplayId, options),
  ]);
  return { profileTags, workExperiences, certificates, questHistory, reviews, reportsReceived, reportsSubmitted, payouts, penaltyHistory };
}
