import type { Metadata } from "next";

import { AdminRoutePage } from "../../../../features/admin/admin-route-page";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ReportDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Report Case ${id}` };
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = await params;
  return <AdminRoutePage title={`Report Case ${id}`} description="Review one Report Case through its canonical detail route." detailId={id} />;
}
