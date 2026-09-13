"use client";

import { useEffect, useState } from "react";

type AdminLanguage = "en" | "th";

function storedLanguage(): AdminLanguage {
  try {
    return localStorage.getItem("kuquest-admin-language") === "th" ? "th" : "en";
  } catch {
    return "en";
  }
}

function applyLanguage(language: AdminLanguage): void {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
  try {
    localStorage.setItem("kuquest-admin-language", language);
  } catch {
    // Keep the selected language for this page when storage is unavailable.
  }
}

export function AdminLanguageControl() {
  const [language, setLanguage] = useState<AdminLanguage>("en");

  useEffect(() => {
    const initialLanguage = storedLanguage();
    setLanguage(initialLanguage);
    applyLanguage(initialLanguage);
  }, []);

  const selectLanguage = (nextLanguage: AdminLanguage) => {
    setLanguage(nextLanguage);
    applyLanguage(nextLanguage);
  };

  return (
    <div className="language-control" data-language-control>
      <span className="language-control-label">Language</span>
      <fieldset className="language-options" aria-label="Language options">
        <legend className="visually-hidden">Language options</legend>
        <button className="language-option" type="button" aria-pressed={language === "en"} onClick={() => selectLanguage("en")}>
          English
        </button>
        <button className="language-option" type="button" aria-pressed={language === "th"} onClick={() => selectLanguage("th")}>
          ไทย
        </button>
      </fieldset>
    </div>
  );
}
