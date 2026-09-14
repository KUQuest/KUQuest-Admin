import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import type { AdminDetailRoutePageProps } from "../../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../../features/admin/api/admin-provider";
import { MemberDrawerRoute } from "../../../../../features/admin/member/member-detail";
import { loadMemberDetailFromApi } from "../../../../../features/admin/member/member-service";
import { adminSessionCookieHeader } from "../../../../../lib/auth/admin-session-policy";

export default async function MemberModalPage({ params }: AdminDetailRoutePageProps) {
  const { id } = await params;
  if (!isAdminApiEnabled()) return <MemberDrawerRoute memberId={id} />;

  const cookieStore = await cookies();
  const model = await loadMemberDetailFromApi(id, adminSessionCookieHeader(cookieStore.getAll()));
  if (!model) notFound();
  return <MemberDrawerRoute memberId={id} initialModel={model} />;
}
