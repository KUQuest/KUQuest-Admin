import type { LegacyAdminRuntime } from "./runtime";

type SearchParameters = Pick<URLSearchParams, "get">;

export function applyRequestedLegacyRecords(
  search: SearchParameters,
  runtime: LegacyAdminRuntime,
  schedule: (callback: FrameRequestCallback) => number,
): void {
  const requestedDispute = search.get("openDispute");
  if (requestedDispute) {
    const disputeIndex = runtime.data.disputes.findIndex(
      (dispute) => dispute.id === requestedDispute,
    );
    if (disputeIndex >= 0) {
      runtime.navigate("disputes");
      schedule(() => runtime.ensureDetailDrawer("disputes", disputeIndex));
    }
  }

  const requestedUser = search.get("openUser");
  if (!requestedUser) return;
  const userIndex = runtime.data.users.findIndex((user) => user.id === requestedUser);
  if (userIndex < 0) return;
  runtime.navigate("users");
  schedule(() => runtime.openDrawer("users", userIndex));
}
