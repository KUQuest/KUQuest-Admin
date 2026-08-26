import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";

interface HomePageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  await searchParams;
  return <LegacyAdminPage page="home" />;
}
