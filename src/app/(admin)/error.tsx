"use client";

import { useAdminShell } from "../../components/admin/admin-shell-context";
import { Button } from "../../components/ui";
import { Card, CardContent, CardHeader } from "../../components/ui/card";

export default function Error({ unstable_retry }: { unstable_retry: () => void }) {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback mx-auto w-full max-w-3xl" aria-labelledby="admin-error-title">
      <Card as="section" className="overflow-hidden">
        <CardHeader><h1 id="admin-error-title" className="text-lg font-semibold">{translateText("Admin route unavailable")}</h1></CardHeader>
        <CardContent className="space-y-4">
          <p>{translateText("The Admin route could not load. Try again.")}</p>
          <Button variant="primary" type="button" onClick={() => unstable_retry()}>{translateText("Try again")}</Button>
        </CardContent>
      </Card>
    </main>
  );
}
