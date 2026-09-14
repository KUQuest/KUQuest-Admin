import { redirect } from "next/navigation";

import "../admin-extensions.css";
import "../dispute-page.css";
import "../quest-page.css";
import "../report-page.css";

import { AdminShell } from "../../components/admin/admin-shell";
import { ForbiddenPage } from "../../components/admin/forbidden-page";
import { getAdminSession } from "../../lib/auth/admin-session";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const session = await getAdminSession();
  if (session.kind === "missing") redirect("/login");
  if (session.kind === "forbidden") return <ForbiddenPage />;
  if (session.kind === "unavailable") throw session.error;

  return <AdminShell identity={session.identity}>{children}</AdminShell>;
}
