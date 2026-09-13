"use client";

export default function Error({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <main className="admin-feedback" aria-labelledby="admin-error-title">
      <section className="panel">
        <h1 id="admin-error-title">Admin route unavailable</h1>
        <p>The Admin route could not load. Try again.</p>
        <button className="btn primary" type="button" onClick={() => unstable_retry()}>Try again</button>
      </section>
    </main>
  );
}
