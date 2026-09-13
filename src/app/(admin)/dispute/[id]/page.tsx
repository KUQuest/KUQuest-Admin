import type { Metadata } from "next";

import { AdminRoutePage } from "../../../../features/admin/admin-route-page";

type DisputeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: DisputeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Dispute Case ${id}` };
}

export default async function DisputeDetailPage({ params }: DisputeDetailPageProps) {
  const { id } = await params;
  return <AdminRoutePage title={`Dispute Case ${id}`} description="Review one Dispute Case through its canonical detail route." detailId={id} />;
}
