import { cookies } from "next/headers";

import { loadOverviewPageData } from "../../../features/admin/overview/overview-service";
import { AdminOverview } from "../../../features/admin/overview/overview";
import { isAdminApiEnabled } from "../../../features/admin/api/admin-provider";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function OverviewPage() {
  if (!isAdminApiEnabled()) return <AdminOverview />;

  const cookieStore = await cookies();
  const initialData = await loadOverviewPageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <AdminOverview initialData={initialData} />;
}
