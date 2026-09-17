import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isAdminApiEnabled } from "../../../../features/admin/api/admin-provider";
import { QuestDetailPage } from "../../../../features/admin/quest/quest-page";
import { loadQuestDetailPageData } from "../../../../features/admin/quest/quest-service";
import { adminSessionCookieHeader } from "../../../../lib/auth/admin-session-policy";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Quest ${id}` };
}

export default async function QuestRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dataSource = isAdminApiEnabled() ? "api" : "mock";
  const cookieStore = dataSource === "api" ? await cookies() : null;
  const initialData = await loadQuestDetailPageData(
    id,
    cookieStore ? adminSessionCookieHeader(cookieStore.getAll()) : "",
    dataSource,
  );
  if (!initialData) notFound();
  return <QuestDetailPage questId={id} initialData={initialData} dataSource={dataSource} />;
}
