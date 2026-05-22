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

function applyEmbedHeaders(request: NextRequest, response: NextResponse, dbOrigins: string[] = []) {
  if (!request.nextUrl.pathname.startsWith("/embed/lead-form")) return response;
  const envOrigins = (process.env.CLIENT_EMBED_FRAME_ANCESTORS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Merge env-configured origins with per-tenant DB origins (deduplicated)
  const allOrigins = Array.from(new Set([...envOrigins, ...dbOrigins]));
  const frameAncestors = allOrigins.length > 0 ? ["'self'", ...allOrigins].join(" ") : "'self'";
  response.headers.set("Content-Security-Policy", `frame-ancestors ${frameAncestors};`);
  response.headers.delete("X-Frame-Options");
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

type TenantInfo = { id: string | null; embedAllowedOrigins: string[] };

/**
 * Resolve the tenant id (and optionally embed origins) from the request host.
 *
 * Looks up the project whose `domain` column matches the host exactly.
 * When `fetchEmbedOrigins` is true the lookup also returns the project's
 * per-tenant `embedAllowedOrigins` list so middleware can enforce it in the
 * Content-Security-Policy frame-ancestors directive.
 *
 * NOTE: We do NOT import prisma here because middleware runs in the Edge
 * runtime and Prisma's Node.js driver is not Edge-compatible.  Instead we
 * call an internal Next.js API route that runs in the Node runtime.
 */
async function resolveTenant(request: NextRequest, fetchEmbedOrigins = false): Promise<TenantInfo> {
  const host = request.headers.get("host") ?? "";
  // Strip port for local dev (localhost:3000 → localhost)
  const hostname = host.split(":")[0];

  const isLocalOrPreview =
    hostname === "localhost" ||
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".vercel.dev");

  // For non-embed paths on local/preview URLs we can skip the DB lookup entirely.
  if (isLocalOrPreview && !fetchEmbedOrigins) {
    return { id: null, embedAllowedOrigins: [] };
  }

  try {
    // Call the internal tenant-lookup endpoint (runs in Node runtime)
    const proto = request.nextUrl.protocol; // "https:" or "http:"
    const domainParam = isLocalOrPreview ? "" : encodeURIComponent(hostname);
    const embedParam = fetchEmbedOrigins ? "&includeEmbed=1" : "";
    const url = `${proto}//${host}/api/tenant-lookup?domain=${domainParam}${embedParam}`;
    const res = await fetch(url, {
      headers: { "x-internal-tenant-lookup": "1" },
      // Short timeout — don't slow down every request
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { id: null, embedAllowedOrigins: [] };
    const data = (await res.json()) as { id?: string; embedAllowedOrigins?: string[] };
    return {
      id: isLocalOrPreview ? null : (data.id ?? null),
      embedAllowedOrigins: data.embedAllowedOrigins ?? [],
    };
  } catch {
    return { id: null, embedAllowedOrigins: [] };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith(adminPrefix) && !pathname.startsWith(adminLoginPath);
  const needsApiAuth = isProtectedApi(request);
  const isEmbedPath = pathname.startsWith("/embed/lead-form");

  // ── Tenant resolution ──────────────────────────────────────────────────────
  // Skip for the internal lookup endpoint itself (avoid infinite loop).
  // For embed paths, also fetch per-tenant embedAllowedOrigins for CSP enforcement.
  let tenantId: string | null = null;
  let embedAllowedOrigins: string[] = [];
  if (pathname !== "/api/tenant-lookup") {
    const tenant = await resolveTenant(request, isEmbedPath);
    tenantId = tenant.id;
    embedAllowedOrigins = tenant.embedAllowedOrigins;
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
      return applyEmbedHeaders(request, applyLocaleCookie(request, NextResponse.redirect(loginUrl)), embedAllowedOrigins);
    }
  }

  // ── Pass tenant id downstream via request header ────────────────────────────
  const requestHeaders = new Headers(request.headers);
  if (tenantId) {
    requestHeaders.set("x-tenant-id", tenantId);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyEmbedHeaders(request, applyLocaleCookie(request, response), embedAllowedOrigins);
}

export const config = {
  matcher: [
    // Match all paths except static files.
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
