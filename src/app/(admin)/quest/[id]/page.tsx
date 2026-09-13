import type { Metadata } from "next";

import { QuestDetailPage } from "../../../../features/admin/quest/quest-page";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Quest ${id}` };
}

export default async function QuestRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuestDetailPage questId={id} />;
}
