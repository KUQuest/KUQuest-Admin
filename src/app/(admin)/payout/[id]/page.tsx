import type { Metadata } from "next";

import { AdminRoutePage } from "../../../../features/admin/admin-route-page";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PayoutDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Payout ${id}` };
}

export default async function PayoutDetailPage({ params }: PayoutDetailPageProps) {
  const { id } = await params;
  return <AdminRoutePage title={`Payout ${id}`} description="Review one Payout through its canonical detail route." detailId={id} />;
}
