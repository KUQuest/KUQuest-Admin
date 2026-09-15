import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { questRoutes } from "@/features/admin/admin-routes";

interface QuestPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: QuestPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Quest ${id}` };
}

export default async function QuestPage({ params }: QuestPageProps) {
  const { id } = await params;
  redirect(questRoutes.detail(id));
}
