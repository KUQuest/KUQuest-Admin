import { thaiTranslations } from "./admin-language-catalog";

export type AdminLanguage = "en" | "th";

export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === "en" || value === "th";
}

export function normalizeAdminLanguage(value: unknown): AdminLanguage {
  return isAdminLanguage(value) ? value : "en";
}

export function translateAdminText(language: AdminLanguage, value: string): string {
  if (language !== "th") return value;
  const exact = thaiTranslations[value];
  if (exact) return exact;

  // API and fixture enums can differ only in letter case (for example,
  // `Assignment Active` versus `Assignment active`). Treat those labels as
  // the same translation key while keeping user-entered text unchanged.
  const lowerValue = value.toLocaleLowerCase();
  const caseInsensitiveKey = Object.keys(thaiTranslations).find(
    (key) => key.toLocaleLowerCase() === lowerValue,
  );
  if (caseInsensitiveKey) return thaiTranslations[caseInsensitiveKey] ?? value;

  for (const separator of [" · ", " → "]) {
    const separatorIndex = value.indexOf(separator);
    if (separatorIndex > 0) {
      const left = value.slice(0, separatorIndex);
      const right = value.slice(separatorIndex + separator.length);
      const translatedLeft = thaiTranslations[left];
      if (translatedLeft) {
        const translatedRight = thaiTranslations[right] ?? right;
        return `${translatedLeft}${separator}${translatedRight}`;
      }
    }
  }

  // Keep dynamic names and IDs unchanged while translating the UI prefix.
  const payoutReconciledMatch = value.match(/^Payout (.+) was reconciled with the Provider\.$/);
  if (payoutReconciledMatch) {
    return `${thaiTranslations.Payout} ${payoutReconciledMatch[1]} ${thaiTranslations["was reconciled with the Provider."]}`;
  }
  const walletStatusChangedMatch = value.match(/^Wallet status changed to (.+?)(\.)?$/);
  if (walletStatusChangedMatch) {
    const status = translateAdminText(language, walletStatusChangedMatch[1]);
    return `${thaiTranslations["Wallet status changed to"]} ${status}${walletStatusChangedMatch[2] ?? ""}`;
  }
  const dynamicPrefixes = [
    "Confirm violation for",
    "Remove penalty for",
    "Add admin note for",
    "Loaded saved filter",
    "Saved filter",
    "Ledger verification completed for",
    "Wallet projection rebuilt for",
    "Wallet status changed to",
    "Report against ",
  ];
  for (const prefix of dynamicPrefixes) {
    if (value.startsWith(prefix)) {
      const translatedPrefix = thaiTranslations[prefix] ?? prefix.trim();
      const suffix = value.slice(prefix.length);
      return `${translatedPrefix}${suffix}`;
    }
  }

  const statementMatch = value.match(/^(Hirer|Worker) statement$/);
  if (statementMatch) return thaiTranslations[`${statementMatch[1]} statement`] ?? value;
  const reportedMatch = value.match(/^(.+) reported (.+?)(\.)?$/);
  if (reportedMatch) return `${reportedMatch[1]} รายงาน ${reportedMatch[2]}${reportedMatch[3] ?? ""}`;
  return value;
}
