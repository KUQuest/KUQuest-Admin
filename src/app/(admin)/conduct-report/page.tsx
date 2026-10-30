import { cookies } from "next/headers";

import { ConductReportBoard } from "../../../features/admin/conduct-report/conduct-report-board";
import { loadConductReportPageData } from "../../../features/admin/conduct-report/conduct-report-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function ConductReportPage() {
  const cookieStore = await cookies();
  const initialData = await loadConductReportPageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <ConductReportBoard initialData={initialData} />;
}
