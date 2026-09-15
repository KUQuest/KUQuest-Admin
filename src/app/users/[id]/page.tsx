import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { memberTabFrom, memberTabHref } from "@/features/admin/member/member-model";

interface UserPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `User ${id}` };
}

export default async function UserPage({ params, searchParams }: UserPageProps) {
  const { id } = await params;
  const values = await searchParams;
  const rawTab = values.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  redirect(memberTabHref(id, memberTabFrom(tab)));
}
