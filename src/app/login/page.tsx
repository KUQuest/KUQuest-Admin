import type { Metadata } from "next";

import { LegacyLoginPage } from "@/features/admin/legacy-admin-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the KuQuest administration console.",
};

export default function LoginPage() {
  return <LegacyLoginPage />;
}
