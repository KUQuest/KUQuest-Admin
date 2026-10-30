import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminPayoutDetailPage } from "../../../../features/admin/payout/payout-page";
import { loadPayoutDetailPageData } from "../../../../features/admin/payout/payout-service";
import { displayAdminId } from "../../../../features/admin/display-admin-id";
import { adminSessionCookieHeader } from "../../../../lib/auth/admin-session-policy";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PayoutDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const displayId = displayAdminId(id);
  return { title: displayId ? `Payout ${displayId}` : "Payout" };
}

export default async function PayoutDetailPage({ params }: PayoutDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = adminSessionCookieHeader(cookieStore.getAll());
  const data = await loadPayoutDetailPageData(id, cookieHeader);
  if (!data) notFound();

  return <AdminPayoutDetailPage data={data} />;
}
