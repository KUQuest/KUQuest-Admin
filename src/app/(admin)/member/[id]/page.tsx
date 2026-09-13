import type { Metadata } from "next";

import { AdminRoutePage } from "../../../../features/admin/admin-route-page";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: MemberDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Member ${id}` };
}

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = await params;
  return <AdminRoutePage title={`Member ${id}`} description="Review one Member through its canonical detail route." detailId={id} />;
}
