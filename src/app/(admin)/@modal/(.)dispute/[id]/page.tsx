import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { AdminDetailRoutePageProps } from "../../../../../components/admin/admin-detail-route";
import { DisputeCaseDrawerRoute } from "../../../../../features/admin/dispute/dispute-detail";
import { loadDisputeCaseDetailFromApi } from "../../../../../features/admin/dispute/dispute-service";
import { adminSessionCookieHeader } from "../../../../../lib/auth/admin-session-policy";

export default async function DisputeCaseModalPage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const model = await loadDisputeCaseDetailFromApi(id, adminSessionCookieHeader(cookieStore.getAll()));
  if (!model) notFound();
  return <DisputeCaseDrawerRoute disputeId={id} initialModel={model} />;
}
