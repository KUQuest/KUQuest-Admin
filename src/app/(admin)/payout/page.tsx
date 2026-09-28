import { AdminPayoutPage } from "../../../features/admin/payout/payout-page";
import {
  loadPayoutBoardPageData,
  loadPayoutRouteContext,
} from "../../../features/admin/payout/payout-service";

export default async function PayoutPage() {
  const { dataSource, cookieHeader } = await loadPayoutRouteContext();
  const initialData = await loadPayoutBoardPageData(
    cookieHeader,
    dataSource,
  );

  return <AdminPayoutPage initialData={initialData} dataSource={dataSource} />;
}
