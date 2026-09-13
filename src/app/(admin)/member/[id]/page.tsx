import {
  AdminDetailRoute,
  adminDetailMetadata,
  type AdminDetailRoutePageProps,
} from "../../../../components/admin/admin-detail-route";

export function generateMetadata({ params }: AdminDetailRoutePageProps) {
  return adminDetailMetadata(params, "Member");
}

export default function MemberDetailPage({ params }: AdminDetailRoutePageProps) {
  return <AdminDetailRoute params={params} title="Member" description="Review one Member through its canonical detail route." />;
}
