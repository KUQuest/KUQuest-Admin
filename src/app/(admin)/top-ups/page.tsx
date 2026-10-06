import { cookies } from "next/headers";

import { AdminTopUpsPage } from "../../../features/admin/finance/top-ups-page";
import { loadTopUpPageData } from "../../../features/admin/finance/finance-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function TopUpsPage() {
  const cookieStore = await cookies();
  const cookieHeader = adminSessionCookieHeader(cookieStore.getAll());
  const initialData = await loadTopUpPageData(cookieHeader);
  return <AdminTopUpsPage initialData={initialData} />;
}
