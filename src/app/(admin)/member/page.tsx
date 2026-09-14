import { cookies } from "next/headers";

import { isAdminApiEnabled } from "../../../features/admin/api/admin-provider";
import { MemberBoard } from "../../../features/admin/member/member-board";
import { loadMemberPageData } from "../../../features/admin/member/member-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function MemberPage() {
  if (!isAdminApiEnabled()) return <MemberBoard />;

  const cookieStore = await cookies();
  const initialData = await loadMemberPageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <MemberBoard initialData={initialData} />;
}
