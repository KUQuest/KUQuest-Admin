import type { Metadata } from "next";

import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";

interface DisputePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DisputePageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Dispute ${id}` };
}

export default async function DisputePage({ params }: DisputePageProps) {
  const { id } = await params;
  return <LegacyAdminPage page="dispute" recordId={id} />;
}
