import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const supportedLocales = ["uz", "ru", "en"] as const;

/**
 * Detect the best locale from the browser's Accept-Language header.
 * Maps language codes like "ru", "ru-RU", "en-US" to our supported locales.
 * Falls back to "uz" (Uzbek) if nothing matches.
 */
function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "uz";

  // Parse "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7" into sorted preferences
  const languages = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of languages) {
    // Exact match (e.g. "ru", "uz", "en")
    if ((supportedLocales as readonly string[]).includes(lang)) {
      return lang;
    }
    // Prefix match (e.g. "ru-ru" → "ru", "en-us" → "en")
    const prefix = lang.split("-")[0];
    if ((supportedLocales as readonly string[]).includes(prefix)) {
      return prefix;
    }
  }

  return "uz";
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // If no locale cookie exists, detect from browser language
  if (!request.cookies.get("locale")) {
    const acceptLanguage = request.headers.get("accept-language");
    const detectedLocale = detectLocale(acceptLanguage);

    response.cookies.set("locale", detectedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    "/((?!_next/static|_next/image|favicon.ico|uploads|api).*)",
  ],
};
