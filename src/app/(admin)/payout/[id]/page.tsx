import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminPayoutDetailPage } from "../../../../features/admin/payout/payout-page";
import {
  loadPayoutDetailPageData,
  loadPayoutRouteContext,
} from "../../../../features/admin/payout/payout-service";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PayoutDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Payout ${id}` };
}

export default async function PayoutDetailPage({ params }: PayoutDetailPageProps) {
  const { id } = await params;
  const { dataSource, cookieHeader } = await loadPayoutRouteContext();
  const data = await loadPayoutDetailPageData(
    id,
    cookieHeader,
    dataSource,
  );
  if (!data) notFound();

  return <AdminPayoutDetailPage data={data} dataSource={dataSource} />;
}
