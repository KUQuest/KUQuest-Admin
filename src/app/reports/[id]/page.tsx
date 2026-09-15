import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { reportRoutes } from "@/features/admin/admin-routes";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Report ${id}` };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  redirect(reportRoutes.detail(id));
}
