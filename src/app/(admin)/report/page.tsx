import { cookies } from "next/headers";

import { isAdminApiEnabled } from "../../../features/admin/api/admin-provider";
import { ReportCaseBoard } from "../../../features/admin/report/report-board";
import { loadReportCasePageData } from "../../../features/admin/report/report-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function ReportPage() {
  if (!isAdminApiEnabled()) return <ReportCaseBoard />;

  const cookieStore = await cookies();
  const initialData = await loadReportCasePageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <ReportCaseBoard initialData={initialData} />;
}
