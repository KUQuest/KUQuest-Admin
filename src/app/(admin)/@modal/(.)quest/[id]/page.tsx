import { QuestDetailPage } from "../../../../../features/admin/quest/quest-page";

export default async function QuestModalRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const questId = id.startsWith("(.)") ? id.slice(3) : id;
  return <QuestDetailPage questId={questId} presentation="drawer" />;
}
