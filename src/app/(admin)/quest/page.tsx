import { cookies } from "next/headers";

import { AdminQuestPage } from "../../../features/admin/quest/quest-page";
import { loadQuestBoardPageData } from "../../../features/admin/quest/quest-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function QuestPage() {
  const cookieStore = await cookies();
  const initialData = await loadQuestBoardPageData(adminSessionCookieHeader(cookieStore.getAll()));
  return <AdminQuestPage initialData={initialData} />;
}
