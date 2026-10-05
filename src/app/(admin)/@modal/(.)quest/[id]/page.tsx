import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { QuestDetailPage } from "../../../../../features/admin/quest/quest-page";
import { loadQuestDetailPageData } from "../../../../../features/admin/quest/quest-service";
import { adminSessionCookieHeader } from "../../../../../lib/auth/admin-session-policy";

export default async function QuestModalRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const questId = id.startsWith("(.)") ? id.slice(3) : id;
  const cookieStore = await cookies();
  const initialData = await loadQuestDetailPageData(questId, adminSessionCookieHeader(cookieStore.getAll()));
  if (!initialData) notFound();
  return <QuestDetailPage questId={questId} presentation="drawer" initialData={initialData} />;
}
