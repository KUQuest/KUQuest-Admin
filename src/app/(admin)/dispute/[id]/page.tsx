import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { AdminDetailRoutePageProps } from "../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../features/admin/api/admin-provider";
import { DisputeCaseDetail } from "../../../../features/admin/dispute/dispute-detail";
import { loadDisputeCaseDetailFromApi } from "../../../../features/admin/dispute/dispute-service";
import { adminSessionCookieHeader } from "../../../../lib/auth/admin-session-policy";

export async function generateMetadata({ params }: AdminDetailRoutePageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Dispute Case ${id}` };
}

export default async function DisputeCasePage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  if (!isAdminApiEnabled()) return <DisputeCaseDetail disputeId={id} />;

  const cookieStore = await cookies();
  const model = await loadDisputeCaseDetailFromApi(id, adminSessionCookieHeader(cookieStore.getAll()));
  if (!model) notFound();
  return <DisputeCaseDetail disputeId={id} initialModel={model} />;
}
