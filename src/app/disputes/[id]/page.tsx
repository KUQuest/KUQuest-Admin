import { redirect } from "next/navigation";

import { disputeRoutes } from "@/features/admin/admin-routes";

interface DisputePageProps {
  params: Promise<{ id: string }>;
}

export default async function DisputePage({ params }: DisputePageProps) {
  const { id } = await params;
  redirect(disputeRoutes.detail(id));
}
