# UyJoy V2 — Production Runbook

_Last updated: 2026-05-16_

---

## Rollback Procedure

### 1. Revert the Vercel deploy (< 2 minutes)

1. Open [Vercel Dashboard](https://vercel.com) → select the **uy-joy** project.
2. Go to **Deployments** tab.
3. Find the last known-good deployment (the one immediately before the current production deployment).
4. Click the **⋮** menu → **Promote to Production**.
5. Confirm — traffic shifts instantly with no downtime.

### 2. Who to notify

| Role | Contact |
|------|---------|
| Tech lead | xusanstudy@gmail.com |
| Client | Notify within 15 minutes of confirmed rollback |

---

## Backup Note

Database point-in-time recovery is not a launch requirement for this deployment.
If the hosting plan later includes managed backups, document the restore steps here.
Cloudinary assets are stored redundantly by Cloudinary.

---

## Pre-deploy Checklist

Before every production deploy:

- [ ] `npm run build` passes with no TS errors
- [ ] `npx prisma migrate deploy` applied on production DB
- [ ] All Stage 7 verification checks passed (see `UYJOY_V2_LAUNCH_ROADMAP.pdf`)

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `NEXTAUTH_SECRET` | ✅ | NextAuth session secret |
| `NEXTAUTH_URL` | ✅ | Canonical site URL |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `GEMINI_API_KEY` | ✅ | Google Gemini (AI floor detection) |
| `NEXT_PUBLIC_POSTHOG_KEY` | recommended | PostHog analytics |

---

## End-to-end smoke test

Run before any release. ~5 minutes. All flows must complete without 5xx and
without console errors.

1. **Homepage lead form.** Open `/` in incognito. Fill the contact form
   at the bottom. Submit. Lead must appear in
   `/portal/management-x7k9/leads` within 5 seconds.
2. **Apartment modal lead.** From `/#explore`, drill to a unit. Submit
   the lead form. Same checks.
3. **Waitlist on sold unit.** Open a sold or reserved unit. The form
   must render with the "Notify me" copy (not a static unavailable
   paragraph). Submit. Confirm a lead with `source='waitlist'` lands.
4. **Cache invalidation.** In admin, mark an available unit `reserved`
   with customer name + phone. Within 5 seconds refresh the public
   homepage. Unit must show as reserved.
5. **CSV injection.** Create a test lead named `=cmd|'/c calc'!A1`.
   Export leads CSV from admin. Open in Excel. The cell must show the
   literal text, **not** execute a formula. Delete the test lead after.

## Production security verification (curl)

After every production deploy. All commands target the production
domain — replace `https://navruz.uy-joy.com` with your actual host.

```bash
SITE=https://navruz.uy-joy.com

# 1. All six security headers present
curl -sI "$SITE" | grep -iE 'strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'
# Expect 6 matching lines.

# 2. No customer PII in public HTML
curl -s "$SITE/" | grep -E 'customerName|customerPhone|customerNotes'
curl -s "$SITE/apartments" | grep -E 'customerName|customerPhone|customerNotes'
# Both must return zero matches.

# 3. Admin leads endpoint requires auth
curl -i "$SITE/api/leads" 2>&1 | head -1
# Expect: HTTP/2 401

# 4. Upload endpoint requires auth
curl -i -X POST "$SITE/api/upload" 2>&1 | head -1
# Expect: HTTP/2 401

# 5. Rate limit kicks in on /api/leads
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$SITE/api/leads" \
    -H 'Content-Type: application/json' \
    -d '{"name":"rl","phone":"+998900000000","source":"bad-source"}'
done; echo
# Expect: 400 400 400 400 400 429 429 429 (the 400s are from invalid
# input; the 429s are from the rate limit kicking in.)
```

## Lighthouse targets

Run Lighthouse against the production deploy in Chrome incognito (Network
throttling: "Mobile / Slow 4G", CPU throttling: 4×). Target scores:

- `/` — Performance ≥ 85 mobile, ≥ 95 desktop. LCP < 2.5s. CLS < 0.1.
- `/apartments` — same.
- `/?building=<id>&floor=<id>` — same (use a real id from the DB).

If LCP > 2.5s on mobile, the usual offenders are: hero image not going
through `getHeroImageUrl()` (Cloudinary transforms), or MapLibre loaded
statically into the main bundle (must stay behind `dynamic(...)` in
`src/app/page.tsx`).
