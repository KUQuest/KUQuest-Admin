import { redirect } from "next/navigation";

import { ForbiddenPage } from "@/components/admin/forbidden-page";
import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";
import { getAdminSession } from "@/lib/auth/admin-session";
import { isLegacyAdminUrl } from "@/lib/auth/admin-routing";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const values = await searchParams;
  const url = new URL("https://admin.example.test/");
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") url.searchParams.set(key, value);
    else if (Array.isArray(value)) value.forEach((entry) => url.searchParams.append(key, entry));
  }

  if (!isLegacyAdminUrl(url)) redirect("/overview");

  const session = await getAdminSession();
  if (session.kind === "missing") redirect("/login");
  if (session.kind === "forbidden") return <ForbiddenPage />;
  if (session.kind === "unavailable") throw session.error;

  const view = firstQueryValue(values.view);
  return <LegacyAdminPage page="home" activeView={view} reactDashboard={!view || view === "home"} />;
}
