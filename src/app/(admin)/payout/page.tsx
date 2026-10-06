import { cookies } from "next/headers";

import { AdminPayoutPage } from "../../../features/admin/payout/payout-page";
import { loadPayoutBoardPageData } from "../../../features/admin/payout/payout-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function PayoutPage() {
  const cookieStore = await cookies();
  const cookieHeader = adminSessionCookieHeader(cookieStore.getAll());
  const initialData = await loadPayoutBoardPageData(cookieHeader);

  return <AdminPayoutPage initialData={initialData} />;
}
