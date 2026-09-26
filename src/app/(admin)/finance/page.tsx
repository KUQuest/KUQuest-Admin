import { AdminFinancePage } from "../../../features/admin/finance/finance-page";
import { loadFinancePageData, loadFinanceRouteContext } from "../../../features/admin/finance/finance-service";

export default async function FinancePage() {
  const { dataSource, cookieHeader } = await loadFinanceRouteContext();
  const initialData = await loadFinancePageData(cookieHeader, dataSource);
  return <AdminFinancePage initialData={initialData} />;
}
