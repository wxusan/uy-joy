export {};

type SmokeResult = { name: string; ok: boolean; detail: string };

const site = (process.env.SMOKE_SITE || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
const cookieJar = new Map<string, string>();

function captureCookies(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    const [name, value] = pair.split("=");
    if (name && value) cookieJar.set(name, value);
  }
}

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function check(name: string, path: string, expected: number | number[]): Promise<SmokeResult> {
  const statuses = Array.isArray(expected) ? expected : [expected];
  try {
    const response = await fetch(`${site}${path}`, { redirect: "manual" });
    return {
      name,
      ok: statuses.includes(response.status),
      detail: `${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function optionalAdminDashboardCheck(): Promise<SmokeResult> {
  const email = process.env.SMOKE_ADMIN_EMAIL;
  const password = process.env.SMOKE_ADMIN_PASSWORD;
  if (!email || !password) {
    return { name: "Authenticated admin dashboard", ok: true, detail: "skipped (set SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD)" };
  }

  const csrfResponse = await fetch(`${site}/api/auth/csrf`);
  captureCookies(csrfResponse);
  const csrf = (await csrfResponse.json().catch(() => ({}))).csrfToken;
  if (!csrf) return { name: "Authenticated admin dashboard", ok: false, detail: "missing csrf token" };

  const login = await fetch(`${site}/api/auth/callback/credentials?json=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({ csrfToken: csrf, email, password, redirect: "false", json: "true" }),
    redirect: "manual",
  });
  captureCookies(login);
  if (![200, 302].includes(login.status)) {
    return { name: "Authenticated admin dashboard", ok: false, detail: `login ${login.status}` };
  }

  const dashboard = await fetch(`${site}/portal/management-x7k9`, {
    headers: { Cookie: cookieHeader() },
    redirect: "manual",
  });
  return {
    name: "Authenticated admin dashboard",
    ok: dashboard.status === 200,
    detail: `${dashboard.status} ${dashboard.statusText}`,
  };
}

async function optionalLeadCreateCheck(): Promise<SmokeResult> {
  if (process.env.SMOKE_CREATE_LEAD !== "1") {
    return { name: "Public lead creation", ok: true, detail: "skipped (set SMOKE_CREATE_LEAD=1)" };
  }

  const response = await fetch(`${site}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke Test",
      phone: "+998901234567",
      source: "contact_form",
      projectName: "Smoke",
    }),
  });
  return {
    name: "Public lead creation",
    ok: [200, 201, 202].includes(response.status),
    detail: `${response.status} ${response.statusText}`,
  };
}

async function main() {
  const checks = await Promise.all([
    check("Health", "/api/health", [200, 503]),
    check("Public homepage", "/", 200),
    check("Admin login", "/portal/management-x7k9/login", 200),
    check("Authenticated users API is protected", "/api/users", 401),
    check("Lead API is protected for GET", "/api/leads", 401),
    optionalAdminDashboardCheck(),
    optionalLeadCreateCheck(),
  ]);

  for (const result of checks) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
  }

  if (checks.some((result) => !result.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
