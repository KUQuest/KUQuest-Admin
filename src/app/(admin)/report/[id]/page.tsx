import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import {
  adminDetailMetadata,
  type AdminDetailRoutePageProps,
} from "../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../features/admin/api/admin-provider";
import { ReportCaseDetail } from "../../../../features/admin/report/report-detail";
import { loadReportCaseDetailFromApi } from "../../../../features/admin/report/report-service";
import { adminSessionCookieHeader } from "../../../../lib/auth/admin-session-policy";

export function generateMetadata({ params }: AdminDetailRoutePageProps) {
  return adminDetailMetadata(params, "Report Case");
}

export default async function ReportDetailPage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  if (!isAdminApiEnabled()) return <ReportCaseDetail reportId={id} />;

  const cookieStore = await cookies();
  const model = await loadReportCaseDetailFromApi(
    id,
    adminSessionCookieHeader(cookieStore.getAll()),
  );
  if (!model) notFound();
  return <ReportCaseDetail reportId={id} initialModel={model} />;
}
