import { AdminTopUpsPage } from "../../../features/admin/finance/top-ups-page";
import { loadFinanceRouteContext, loadTopUpPageData } from "../../../features/admin/finance/finance-service";

export default async function TopUpsPage() {
  const { dataSource, cookieHeader } = await loadFinanceRouteContext();
  const initialData = await loadTopUpPageData(cookieHeader, dataSource);
  return <AdminTopUpsPage initialData={initialData} />;
}
