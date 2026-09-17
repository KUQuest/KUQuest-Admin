import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { AdminDetailRoutePageProps } from "../../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../../features/admin/api/admin-provider";
import { ConductReportDrawerRoute } from "../../../../../features/admin/conduct-report/conduct-report-detail";
import { loadConductReportDetailFromApi } from "../../../../../features/admin/conduct-report/conduct-report-service";
import { adminSessionCookieHeader } from "../../../../../lib/auth/admin-session-policy";

export default async function ConductReportModalPage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  if (!isAdminApiEnabled()) return <ConductReportDrawerRoute reportId={id} />;

  const cookieStore = await cookies();
  const model = await loadConductReportDetailFromApi(id, adminSessionCookieHeader(cookieStore.getAll()));
  if (!model) notFound();
  return <ConductReportDrawerRoute reportId={id} initialModel={model} />;
}
