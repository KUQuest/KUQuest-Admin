"use client";

import { useAdminShell } from "../../components/admin/admin-shell-context";

export default function Error({ unstable_retry }: { unstable_retry: () => void }) {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback" aria-labelledby="admin-error-title">
      <section className="panel">
        <h1 id="admin-error-title">{translateText("Admin route unavailable")}</h1>
        <p>{translateText("The Admin route could not load. Try again.")}</p>
        <button className="btn primary" type="button" onClick={() => unstable_retry()}>{translateText("Try again")}</button>
      </section>
    </main>
  );
}
