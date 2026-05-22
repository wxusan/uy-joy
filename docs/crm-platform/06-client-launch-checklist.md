# Client Launch Checklist

Use this checklist for each white-label deployment. Keep a copy per client and attach links to the deployment, database, Cloudinary folder, Telegram bot, and DNS records.

## 1. Client Identity

- Confirm `CLIENT_SLUG`, legal company name, public brand name, support contact, phone, office address, and operating hours.
- Confirm public domain and admin URL.
- Confirm whether "Powered by Uy Joy" is contractually allowed. Do not show it on paid public pages unless agreed.

## 2. Package And Features

- Set `CLIENT_PLATFORM_PLAN` to one of `lead_page_bot`, `crm_starter`, `real_estate_crm_growth`, `full_sales_platform`, or `enterprise_custom`.
- Put negotiated overrides in `CLIENT_FEATURE_FLAGS` as JSON.
- Confirm user/project limits against the contract.
- Confirm enabled features on `/portal/management-x7k9/settings`.

## 3. Required Environment

- `DATABASE_URL`, `DIRECT_URL`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `CLIENT_SLUG`, `CLIENT_PLATFORM_PLAN`
- `CRON_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

Recommended:

- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `REPORT_DIGEST_EMAIL_FROM`, `REPORT_DIGEST_EMAIL_TO`, `RESEND_API_KEY`

## 4. First Admin

Run after migrations:

```bash
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='StrongPass12345' ADMIN_NAME='Client Owner' npm run admin:create-first
```

If users already exist, set `ALLOW_ADMIN_BOOTSTRAP=1` only after confirming the request is intentional.

## 5. Integrations

- Cloudinary upload smoke: upload a public image and a document from admin UI.
- Telegram smoke: use `/api/integrations/telegram/test` from an authenticated admin session.
- Email smoke: call `POST /api/reports/digests/send-weekly` with `x-cron-secret`.
- PostHog smoke: submit a test lead and confirm mirrored events in reports.

## 6. Scheduled Jobs

Use an external scheduler that can send headers:

- `POST /api/integrations/telegram/process-outbox`
- `POST /api/crm/deals/run-reservation-expiry-check`
- `POST /api/crm/payments/run-overdue-check`
- `POST /api/reports/digests/send-weekly`

Every request must include `x-cron-secret: <CRON_SECRET>` or `Authorization: Bearer <CRON_SECRET>`.

## 7. Smoke Test

```bash
SMOKE_SITE=https://client-domain.uz npm run smoke:client
```

Optional authenticated and lead-create smoke:

```bash
SMOKE_SITE=https://client-domain.uz SMOKE_ADMIN_EMAIL=owner@example.com SMOKE_ADMIN_PASSWORD='...' SMOKE_CREATE_LEAD=1 npm run smoke:client
```

Also verify manually:

- Public homepage loads with client brand.
- Apartment pages do not show Uy Joy branding unless agreed.
- Admin login loads.
- Sales agent cannot open settings.
- Owner/admin can change password and reset a staff password.
- `/api/health` returns expected client slug and no secrets.

## 8. Backup, Rollback, And Incidents

- Take a database backup before first import and before every migration.
- Keep the previous deployed build available for rollback.
- Rotate `NEXTAUTH_SECRET`, `CRON_SECRET`, Telegram token, Resend key, and Cloudinary keys after any suspected exposure.
- Assign one Uy Joy incident owner and one client contact.
- Log incident timeline, affected data, mitigation, and client communication.
