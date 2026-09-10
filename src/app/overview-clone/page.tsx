import { LegacyAdminPage } from "@/features/admin/legacy-admin-page";

export const metadata = {
  title: "Overview preview",
};

export default function OverviewClonePage() {
  return <LegacyAdminPage page="home" reactDashboard dashboardVariant="clone" />;
}
