import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { AdminDetailRoutePageProps } from "../../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../../features/admin/api/admin-provider";
import { DisputeCaseDrawerRoute } from "../../../../../features/admin/dispute/dispute-detail";
import { loadDisputeCaseDetailFromApi } from "../../../../../features/admin/dispute/dispute-service";
import { adminSessionCookieHeader } from "../../../../../lib/auth/admin-session-policy";

export default async function DisputeCaseModalPage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  if (!isAdminApiEnabled()) return <DisputeCaseDrawerRoute disputeId={id} />;

  const cookieStore = await cookies();
  const model = await loadDisputeCaseDetailFromApi(id, adminSessionCookieHeader(cookieStore.getAll()));
  if (!model) notFound();
  return <DisputeCaseDrawerRoute disputeId={id} initialModel={model} />;
}
