"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ChevronDown } from "lucide-react";

import {
  normalizeAdminTheme,
  themeDatasetValue,
  themeDefinitions,
  THEME_STORAGE_KEY,
  type AdminTheme,
} from "../../features/admin/theme/theme-model";
import { Button } from "../ui/button";

type AdminThemeControlProps = {
  translateText?: (value: string) => string;
};

const identityText = (value: string): string => value;

const themeSwatchClasses: Record<AdminTheme, string> = {
  grey: "bg-[var(--theme-preview-grey)]",
  green: "bg-[var(--theme-preview-green)]",
  dark: "bg-[var(--theme-preview-dark)]",
};

function storedTheme(): AdminTheme {
  try {
    return normalizeAdminTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "grey";
  }
}

function applyTheme(theme: AdminTheme) {
  const datasetValue = themeDatasetValue(theme);
  if (datasetValue) document.documentElement.dataset.theme = datasetValue;
  else delete document.documentElement.dataset.theme;
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute("content", themeDefinitions[theme].scheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Keep the selected theme for this page when storage is unavailable.
  }
}

export function AdminThemeControl({ translateText = identityText }: AdminThemeControlProps = {}) {
  const [theme, setTheme] = useState<AdminTheme>("grey");
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const initialTheme = storedTheme();
    applyTheme(initialTheme);
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !controlRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const chooseTheme = useCallback((nextTheme: AdminTheme) => {
    applyTheme(nextTheme);
    setTheme(nextTheme);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const toggleMenu = useCallback(() => setOpen((visible) => !visible), []);
  const selectTheme = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    chooseTheme(event.currentTarget.value as AdminTheme);
  }, [chooseTheme]);

  return (
    <div className="relative mt-auto flex-none py-2" ref={controlRef}>
      <Button
        variant="ghost"
        size="lg"
        className="flex min-h-12 w-full items-center gap-2 rounded-admin-sm border border-admin-border bg-admin-soft px-2.5 py-1.5 text-left hover:border-admin-border-strong hover:bg-admin-surface"
        aria-expanded={open}
        aria-controls="theme-options"
        onClick={toggleMenu}
        ref={triggerRef}
      >
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold">{translateText("Theme")}</strong>
          <small className="mt-0.5 block truncate text-xs text-admin-muted">{translateText(themeDefinitions[theme].label)}</small>
        </span>
        <ChevronDown className="size-4 shrink-0 text-admin-muted" aria-hidden="true" />
      </Button>
      <div className="absolute right-0 bottom-[calc(100%-1px)] z-30 w-full rounded-admin-md border border-admin-border bg-admin-surface p-[7px] shadow-admin-card" id="theme-options" hidden={!open}>
        <p className="mx-2 mb-1.5 mt-1 text-xs font-semibold text-admin-muted">{translateText("Choose a theme")}</p>
        <fieldset className="grid min-w-0 gap-0.5 border-0 p-0" aria-label={translateText("Theme options")}>
          {(Object.keys(themeDefinitions) as AdminTheme[]).map((option) => (
            <Button
              variant="ghost"
              size="md"
              className="grid min-h-11 w-full grid-cols-[18px_minmax(0,1fr)_16px] items-center gap-2 rounded-admin-sm p-2 text-left hover:bg-admin-accent-soft aria-pressed:bg-admin-accent-soft aria-pressed:text-admin-accent"
              key={option}
              value={option}
              aria-pressed={theme === option}
              onClick={selectTheme}
            >
              <span className={`block size-[18px] rounded-[5px] border border-admin-border ${themeSwatchClasses[option]}`} aria-hidden="true" />
              <span className="block min-w-0">
                <strong className="block text-sm font-semibold">{translateText(themeDefinitions[option].label)}</strong>
                <small className="mt-0.5 block truncate text-xs text-admin-muted">
                  {translateText(option === "grey"
                    ? "Neutral workspace"
                    : option === "green"
                      ? "Original KuQuest palette"
                      : "Low-light workspace")}
                </small>
              </span>
              <span className="text-sm font-bold text-admin-accent opacity-0 aria-pressed:opacity-100" aria-hidden="true">✓</span>
            </Button>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
