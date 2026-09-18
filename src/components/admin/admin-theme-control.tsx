"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

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
    <div className="theme-control relative mt-auto flex-none py-2" ref={controlRef}>
      <Button
        variant="ghost"
        size="lg"
        className="theme-trigger"
        aria-expanded={open}
        aria-controls="theme-options"
        onClick={toggleMenu}
        ref={triggerRef}
      >
        <span className="theme-trigger-copy">
          <strong>{translateText("Theme")}</strong>
          <small>{translateText(themeDefinitions[theme].label)}</small>
        </span>
        <span className="theme-trigger-chevron" aria-hidden="true">⌄</span>
      </Button>
      <div className="theme-menu absolute right-0 bottom-[calc(100%-1px)] z-30 w-full rounded-admin-md border border-admin-border bg-admin-surface p-[7px] shadow-admin-card" id="theme-options" hidden={!open}>
        <p className="theme-menu-title">{translateText("Choose a theme")}</p>
        <fieldset className="theme-options" aria-label={translateText("Theme options")}>
          {(Object.keys(themeDefinitions) as AdminTheme[]).map((option) => (
            <Button
              variant="ghost"
              size="md"
              className="theme-option"
              key={option}
              value={option}
              aria-pressed={theme === option}
              onClick={selectTheme}
            >
              <span className={`theme-swatch theme-swatch-${option}`} aria-hidden="true" />
              <span className="theme-option-copy">
                <strong>{translateText(themeDefinitions[option].label)}</strong>
                <small>
                  {translateText(option === "grey"
                    ? "Neutral workspace"
                    : option === "green"
                      ? "Original KuQuest palette"
                      : "Low-light workspace")}
                </small>
              </span>
              <span className="theme-option-check" aria-hidden="true">✓</span>
            </Button>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
