import type { Metadata } from "next";

import { AdminRoutePage } from "./admin-route-page";

export type AdminDetailRoutePageProps = {
  params: Promise<{ id: string }>;
};

type AdminDetailRouteProps = AdminDetailRoutePageProps & {
  title: string;
  description: string;
};

export async function adminDetailMetadata(
  params: Promise<{ id: string }>,
  title: string,
): Promise<Metadata> {
  const { id } = await params;
  return { title: `${title} ${id}` };
}

export async function AdminDetailRoute({ params, title, description }: AdminDetailRouteProps) {
  const { id } = await params;
  return <AdminRoutePage title={`${title} ${id}`} description={description} detailId={id} />;
}
