import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AdminPayoutDetailPage } from "../../../../../features/admin/payout/payout-page";
import { loadPayoutDetailPageData } from "../../../../../features/admin/payout/payout-service";
import { adminSessionCookieHeader } from "../../../../../lib/auth/admin-session-policy";

type PayoutDrawerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayoutDrawerPage({ params }: PayoutDrawerPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = adminSessionCookieHeader(cookieStore.getAll());
  const data = await loadPayoutDetailPageData(id, cookieHeader);
  if (!data) notFound();

  return <AdminPayoutDetailPage data={data} presentation="drawer" />;
}
