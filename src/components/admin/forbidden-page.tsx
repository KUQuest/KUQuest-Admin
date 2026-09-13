import Link from "next/link";

export function ForbiddenPage() {
  return (
    <main className="admin-feedback" aria-labelledby="forbidden-title">
      <section className="panel">
        <h1 id="forbidden-title">Forbidden</h1>
        <p>This Admin account is disabled and cannot access the Admin console.</p>
        <Link className="link" href="/login">Return to login</Link>
      </section>
    </main>
  );
}
