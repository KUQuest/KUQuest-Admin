export function AdminLoading({ message = "Loading Admin route…" }: { message?: string }) {
  return (
    <main className="admin-feedback" aria-busy="true">
      <section className="panel"><p>{message}</p></section>
    </main>
  );
}

export function AdminNotFound() {
  return (
    <main className="admin-feedback" aria-labelledby="not-found-title">
      <section className="panel">
        <h1 id="not-found-title">Not found</h1>
        <p>The requested Admin record was not found.</p>
      </section>
    </main>
  );
}
