import { cookies } from "next/headers";

import { ConductReportBoard } from "../../../features/admin/conduct-report/conduct-report-board";
import { loadConductReportPageData } from "../../../features/admin/conduct-report/conduct-report-service";
import { isAdminApiEnabled } from "../../../features/admin/api/admin-provider";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function ConductReportPage() {
  if (!isAdminApiEnabled()) return <ConductReportBoard />;

  const cookieStore = await cookies();
  const initialData = await loadConductReportPageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <ConductReportBoard initialData={initialData} />;
}
