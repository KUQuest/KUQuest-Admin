import { redirect } from "next/navigation";

import { questRoutes } from "@/features/admin/admin-routes";

interface QuestPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuestPage({ params }: QuestPageProps) {
  const { id } = await params;
  redirect(questRoutes.detail(id));
}
