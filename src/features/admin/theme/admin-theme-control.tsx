"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

import {
  normalizeAdminTheme,
  themeDatasetValue,
  themeDefinitions,
  THEME_STORAGE_KEY,
  type AdminTheme,
} from "./theme-model";

type ThemeTranslator = {
  translate: (value: string) => string;
};

function translateThemeText(value: string): string {
  if (typeof window === "undefined") return value;
  const legacyWindow = window as unknown as Record<string, unknown>;
  const translator = legacyWindow["__KUQUEST_LANGUAGE__"] as ThemeTranslator | undefined;
  return translator?.translate(value) ?? value;
}

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

export function AdminThemeControl() {
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
    <div className="theme-control" ref={controlRef}>
      <button
        className="theme-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="theme-options"
        onClick={toggleMenu}
        ref={triggerRef}
      >
        <span className="theme-trigger-copy">
          <strong>{translateThemeText("Theme")}</strong>
          <small>{translateThemeText(themeDefinitions[theme].label)}</small>
        </span>
        <span className="theme-trigger-chevron" aria-hidden="true">⌄</span>
      </button>
      <div className="theme-menu" id="theme-options" hidden={!open}>
        <p className="theme-menu-title">{translateThemeText("Choose a theme")}</p>
        <fieldset className="theme-options" aria-label={translateThemeText("Theme options")}>
          {(Object.keys(themeDefinitions) as AdminTheme[]).map((option) => (
            <button
              className="theme-option"
              type="button"
              key={option}
              value={option}
              aria-pressed={theme === option}
              onClick={selectTheme}
            >
              <span className={`theme-swatch theme-swatch-${option}`} aria-hidden="true" />
              <span className="theme-option-copy">
                <strong>{translateThemeText(themeDefinitions[option].label)}</strong>
                <small>
                  {translateThemeText(
                    option === "grey"
                      ? "Neutral workspace"
                      : option === "green"
                        ? "Original KuQuest palette"
                        : "Low-light workspace",
                  )}
                </small>
              </span>
              <span className="theme-option-check" aria-hidden="true">✓</span>
            </button>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
