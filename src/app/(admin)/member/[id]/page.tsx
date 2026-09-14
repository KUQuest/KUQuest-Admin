import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import {
  adminDetailMetadata,
  type AdminDetailRoutePageProps,
} from "../../../../components/admin/admin-detail-route";
import { isAdminApiEnabled } from "../../../../features/admin/api/admin-provider";
import { MemberDetail } from "../../../../features/admin/member/member-detail";
import { memberTabFrom } from "../../../../features/admin/member/member-model";
import { loadMemberDetailFromApi } from "../../../../features/admin/member/member-service";
import { adminSessionCookieHeader } from "../../../../lib/auth/admin-session-policy";

type MemberPageProps = AdminDetailRoutePageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateMetadata({ params }: AdminDetailRoutePageProps) {
  return adminDetailMetadata(params, "Member");
}

export default async function MemberDetailPage({ params, searchParams }: MemberPageProps) {
  const { id } = await params;
  const values = await searchParams;
  const rawTab = values.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  if (!isAdminApiEnabled()) {
    return <MemberDetail memberId={id} initialTab={memberTabFrom(tab)} />;
  }

  const cookieStore = await cookies();
  const model = await loadMemberDetailFromApi(id, adminSessionCookieHeader(cookieStore.getAll()));
  if (!model) notFound();
  return <MemberDetail memberId={id} initialModel={model} initialTab={memberTabFrom(tab)} />;
}
