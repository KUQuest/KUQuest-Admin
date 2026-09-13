import { redirect } from "next/navigation";

import { reportRoutes } from "@/features/admin/admin-routes";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  redirect(reportRoutes.detail(id));
}
