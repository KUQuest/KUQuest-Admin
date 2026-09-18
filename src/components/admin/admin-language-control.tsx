"use client";

import { useCallback, useEffect, useState } from "react";

import {
  normalizeAdminLanguage,
  type AdminLanguage,
} from "../../features/admin/language/admin-language";
import { Button } from "../ui/button";

type AdminLanguageControlProps = {
  language?: AdminLanguage;
  onLanguageChange?: (language: AdminLanguage) => void;
  translateText?: (value: string) => string;
};

const LANGUAGE_STORAGE_KEY = "kuquest-admin-language";
const identityText = (value: string): string => value;

function storedLanguage(): AdminLanguage {
  try {
    return normalizeAdminLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

function applyLanguage(language: AdminLanguage): void {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Keep the selected language for this page when storage is unavailable.
  }
}

export function AdminLanguageControl({
  language: controlledLanguage,
  onLanguageChange,
  translateText = identityText,
}: AdminLanguageControlProps = {}) {
  const [localLanguage, setLocalLanguage] = useState<AdminLanguage>("en");
  const language = controlledLanguage ?? localLanguage;

  useEffect(() => {
    const initialLanguage = storedLanguage();
    setLocalLanguage(initialLanguage);
    applyLanguage(initialLanguage);
    onLanguageChange?.(initialLanguage);
  }, [onLanguageChange]);

  const selectLanguage = useCallback((nextLanguage: AdminLanguage) => {
    setLocalLanguage(nextLanguage);
    applyLanguage(nextLanguage);
    onLanguageChange?.(nextLanguage);
  }, [onLanguageChange]);

  const showEnglish = useCallback(() => selectLanguage("en"), [selectLanguage]);
  const showThai = useCallback(() => selectLanguage("th"), [selectLanguage]);

  return (
    <div className="language-control flex-none py-2" data-language-control>
      <span className="language-control-label">{translateText("Language")}</span>
      <fieldset className="language-options" aria-label={translateText("Language options")}>
        <legend className="visually-hidden">{translateText("Language options")}</legend>
        <Button variant="outline" size="sm" className="language-option" type="button" aria-pressed={language === "en"} onClick={showEnglish}>
          English
        </Button>
        <Button variant="outline" size="sm" className="language-option" type="button" aria-pressed={language === "th"} onClick={showThai}>
          ไทย
        </Button>
      </fieldset>
    </div>
  );
}
