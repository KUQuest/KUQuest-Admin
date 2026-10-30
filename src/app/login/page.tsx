import type { Metadata } from "next";

import { AdminLoginPage } from "@/features/admin/login/admin-login-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the KuQuest administration console.",
};

export default function LoginPage() {
  return <AdminLoginPage />;
}
