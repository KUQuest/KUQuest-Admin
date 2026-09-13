export type AdminRoutePageProps = {
  title: string;
  description: string;
  detailId?: string;
};

export function AdminRoutePage({ title, description, detailId }: AdminRoutePageProps) {
  return (
    <main className="admin-route-page" tabIndex={-1}>
      <div className="page-head">
        <div>
          <p className="admin-route-kicker">KUQuest Admin</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <section className="panel" aria-label={`${title} route boundary`}>
        <h2>{detailId ? "Detail route" : "Route boundary"}</h2>
        <p>{detailId ? `Record ${detailId} has a canonical filesystem route.` : "This canonical route has an explicit filesystem owner."}</p>
      </section>
    </main>
  );
}
