"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { AdminLanguage } from "../../features/admin/language/admin-language";

type AdminShellContextValue = {
  language: AdminLanguage;
  translateText: (value: string) => string;
};

const defaultAdminShellContext: AdminShellContextValue = {
  language: "en",
  translateText: (value) => value,
};

const AdminShellContext = createContext<AdminShellContextValue>(defaultAdminShellContext);

export function AdminShellProvider({
  language,
  translateText,
  children,
}: AdminShellContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ language, translateText }), [language, translateText]);
  return (
    <AdminShellContext.Provider value={value}>
      {children}
    </AdminShellContext.Provider>
  );
}

export function useAdminShell(): AdminShellContextValue {
  return useContext(AdminShellContext);
}
