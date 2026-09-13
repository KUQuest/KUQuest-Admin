import type { Metadata } from "next";

import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";

interface QuestPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: QuestPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Quest ${id}` };
}

export default async function QuestPage({ params }: QuestPageProps) {
  const { id } = await params;
  return <LegacyAdminPage page="quest" recordId={id} />;
}
