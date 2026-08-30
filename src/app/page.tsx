import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";

interface HomePageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { view } = await searchParams;
  return <LegacyAdminPage page="home" reactDashboard={!view} />;
}
