import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { memberTabHref } from "../../../../../features/admin/member/member-model";

type WalletStatementPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WalletStatementPageProps): Promise<Metadata> {
  await params;
  return { title: "Wallet Statement" };
}

export default async function WalletStatementPage({ params }: WalletStatementPageProps) {
  const { id } = await params;
  redirect(memberTabHref(id, "wallet-statement"));
}
