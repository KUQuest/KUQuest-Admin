import { cookies } from "next/headers";

import { AdminWalletPage } from "../../../features/admin/wallet/wallet-page";
import { loadWalletBoardPageData } from "../../../features/admin/wallet/wallet-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function WalletPage() {
  const cookieStore = await cookies();
  const cookieHeader = adminSessionCookieHeader(cookieStore.getAll());
  const initialData = await loadWalletBoardPageData(cookieHeader);

  return <AdminWalletPage initialData={initialData} />;
}
