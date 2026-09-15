import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { disputeRoutes } from "@/features/admin/admin-routes";

interface DisputePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DisputePageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Dispute ${id}` };
}

export default async function DisputePage({ params }: DisputePageProps) {
  const { id } = await params;
  redirect(disputeRoutes.detail(id));
}
