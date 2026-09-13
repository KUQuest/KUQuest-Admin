import type { Metadata } from "next";

import { AdminRoutePage } from "../../../../features/admin/admin-route-page";

type QuestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: QuestDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Quest ${id}` };
}

export default async function QuestDetailPage({ params }: QuestDetailPageProps) {
  const { id } = await params;
  return <AdminRoutePage title={`Quest ${id}`} description="Review one Quest through its canonical detail route." detailId={id} />;
}
