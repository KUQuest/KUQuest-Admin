import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { AdminDetailRoutePageProps } from "../../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../../features/admin/api/admin-provider";
import { ReportCaseDrawerRoute } from "../../../../../features/admin/report/report-detail";
import { loadReportCaseDetailFromApi } from "../../../../../features/admin/report/report-service";
import { adminSessionCookieHeader } from "../../../../../lib/auth/admin-session-policy";

export default async function ReportCaseModalPage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  if (!isAdminApiEnabled()) return <ReportCaseDrawerRoute reportId={id} />;

  const cookieStore = await cookies();
  const model = await loadReportCaseDetailFromApi(
    id,
    adminSessionCookieHeader(cookieStore.getAll()),
  );
  if (!model) notFound();
  return <ReportCaseDrawerRoute reportId={id} initialModel={model} />;
}
