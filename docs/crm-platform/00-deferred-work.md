# Deferred Work Log

This file is the parking lot for platform work we intentionally cannot or should not do yet.

Working rule:
- When a feature, cleanup, or safeguard is discovered but is out of scope for the current step, add it here immediately.
- Keep entries concrete: what is deferred, why it is deferred, when to revisit, and which plan file it belongs to.
- Do not treat this file as a substitute for implementing required acceptance criteria. Use it only for real deferrals.

## Active Deferred Items

### External demo assets

- Source: `07-demo-polish-and-sales-package.md`
- Status: Deferred
- Why: Step 7 now includes the demo reset script, demo collateral, pricing sheet, and rehearsal checklist, but the actual muted Telegram bot/channel and backup screen recording are external sales assets that require choosing the demo deployment/database and recording the live walkthrough.
- Revisit when: Preparing the first real developer sales meeting.
- Later work: Create a dedicated demo Telegram bot/channel, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` on the demo deployment, run `DEMO_DATABASE_CONFIRM=demo npm run demo:reset`, record the 3-5 minute walkthrough listed in `docs/sales/demo-rehearsal-checklist.md`, and store the video with sales materials.

## Resolved Deferred Items

- Authenticated CRM API/UI smoke harness: added `npm run smoke:authenticated`.
- Linked CRM read scopes for `back_office`, `finance`, and `legal`: scoped to CRM records linked through deals, payments, documents, reservations, sold units, tasks, and activities.
- Weekly digest recipient preferences: added `ReportDigestPreference` plus `/api/reports/digests/preferences`; cron delivery falls back to env recipients when no preferences exist.
- Period-cohort agent conversion: `getAgentReport()` now uses period-created assigned leads as the conversion denominator.
- DB-backed platform settings: added `PlatformSettingsRecord`, `/api/settings/platform`, and a merge helper over the env-backed defaults.
- Exact add-on entitlement vocabulary: added `optional_display` and `call_log`, and marked entry-plan SMS/Instagram as sellable add-ons.
- Session-level normalized role: NextAuth JWT/session now include `normalizedRole`.
- Document upload content sniffing: document uploads now check PDF, Office, ZIP, and image signatures before Cloudinary storage.
- Quarterly backup restore drill: documented in `docs/ops/backup-restore-drill.md`.
- Dedicated secret rotation playbook: documented in `docs/ops/secret-rotation-playbook.md`.
- Central multi-client release tooling: added `npm run release:clients` plus `docs/ops/multi-client-release.md`.
- Vercel promotion support: `npm run release:clients` can now opt into Vercel deployment promotion before smoke checks when `VERCEL_API_TOKEN` and project metadata are configured.
- Memoized platform settings loader: `getPlatformSettings()` now uses a resettable module cache.
- Settings cache freshness: env-backed and DB-backed platform settings caches now expire after a configurable TTL instead of living for the whole process.
- Platform settings editor UI: `/portal/management-x7k9/settings` now includes an authenticated editor for stored company, branding, contact, plan, limit, and white-label toggle values.
- Broader pure-function test coverage: platform, CRM, and report tests now cover the formerly deferred foundation logic.
