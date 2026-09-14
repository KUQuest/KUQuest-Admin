import type { Metadata } from "next";

import { AdminWalletStatementPage } from "../../../../../features/admin/wallet/wallet-statement-page";
import {
  loadWalletRouteContext,
  loadWalletStatementPageData,
} from "../../../../../features/admin/wallet/wallet-service";

type WalletStatementPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WalletStatementPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Wallet Statement ${id}` };
}

export default async function WalletStatementPage({ params }: WalletStatementPageProps) {
  const { id } = await params;
  const { dataSource, cookieHeader } = await loadWalletRouteContext();
  const data = await loadWalletStatementPageData(id, cookieHeader, dataSource);

  return <AdminWalletStatementPage data={data} />;
}
