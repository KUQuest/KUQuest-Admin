import { cookies } from "next/headers";

import { isAdminApiEnabled } from "../../../features/admin/api/admin-provider";
import { AdminQuestPage } from "../../../features/admin/quest/quest-page";
import { loadQuestBoardPageData } from "../../../features/admin/quest/quest-service";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";

export default async function QuestPage() {
  const dataSource = isAdminApiEnabled() ? "api" : "mock";
  const cookieStore = dataSource === "api" ? await cookies() : null;
  const initialData = await loadQuestBoardPageData(
    cookieStore ? adminSessionCookieHeader(cookieStore.getAll()) : "",
    dataSource,
  );
  return <AdminQuestPage initialData={initialData} dataSource={dataSource} />;
}
