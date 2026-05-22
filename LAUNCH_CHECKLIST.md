# UyJoy V2 — Pre-Launch Checklist

For white-label client deployments, use the detailed checklist in `docs/crm-platform/06-client-launch-checklist.md` first. This file remains the short release gate.

## Step 6 Release Gate

- [ ] `.env.example` values copied into the target deployment with unique `NEXTAUTH_SECRET` and `CRON_SECRET`.
- [ ] `npm run admin:create-first` completed for the owner account.
- [ ] `/portal/management-x7k9/settings` reviewed by owner/admin.
- [ ] `/api/health` returns the expected `CLIENT_SLUG`, plan, and no missing required env vars.
- [ ] `SMOKE_SITE=https://client-domain npm run smoke:client` passes.
- [ ] Authenticated smoke passes with `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`, and `SMOKE_CREATE_LEAD=1`.
- [ ] External scheduler configured with `x-cron-secret` for Telegram outbox, reservation expiry, overdue payments, and weekly digest.
- [ ] Password change and admin reset tested.
- [ ] Telegram, Cloudinary, PostHog, and digest email statuses checked in Settings.
- [ ] Public pages show client brand, not Uy Joy branding, unless powered-by is agreed.

No external error-monitoring, database recovery, or captcha setup is required
for this delivery. The project keeps local validation, honeypot fields,
protected admin APIs, and rate limiting for lead submissions.

Run these checks after deploying to production. Replace `SITE` with the
actual production domain.

```bash
SITE=https://navruz.uy-joy.com

echo "--- 1. Security headers ---"
curl -sI "$SITE/" | grep -iE 'strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy' | wc -l
# Expect: 6

echo "--- 2. No PII in public HTML ---"
curl -s "$SITE/" | grep -cE 'customerName|customerPhone|customerNotes'
curl -s "$SITE/apartments" | grep -cE 'customerName|customerPhone|customerNotes'
# Expect: 0 then 0

echo "--- 3. /api/leads requires auth on GET ---"
curl -s -o /dev/null -w "%{http_code}\n" "$SITE/api/leads"
# Expect: 401

echo "--- 4. /api/upload requires auth on POST ---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SITE/api/upload"
# Expect: 401

echo "--- 5. Invalid lead source is rejected ---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SITE/api/leads" \
  -H 'Content-Type: application/json' \
  -d '{"name":"test","phone":"+998900000000","source":"bad-source"}'
# Expect: 400

echo "--- 6. Rate limit kicks in ---"
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$SITE/api/leads" \
    -H 'Content-Type: application/json' \
    -d '{"name":"test","phone":"+998900000000","source":"bad-source"}'
done; echo
# Expect: 400 400 400 400 400 429 429 429
```

If the checks match, run the manual release smoke test:

1. Submit the homepage lead form and confirm it appears in admin leads.
2. Submit an apartment modal lead and confirm it appears in admin leads.
3. Submit the waitlist form on a sold/reserved unit and confirm `source='waitlist'`.
4. In admin, reserve a unit with customer data and verify public pages do not expose that PII.
5. Run Lighthouse on `/`, `/apartments`, and one building/floor URL.
