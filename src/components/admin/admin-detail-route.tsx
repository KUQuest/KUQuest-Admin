import type { Metadata } from "next";

import { AdminRoutePage } from "./admin-route-page";
import { displayAdminId } from "../../features/admin/display-admin-id";

export type AdminDetailRoutePageProps = {
  params: Promise<{ id: string }>;
};

type AdminDetailRouteProps = AdminDetailRoutePageProps & {
  title: string;
  description: string;
};

export async function adminDetailMetadata(params: Promise<{ id: string }>, title: string): Promise<Metadata> {
  const { id } = await params;
  const displayId = displayAdminId(id);
  return { title: displayId ? `${title} ${displayId}` : title };
}

export async function AdminDetailRoute({ params, title, description }: AdminDetailRouteProps) {
  const { id } = await params;
  return <AdminRoutePage title={title} description={description} detailId={displayAdminId(id) ?? undefined} />;
}
