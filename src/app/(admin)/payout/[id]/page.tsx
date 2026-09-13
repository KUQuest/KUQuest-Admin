import {
  AdminDetailRoute,
  adminDetailMetadata,
  type AdminDetailRoutePageProps,
} from "../../../../components/admin/admin-detail-route";

export function generateMetadata({ params }: AdminDetailRoutePageProps) {
  return adminDetailMetadata(params, "Payout");
}

export default function PayoutDetailPage({ params }: AdminDetailRoutePageProps) {
  return <AdminDetailRoute params={params} title="Payout" description="Review one Payout through its canonical detail route." />;
}
