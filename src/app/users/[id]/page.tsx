import type { Metadata } from "next";

import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `User ${id}` };
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  return <LegacyAdminPage page="user" recordId={id} />;
}
