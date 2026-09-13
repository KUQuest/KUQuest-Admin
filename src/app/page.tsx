import { redirect } from "next/navigation";

import { canonicalRouteForLegacyUrl } from "@/lib/auth/admin-routing";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const values = await searchParams;
  const url = new URL("https://admin.example.test/");
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") url.searchParams.set(key, value);
    else if (Array.isArray(value)) value.forEach((entry) => url.searchParams.append(key, entry));
  }

  redirect(canonicalRouteForLegacyUrl(url) ?? "/overview");
}
