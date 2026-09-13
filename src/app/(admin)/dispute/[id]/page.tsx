import {
  AdminDetailRoute,
  adminDetailMetadata,
  type AdminDetailRoutePageProps,
} from "../../../../components/admin/admin-detail-route";

export function generateMetadata({ params }: AdminDetailRoutePageProps) {
  return adminDetailMetadata(params, "Dispute Case");
}

export default function DisputeDetailPage({ params }: AdminDetailRoutePageProps) {
  return <AdminDetailRoute params={params} title="Dispute Case" description="Review one Dispute Case through its canonical detail route." />;
}
