import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { AdminDetailRoutePageProps } from "../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../features/admin/api/admin-provider";
import { ConductReportDetail } from "../../../../features/admin/conduct-report/conduct-report-detail";
import { loadConductReportDetailFromApi } from "../../../../features/admin/conduct-report/conduct-report-service";
import { displayAdminId } from "../../../../features/admin/display-admin-id";
import { adminSessionCookieHeader } from "../../../../lib/auth/admin-session-policy";

export async function generateMetadata({ params }: AdminDetailRoutePageProps): Promise<Metadata> {
  const { id } = await params;
  const displayId = displayAdminId(id);
  return { title: displayId ? `Conduct Report ${displayId}` : "Conduct Report" };
}

export default async function ConductReportPage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  if (!isAdminApiEnabled()) return <ConductReportDetail reportId={id} />;

  const cookieStore = await cookies();
  const model = await loadConductReportDetailFromApi(
    id,
    adminSessionCookieHeader(cookieStore.getAll()),
  );
  if (!model) notFound();
  return <ConductReportDetail reportId={id} initialModel={model} />;
}
