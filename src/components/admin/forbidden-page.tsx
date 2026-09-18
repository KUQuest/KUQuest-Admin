"use client";

import Link from "next/link";

import { useAdminShell } from "./admin-shell-context";

export function ForbiddenPage() {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback" aria-labelledby="forbidden-title">
      <section className="panel">
        <h1 id="forbidden-title">{translateText("Forbidden")}</h1>
        <p>{translateText("This Admin account is disabled and cannot access the Admin console.")}</p>
        <Link className="link" href="/login">{translateText("Return to login")}</Link>
      </section>
    </main>
  );
}
