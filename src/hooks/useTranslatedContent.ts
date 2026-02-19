"use client";

import { useLocale } from "next-intl";
import { getTranslation, Locale } from "@/lib/translations";

/**
 * Hook to get translated content based on current locale
 */
export function useTranslatedContent() {
  const locale = useLocale() as Locale;

  const t = (translationsJson: string | null | undefined, fallback: string): string => {
    return getTranslation(translationsJson, fallback, locale);
  };

  return { t, locale };
}
