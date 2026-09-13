import type { Metadata } from "next";
import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Report ${id}` };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  return <LegacyAdminPage page="report" recordId={id} />;
}
