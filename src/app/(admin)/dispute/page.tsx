import { cookies } from "next/headers";

import { isAdminApiEnabled } from "../../../features/admin/api/admin-provider";
import { DisputeCaseBoard } from "../../../features/admin/dispute/dispute-board";
import { loadDisputeCasePageData } from "../../../features/admin/dispute/dispute-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function DisputePage() {
  if (!isAdminApiEnabled()) return <DisputeCaseBoard />;

  const cookieStore = await cookies();
  const initialData = await loadDisputeCasePageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <DisputeCaseBoard initialData={initialData} />;
}
