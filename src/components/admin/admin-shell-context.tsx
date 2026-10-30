"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { AdminLanguage } from "../../features/admin/language/admin-language";

type AdminShellContextValue = {
  language: AdminLanguage;
  translateText: (value: string) => string;
  openGlobalSearch: () => void;
};

const defaultAdminShellContext: AdminShellContextValue = {
  language: "en",
  translateText: (value) => value,
  openGlobalSearch: () => undefined,
};

const AdminShellContext = createContext<AdminShellContextValue>(defaultAdminShellContext);

export function AdminShellProvider({
  language,
  translateText,
  openGlobalSearch,
  children,
}: AdminShellContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ language, translateText, openGlobalSearch }), [language, openGlobalSearch, translateText]);
  return (
    <AdminShellContext.Provider value={value}>
      {children}
    </AdminShellContext.Provider>
  );
}

export function useAdminShell(): AdminShellContextValue {
  return useContext(AdminShellContext);
}
