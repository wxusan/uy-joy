# Secret Rotation Playbook

Use this when a secret may be exposed, a staff member leaves, a vendor key changes, or proactive rotation is scheduled.

## General Rules

- Rotate in the deployment provider first, then redeploy.
- Never paste secrets into tickets, chat, docs, commits, or screenshots.
- Record the incident or proactive rotation in the client ops log.
- Run smoke tests after every rotation.

## NEXTAUTH_SECRET

Impact: all sessions become invalid after rotation.

1. Generate a new value with `openssl rand -base64 32`.
2. Update `NEXTAUTH_SECRET` in the deployment env.
3. Redeploy.
4. Tell active users to sign in again.
5. Run `npm run smoke:client` and authenticated smoke.

## CRON_SECRET

Impact: scheduled jobs fail until scheduler headers are updated.

1. Generate a new random value.
2. Update deployment env.
3. Update every external scheduler header:
   - `x-cron-secret: <new value>` or `Authorization: Bearer <new value>`
4. Redeploy.
5. Manually trigger one safe cron endpoint and confirm `401` with old secret, `200` with new secret.

## Telegram Bot Token

Impact: lead notifications stop until the new token is deployed.

1. Open BotFather.
2. Revoke/regenerate the token.
3. Update `TELEGRAM_BOT_TOKEN` in deployment env.
4. Run `TELEGRAM_BOT_TOKEN=... npm run telegram:demo-check`.
5. If sending a test: add `TELEGRAM_CHAT_ID=... TELEGRAM_SEND_TEST=1`.
6. Redeploy and submit a test lead.

## Cloudinary

Impact: uploads fail if credentials are wrong.

1. Rotate API key/secret in Cloudinary.
2. Update `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Redeploy.
4. Upload one public image and one document from admin.

## Resend / Email

Impact: weekly digest delivery fails if key/sender is wrong.

1. Rotate `RESEND_API_KEY`.
2. Confirm `REPORT_DIGEST_EMAIL_FROM` is still verified.
3. Redeploy.
4. Trigger `POST /api/reports/digests/send-weekly` with `CRON_SECRET`.

## Incident Record Template

```md
Date/time:
Client:
Secret rotated:
Reason:
Old secret disabled at:
New secret deployed at:
Smoke checks:
Users/client notified:
Follow-up:
```

