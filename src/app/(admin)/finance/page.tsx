import { cookies } from "next/headers";

import { AdminFinancePage } from "../../../features/admin/finance/finance-page";
import { loadFinancePageData } from "../../../features/admin/finance/finance-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function FinancePage() {
  const cookieStore = await cookies();
  const cookieHeader = adminSessionCookieHeader(cookieStore.getAll());
  const initialData = await loadFinancePageData(cookieHeader);
  return <AdminFinancePage initialData={initialData} />;
}
