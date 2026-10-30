import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuestDetailPage } from "../../../../features/admin/quest/quest-page";
import { loadQuestDetailPageData } from "../../../../features/admin/quest/quest-service";
import { displayAdminId } from "../../../../features/admin/display-admin-id";
import { adminSessionCookieHeader } from "../../../../lib/auth/admin-session-policy";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const displayId = displayAdminId(id);
  return { title: displayId ? `Quest ${displayId}` : "Quest" };
}

export default async function QuestRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const initialData = await loadQuestDetailPageData(id, adminSessionCookieHeader(cookieStore.getAll()));
  if (!initialData) notFound();
  return <QuestDetailPage questId={id} initialData={initialData} />;
}
