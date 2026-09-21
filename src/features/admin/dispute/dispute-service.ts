import type { AdminDisputeListQuery } from "../api/admin-api";
import { adminApiProvider } from "../api/admin-provider";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import {
  disputeCaseModelFromRecord,
  type DisputeCaseModel,
} from "./dispute-model";

export type DisputeCasePageData = {
  source: "api" | "mock";
  items: DisputeCaseModel[];
  nextCursor: string | null;
};

function disputeCaseModels(values: readonly unknown[]): DisputeCaseModel[] {
  return values.flatMap((value) => {
    const model = disputeCaseModelFromRecord(value, "api");
    return model ? [model] : [];
  });
}

export async function loadDisputeCasePageData(
  cookieHeader?: string,
  cursor?: string,
): Promise<DisputeCasePageData> {
  const query: AdminDisputeListQuery = { limit: 50, ...(cursor ? { cursor } : {}) };
  const page = await adminApiProvider.read.listDisputes(
    query,
    adminApiRequestOptions(cookieHeader),
  );
  return {
    source: "api",
    items: disputeCaseModels(page.items),
    nextCursor: page.nextCursor,
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
  return model?.id === disputeId ? model : null;
}
