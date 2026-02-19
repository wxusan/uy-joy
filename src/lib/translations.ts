// Translation helper for user-entered multilingual content

export type Locale = "en" | "ru" | "uz";

export interface Translations {
  en?: string;
  ru?: string;
  uz?: string;
}

/**
 * Get translated text for the given locale
 * Falls back to: requested locale → English → first available → original value
 */
export function getTranslation(
  translationsJson: string | null | undefined,
  fallback: string,
  locale: Locale = "uz"
): string {
  if (!translationsJson) return fallback;

  try {
    const translations: Translations = JSON.parse(translationsJson);
    
    // Try requested locale first
    if (translations[locale]) return translations[locale]!;
    
    // Fall back to Uzbek
    if (translations.uz) return translations.uz;
    
    // Fall back to Russian, then English
    if (translations.ru) return translations.ru;
    if (translations.en) return translations.en;
    
    // Fall back to any available translation
    const available = Object.values(translations).find((v) => v);
    if (available) return available;
    
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Create translations JSON from form data
 */
export function createTranslationsJson(translations: Translations): string {
  // Only include non-empty values
  const filtered: Translations = {};
  if (translations.en) filtered.en = translations.en;
  if (translations.ru) filtered.ru = translations.ru;
  if (translations.uz) filtered.uz = translations.uz;
  
  return Object.keys(filtered).length > 0 ? JSON.stringify(filtered) : "";
}

/**
 * Parse translations JSON to object
 */
export function parseTranslations(json: string | null | undefined): Translations {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * Get current locale from cookie or default
 */
export function getCurrentLocale(): Locale {
  if (typeof document === "undefined") return "uz";
  
  const match = document.cookie.match(/locale=(\w+)/);
  const locale = match?.[1] as Locale;
  
  return ["uz", "ru", "en"].includes(locale) ? locale : "uz";
}
