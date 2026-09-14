import { notFound } from "next/navigation";

import { AdminPayoutDetailPage } from "../../../../../features/admin/payout/payout-page";
import {
  loadPayoutDetailPageData,
  loadPayoutRouteContext,
} from "../../../../../features/admin/payout/payout-service";

type PayoutDrawerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayoutDrawerPage({ params }: PayoutDrawerPageProps) {
  const { id } = await params;
  const { dataSource, cookieHeader } = await loadPayoutRouteContext();
  const data = await loadPayoutDetailPageData(
    id,
    cookieHeader,
    dataSource,
  );
  if (!data) notFound();

  return <AdminPayoutDetailPage data={data} dataSource={dataSource} presentation="drawer" />;
}
