import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { isAdminApiEnabled } from "../../../../../features/admin/api/admin-provider";
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
  const dataSource = isAdminApiEnabled() ? "api" : "mock";
  const cookieStore = dataSource === "api" ? await cookies() : null;
  const initialData = await loadQuestDetailPageData(
    questId,
    cookieStore ? adminSessionCookieHeader(cookieStore.getAll()) : "",
    dataSource,
  );
  if (!initialData) notFound();
  return <QuestDetailPage questId={questId} presentation="drawer" initialData={initialData} />;
}
