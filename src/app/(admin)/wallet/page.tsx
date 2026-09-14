import { AdminWalletPage } from "../../../features/admin/wallet/wallet-page";
import {
  loadWalletBoardPageData,
  loadWalletRouteContext,
} from "../../../features/admin/wallet/wallet-service";

export default async function WalletPage() {
  const { dataSource, cookieHeader } = await loadWalletRouteContext();
  const initialData = await loadWalletBoardPageData(cookieHeader, dataSource);

  return <AdminWalletPage initialData={initialData} />;
}
