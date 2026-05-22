export {};

const site = (process.env.SMOKE_SITE || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
const email = process.env.SMOKE_ADMIN_EMAIL;
const password = process.env.SMOKE_ADMIN_PASSWORD;
const cookieJar = new Map<string, string>();

function captureCookies(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  for (const cookie of headers.getSetCookie?.() || []) {
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

async function login() {
  if (!email || !password) throw new Error("Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD.");
  const csrfResponse = await fetch(`${site}/api/auth/csrf`);
  captureCookies(csrfResponse);
  const csrfToken = (await csrfResponse.json()).csrfToken;
  const response = await fetch(`${site}/api/auth/callback/credentials?json=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({ csrfToken, email, password, redirect: "false", json: "true" }),
    redirect: "manual",
  });
  captureCookies(response);
  if (![200, 302].includes(response.status)) throw new Error(`Login failed with ${response.status}`);
}

async function check(name: string, path: string, expected = 200) {
  const response = await fetch(`${site}${path}`, {
    headers: { Cookie: cookieHeader() },
    redirect: "manual",
  });
  const ok = response.status === expected;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${response.status}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  await login();
  await check("Admin dashboard", "/portal/management-x7k9");
  await check("Settings page", "/portal/management-x7k9/settings");
  await check("CRM pipeline", "/portal/management-x7k9/crm/pipeline");
  await check("Reports page", "/portal/management-x7k9/reports");
  await check("Users API", "/api/users");
  await check("Overview report API", "/api/reports/overview");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
