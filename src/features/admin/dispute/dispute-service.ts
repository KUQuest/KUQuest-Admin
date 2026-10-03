import type { AdminDisputeCase, AdminDisputeListQuery, AdminQuestDetail, AdminQuestFinance } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import type { DisputeCaseStatus } from "../domain/rulebook";
import { displayAdminId } from "../display-admin-id";
import {
  disputeCaseModelFromRecord,
  type DisputeCaseModel,
} from "./dispute-model";

export type DisputeCasePageData = {
  source: "api" | "mock";
  items: DisputeCaseModel[];
  nextCursor: string | null;
  countsByStatus?: Record<DisputeCaseStatus, number>;
};

const disputeCaseStatuses = [
  "DISPUTE_CASE_PENDING",
  "DISPUTE_CASE_DISMISSED",
  "DISPUTE_CASE_RESOLVED",
] as const satisfies readonly DisputeCaseStatus[];

type DisputeCaseStatusCursors = Partial<Record<DisputeCaseStatus, string>>;

function disputeCaseModels(values: readonly unknown[]): DisputeCaseModel[] {
  return values.flatMap((value) => {
    const model = disputeCaseModelFromRecord(value, "api");
    return model ? [model] : [];
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function timestampValue(value: unknown): number {
  const valueText = stringValue(value);
  if (!valueText) return 0;
  const timestamp = Date.parse(valueText);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function memberName(member: { firstName: string; lastName: string }): string {
  return [member.firstName, member.lastName].filter(Boolean).join(" ");
}

async function enrichDisputeCases(
  disputes: readonly AdminDisputeCase[],
  cookieHeader?: string,
): Promise<Record<string, unknown>[]> {
  const options = adminApiRequestOptions(cookieHeader);
  const questIds = [...new Set(disputes.map((dispute) => dispute.questId))];
  const questDetails = new Map<string, AdminQuestDetail | null>();
  const questFinances = new Map<string, AdminQuestFinance | null>();

  await Promise.all(questIds.map(async (questId) => {
    const [questResult, financeResult] = await Promise.allSettled([
      adminApiProvider.read.getQuest(questId, options),
      adminApiProvider.read.getQuestFinance(questId, options),
    ]);
    questDetails.set(questId, questResult.status === "fulfilled" ? questResult.value : null);
    questFinances.set(questId, financeResult.status === "fulfilled" ? financeResult.value : null);
  }));

  return disputes.map((dispute) => {
    const quest = questDetails.get(dispute.questId);
    const finance = questFinances.get(dispute.questId);
    const remainingReservationSatang = finance?.reservation?.remainingSatang;
    const financialFields = typeof remainingReservationSatang === "number"
      ? {
          amountAtRiskSatang: typeof dispute.amountAtRiskSatang === "number"
            ? dispute.amountAtRiskSatang
            : remainingReservationSatang,
          remainingDisputeCapSatang: remainingReservationSatang,
          remainingFundingReservationSatang: remainingReservationSatang,
        }
      : {};
    if (!quest) return { ...dispute, ...financialFields };

    const source = dispute as unknown as Record<string, unknown>;
    const filerId = stringValue(source.filerUserId) ?? stringValue(source.filerId);
    const workers = (quest.assignments ?? []).map((assignment) => assignment.worker);
    const filerIsHirer = filerId === quest.hirer.id;
    const filerWorker = workers.find((worker) => worker.id === filerId);
    const filer = filerIsHirer ? quest.hirer : filerWorker;
    const resolvedWorkerId = stringValue(source.resolvedWorkerId) ?? stringValue(source.workerId);
    const resolvedWorker = workers.find((worker) => worker.id === resolvedWorkerId);
    const relatedWorkers = resolvedWorker
      ? [resolvedWorker]
      : filerWorker
        ? [filerWorker]
        : workers;
    const respondent = filerIsHirer ? (relatedWorkers.length === 1 ? relatedWorkers[0] : null) : quest.hirer;
    const respondentName = filerIsHirer
      ? relatedWorkers.map(memberName).filter(Boolean).join(", ")
      : memberName(quest.hirer);
    const existingQuest = record(source.quest) ?? {};

    return {
      ...source,
      ...financialFields,
      quest: {
        ...existingQuest,
        id: quest.id,
        title: quest.title,
        displayId: displayAdminId(quest.displayId, quest.id),
        questStatus: quest.questStatus,
        hirerId: quest.hirer.id,
        hirer: quest.hirer,
        assignments: quest.assignments,
      },
      filerRole: filerIsHirer ? "Hirer" : filerWorker ? "Worker" : source.filerRole,
      filerName: filer ? memberName(filer) : source.filerName,
      ...(filer ? { filer } : {}),
      respondentRole: filerIsHirer ? "Worker" : "Hirer",
      respondentName: respondentName || source.respondentName,
      respondentId: respondent?.id ?? source.respondentId,
      ...(respondent ? { respondent } : {}),
      workerId: resolvedWorker?.id
        ?? filerWorker?.id
        ?? (filerIsHirer && relatedWorkers.length === 1 ? relatedWorkers[0].id : source.workerId),
    };
  });
}

export async function loadDisputeCasePageData(
  cookieHeader?: string,
  cursor?: string,
): Promise<DisputeCasePageData> {
  const statusCursors = cursor ? JSON.parse(cursor) as DisputeCaseStatusCursors : {};
  const statusesToLoad = cursor
    ? disputeCaseStatuses.filter((status) => statusCursors[status])
    : disputeCaseStatuses;
  const pages = await Promise.all(statusesToLoad.map(async (status) => {
    const query: AdminDisputeListQuery = {
      status,
      limit: 50,
      ...(statusCursors[status] ? { cursor: statusCursors[status] } : {}),
    };
    const page = await adminApiProvider.read.listDisputes(
      query,
      adminApiRequestOptions(cookieHeader),
    );
    return { status, page };
  }));
  const nextCursors: DisputeCaseStatusCursors = {};
  for (const { status, page } of pages) {
    if (page.nextCursor) nextCursors[status] = page.nextCursor;
  }
  const records = pages
    .flatMap(({ page }) => page.items)
    .filter((dispute) => disputeCaseModelFromRecord(dispute, "api") !== null)
    .sort((left, right) => timestampValue(record(right)?.createdAt) - timestampValue(record(left)?.createdAt));
  const items = await enrichDisputeCases(records, cookieHeader);
  return {
    source: "api",
    items: disputeCaseModels(items),
    nextCursor: Object.keys(nextCursors).length ? JSON.stringify(nextCursors) : null,
  };
}

export async function loadDisputeCaseDetailFromApi(
  disputeId: string,
  cookieHeader?: string,
): Promise<DisputeCaseModel | null> {
  const dispute = await adminApiProvider.read.getDispute(
    disputeId,
    adminApiRequestOptions(cookieHeader),
  );
  const model = disputeCaseModelFromRecord(dispute, "api");
  if (model?.id !== disputeId) return null;
  const [enriched] = await enrichDisputeCases([dispute], cookieHeader);
  return disputeCaseModelFromRecord(enriched, "api");
}
