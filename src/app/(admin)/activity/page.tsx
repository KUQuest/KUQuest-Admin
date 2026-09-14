import { cookies } from "next/headers";

import { isAdminApiEnabled } from "../../../features/admin/api/admin-provider";
import { ActivityLogBoard } from "../../../features/admin/activity-log/activity-log-board";
import { loadActivityLogPageData } from "../../../features/admin/activity-log/activity-log-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function ActivityPage() {
  if (!isAdminApiEnabled()) return <ActivityLogBoard />;

  const cookieStore = await cookies();
  try {
    const initialData = await loadActivityLogPageData(
      adminSessionCookieHeader(cookieStore.getAll()),
    );
    return <ActivityLogBoard initialData={initialData} />;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "The Admin API is unavailable.";
    return <ActivityLogBoard initialError={message} />;
  }
}
