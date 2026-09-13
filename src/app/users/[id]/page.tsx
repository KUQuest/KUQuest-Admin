import { redirect } from "next/navigation";

import { memberRoutes } from "@/features/admin/admin-routes";

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  redirect(memberRoutes.detail(id));
}
