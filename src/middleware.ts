import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const supportedLocales = ["uz", "ru", "en"] as const;
const adminPrefix = "/portal/management-x7k9";
const adminLoginPath = "/portal/management-x7k9/login";

const protectedApiPrefixes = [
  "/api/ai",
  "/api/upload",
  "/api/users",
];

const contentApiPrefixes = [
  "/api/projects",
  "/api/buildings",
  "/api/floors",
  "/api/units",
  "/api/faqs",
  "/api/hero-images",
];

/**
 * Detect the best locale from the browser's Accept-Language header.
 * Maps language codes like "ru", "ru-RU", "en-US" to our supported locales.
 * Falls back to "uz" (Uzbek) if nothing matches.
 */
function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "uz";

  const languages = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of languages) {
    if ((supportedLocales as readonly string[]).includes(lang)) {
      return lang;
    }
    const prefix = lang.split("-")[0];
    if ((supportedLocales as readonly string[]).includes(prefix)) {
      return prefix;
    }
  }

  return "uz";
}

function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.get("locale")) {
    const acceptLanguage = request.headers.get("accept-language");
    const detectedLocale = detectLocale(acceptLanguage);

    response.cookies.set("locale", detectedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

function isProtectedApi(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;
  if (pathname.startsWith("/api/auth")) return false;

  if (pathname === "/api/leads") {
    return method !== "POST";
  }

  if (pathname === "/api/units" && method === "GET" && searchParams.get("all") === "true") {
    return true;
  }

  if (pathname.startsWith("/api/leads/")) return true;
  if (protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;

  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  return isMutation && contentApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Resolve the tenant id from the request host.
 *
 * Looks up the project whose `domain` column matches the host exactly.
 * Returns the project id on a match, null otherwise (caller falls back to
 * the default/first project).
 *
 * NOTE: We do NOT import prisma here because middleware runs in the Edge
 * runtime and Prisma's Node.js driver is not Edge-compatible.  Instead we
 * call an internal Next.js API route that runs in the Node runtime.
 */
async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const host = request.headers.get("host") ?? "";
  // Strip port for local dev (localhost:3000 → localhost)
  const hostname = host.split(":")[0];

  // Skip resolution for localhost / Vercel preview URLs — use default tenant
  if (
    hostname === "localhost" ||
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".vercel.dev")
  ) {
    return null;
  }

  try {
    // Call the internal tenant-lookup endpoint (runs in Node runtime)
    const proto = request.nextUrl.protocol; // "https:" or "http:"
    const url = `${proto}//${host}/api/tenant-lookup?domain=${encodeURIComponent(hostname)}`;
    const res = await fetch(url, {
      headers: { "x-internal-tenant-lookup": "1" },
      // Short timeout — don't slow down every request
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith(adminPrefix) && !pathname.startsWith(adminLoginPath);
  const needsApiAuth = isProtectedApi(request);

  // ── Tenant resolution ──────────────────────────────────────────────────────
  // Skip for the internal lookup endpoint itself (avoid infinite loop)
  let tenantId: string | null = null;
  if (pathname !== "/api/tenant-lookup") {
    tenantId = await resolveTenantId(request);
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (isAdminPage || needsApiAuth) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      if (needsApiAuth) {
        return applyLocaleCookie(
          request,
          NextResponse.json({ error: "Authentication required" }, { status: 401 })
        );
      }

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = adminLoginPath;
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
      return applyLocaleCookie(request, NextResponse.redirect(loginUrl));
    }
  }

  // ── Pass tenant id downstream via request header ────────────────────────────
  const requestHeaders = new Headers(request.headers);
  if (tenantId) {
    requestHeaders.set("x-tenant-id", tenantId);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyLocaleCookie(request, response);
}

export const config = {
  matcher: [
    // Match all paths except static files.
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
