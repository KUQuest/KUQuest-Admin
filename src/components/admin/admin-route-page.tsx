import { AdminBoardCard } from "./admin-board-card";
import { AdminPageHeader } from "./admin-page-header";

export type AdminRoutePageProps = {
  title: string;
  description: string;
  detailId?: string;
};

export function AdminRoutePage({ title, description, detailId }: AdminRoutePageProps) {
  return (
    <main className="admin-route-page" tabIndex={-1}>
      <AdminPageHeader title={title} description={description} />
      <AdminBoardCard aria-label={`${title} route boundary`} className="p-5">
        <h2 className="text-base font-semibold">{detailId ? "Detail route" : "Route boundary"}</h2>
        <p className="mt-1 text-sm text-admin-muted">{detailId ? `Record ${detailId} has a canonical filesystem route.` : "This canonical route has an explicit filesystem owner."}</p>
      </AdminBoardCard>
    </main>
  );
}
