"use client";

import { useAdminShell } from "./admin-shell-context";

export function AdminLoading({ message = "Loading Admin route…" }: { message?: string }) {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback" aria-busy="true">
      <section className="panel"><p>{translateText(message)}</p></section>
    </main>
  );
}

export function AdminNotFound() {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback" aria-labelledby="not-found-title">
      <section className="panel">
        <h1 id="not-found-title">{translateText("Not found")}</h1>
        <p>{translateText("The requested Admin record was not found.")}</p>
      </section>
    </main>
  );
}
