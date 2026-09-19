"use client";

import { useAdminShell } from "./admin-shell-context";
import { Card, CardContent, CardHeader } from "../ui/card";

export function AdminLoading({ message = "Loading Admin route…" }: { message?: string }) {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback mx-auto w-full max-w-3xl" aria-busy="true">
      <Card as="section" className="overflow-hidden">
        <CardContent><p>{translateText(message)}</p></CardContent>
      </Card>
    </main>
  );
}

export function AdminNotFound() {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback mx-auto w-full max-w-3xl" aria-labelledby="not-found-title">
      <Card as="section" className="overflow-hidden">
        <CardHeader><h1 id="not-found-title" className="text-lg font-semibold">{translateText("Not found")}</h1></CardHeader>
        <CardContent><p>{translateText("The requested Admin record was not found.")}</p></CardContent>
      </Card>
    </main>
  );
}
