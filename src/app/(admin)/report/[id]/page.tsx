import {
  AdminDetailRoute,
  adminDetailMetadata,
  type AdminDetailRoutePageProps,
} from "../../../../components/admin/admin-detail-route";

export function generateMetadata({ params }: AdminDetailRoutePageProps) {
  return adminDetailMetadata(params, "Report Case");
}

export default function ReportDetailPage({ params }: AdminDetailRoutePageProps) {
  return <AdminDetailRoute params={params} title="Report Case" description="Review one Report Case through its canonical detail route." />;
}
