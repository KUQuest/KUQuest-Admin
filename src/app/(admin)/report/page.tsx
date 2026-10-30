import { cookies } from "next/headers";

import { ReportCaseBoard } from "../../../features/admin/report/report-board";
import { loadReportCasePageData } from "../../../features/admin/report/report-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function ReportPage() {
  const cookieStore = await cookies();
  const initialData = await loadReportCasePageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <ReportCaseBoard initialData={initialData} />;
}
