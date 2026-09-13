import {
  AdminDetailRoute,
  adminDetailMetadata,
  type AdminDetailRoutePageProps,
} from "../../../../components/admin/admin-detail-route";

export function generateMetadata({ params }: AdminDetailRoutePageProps) {
  return adminDetailMetadata(params, "Quest");
}

export default function QuestDetailPage({ params }: AdminDetailRoutePageProps) {
  return <AdminDetailRoute params={params} title="Quest" description="Review one Quest through its canonical detail route." />;
}
