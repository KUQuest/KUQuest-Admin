"use client";

import Link from "next/link";

import { useAdminShell } from "./admin-shell-context";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";

export function ForbiddenPage() {
  const { translateText } = useAdminShell();
  return (
    <main className="admin-feedback mx-auto w-full max-w-3xl" aria-labelledby="forbidden-title">
      <Card as="section" className="overflow-hidden">
        <CardHeader><h1 id="forbidden-title" className="text-lg font-semibold">{translateText("Forbidden")}</h1></CardHeader>
        <CardContent className="space-y-4">
          <p>{translateText("This Admin account is disabled and cannot access the Admin console.")}</p>
          <Button asChild variant="outline"><Link href="/login">{translateText("Return to login")}</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
