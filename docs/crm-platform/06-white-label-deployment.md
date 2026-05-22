# White-Label Deployment Implementation Plan

## Goal

Make client launches repeatable. A new client should not require guesswork. This plan defines the exact operational process for creating a separate branded deployment with its own database, domain, credentials, public page, admin, integrations, and seed data.

The first version can be checklist-driven. Later it can become a provisioning script or internal admin tool.

## Current Repo Context

- The app already supports Postgres through Prisma.
- It already uses environment variables for database, auth, Cloudinary, AI, PostHog, and other services.
- Middleware already has tenant/domain lookup logic, but v1 commercial plan is separate deployment/database per client.
- Vercel is a natural deployment target for the current Next.js app.
- Prisma migrations exist under `prisma/migrations`.
- Seed scripts exist under `prisma/seed.ts` and `scripts/data`.
- Public uploads are ignored by git.

## Build Principles

- Every client instance must be isolated.
- Every launch must be reproducible.
- No client-specific secrets should be committed.
- Client-specific config should live in env vars and database settings.
- Migrations must run before launch.
- First admin creation must be documented.
- Smoke tests must be mandatory before handoff.
- Every instance must have a `CLIENT_SLUG` env var stamped into logs.
- Password change/reset must exist before a real paid client launch, not after.
- Manual deployment is acceptable for pilots; a central multi-instance release process is required before scaling past 5-10 clients.

## Client Launch Checklist

### 1. Create Client Record In Internal Tracking

Track outside the client app at first in a private spreadsheet/Notion/doc.

Fields:
- client company name
- brand name
- contact person
- phone
- email
- package sold
- setup fee
- monthly fee
- contract date
- target launch date
- public domain
- CRM/admin domain
- database provider/account
- Vercel project name
- Telegram bot name
- support contact
- notes

### 2. Prepare Brand Assets

Required:
- logo PNG/SVG
- favicon
- brand colors
- hero image/render
- project name
- project description
- sales phone
- Telegram link or bot target
- Instagram link if available
- address
- sales hours
- language requirements

Nice to have:
- building renders
- apartment floor plans
- unit images
- FAQ content
- legal company name
- ad campaign UTM names

### 3. Create Database

Recommended provider:
- Neon Postgres for first deployments.

Steps:
- create new project/database for client
- copy pooled `DATABASE_URL`
- copy direct `DIRECT_URL` if provider gives separate direct connection
- store secrets in password manager
- do not commit secrets

Naming convention:
- database/project name: `uyjoy-client-{client-slug}`

### 4. Create Deployment

Recommended:
- Vercel project per client.

Naming convention:
- `uyjoy-{client-slug}`

Steps:
- create new Vercel project from repo
- set production branch
- configure environment variables
- deploy preview
- run migrations in production database
- verify build output

### 5. Configure Environment Variables

Required:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `CLIENT_SLUG`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CRON_SECRET`

Recommended:
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional:
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ESKIZ_EMAIL`
- `ESKIZ_PASSWORD`
- `ESKIZ_FROM`
- `META_APP_ID`
- `META_APP_SECRET`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`

Rules:
- `NEXTAUTH_SECRET` must be unique and strong.
- `NEXTAUTH_URL` must match final production URL.
- `CLIENT_SLUG` must match internal tracking and appear in structured logs.
- `NEXT_PUBLIC_POSTHOG_KEY` is required for packages that include marketing funnel analytics; otherwise those reports must hide analytics-only metrics.
- Do not reuse Telegram chat id across clients unless intentionally using Uy Joy support routing.

### Environment Matrix

Minimum environments:
- local development: developer machine only, can use local/test database.
- demo: shared sales demo instance with fake data.
- production: live client instance.

Recommended for larger clients:
- staging: client-specific preview instance connected to staging database.

Rules:
- never connect staging to production database.
- staging can use same branding but fake or copied scrubbed data.
- Enterprise clients can require approval on staging before production deployment.

### 6. Run Migrations

Commands:
- `npx prisma migrate deploy`
- `npx prisma generate` if needed in build flow

Rules:
- Never use destructive migration on client production without backup/export.
- Record migration date and commit hash.
- If migration fails, stop launch and fix before using the app.

### 7. Seed First Admin

Options:
- adapt seed script for client-specific first admin
- create one-off admin creation script
- later build internal CLI command

Required fields:
- email
- temporary password
- name
- role: `owner` or `admin`

Rules:
- temporary password must be changed after first login when password change flow exists.
- until password change exists, use strong generated password and send securely.

Launch-blocking requirement:
- implement password change or admin password reset before first paid client handoff.
- temporary password handoff is acceptable only for internal demo or private pilot with written limitation.

### 8. Configure Public Page

In admin:
- upload logo
- set colors
- set project copy
- upload hero image
- enter phone
- enter Telegram/Instagram links
- enter sales office address
- enter FAQ
- configure enabled sections

### 9. Configure CRM

In admin:
- create users
- assign roles
- create sales agent profiles
- configure pipeline stages if customization required
- configure lead sources
- configure default assignment rules if built
- configure feature flags/plan limits

### 10. Configure Telegram Bot

Bot setup:
1. create bot with BotFather
2. copy bot token
3. add bot to client group/channel
4. make bot admin if channel requires it
5. get chat id
6. set env vars
7. click admin test button
8. verify test message arrives

Lead test:
- submit public form
- verify Telegram message
- verify CRM lead

### 11. Configure Domain

Public page options:
- root domain: `clientname.uz`
- subdomain: `sales.clientname.uz`

CRM options:
- same app with hidden admin path
- subdomain: `crm.clientname.uz`

DNS:
- configure A/CNAME per Vercel instructions
- verify SSL certificate
- update `NEXTAUTH_URL`
- redeploy if needed

### 12. Smoke Test

Required checks:
- public page loads
- admin login works
- lead form submits
- Telegram notification arrives
- lead appears in CRM
- lead can be assigned
- lead can move pipeline status
- task can be created
- if inventory enabled, unit can be reserved
- if payment enabled, payment plan preview works
- if docs enabled, document upload works
- public page does not expose internal PII
- build has no runtime errors

## Deployment Artifacts

For every client, maintain:

- client setup checklist
- env var list with secret values stored securely outside repo
- domain/DNS notes
- admin login handoff confirmation
- package and feature flag list
- migration version deployed
- support contact
- launch smoke test result

## Feature Flag Configuration

Plan 01's package-to-feature matrix is the source of truth. Do not maintain a second independent flag list in deployment docs or setup scripts.

Deployment stores:
- `PlatformSettings.plan`
- `PlatformSettings.featureFlags`
- `PlatformSettings.limits`

Provisioning rule:
- choose the sold package.
- copy the feature set from plan 01 / `src/lib/platform-plans.ts`.
- apply only explicitly sold add-ons.
- record the resulting feature set in the client launch artifact.

## Backup And Rollback

### Backup

Before major launch/migration:
- export database backup if provider supports it
- record current deployment URL/commit
- record migration version

Verification:
- run quarterly restore drill for at least one client database into staging/test database.
- rotate the selected client each quarter so the same easy instance is not always tested.
- record restore date, duration, and issues.
- backups are not trusted until a restore has been tested.

### Rollback

Application rollback:
- promote previous Vercel deployment.

Database rollback:
- avoid automatic rollback in v1.
- restore from provider backup if required.
- if no provider backup, write forward migration fix.

Rules:
- Never run `prisma migrate reset` on client production.
- Never delete production data during troubleshooting.

### Secret Rotation

If a secret leaks:
- rotate that secret in the affected client deployment.
- redeploy immediately.
- for `NEXTAUTH_SECRET`, force user re-login and invalidate old sessions if possible.
- for Telegram bot token, revoke/regenerate in BotFather and update env.
- record incident in internal tracking.

Rotate proactively:
- developer/support secrets after team member leaves.
- client integration secrets when client requests it.
- any secret exposed in logs, screenshots, chat, or commits.

## Maintenance Process

### Standard Update

1. Test locally.
2. Build passes.
3. Deploy to preview.
4. Run smoke test.
5. Deploy production.
6. Run production smoke test.
7. Record version.

### Multi-Client Update

For each client:
- deploy one at a time
- verify smoke test
- then continue

Do not update all paying clients blindly until the platform is stable.

### Central Release Process

Before 5-10 paying clients, build a shared release checklist or script.

Required capabilities:
- list all active client instances and current deployed commit.
- deploy selected clients from one command/checklist.
- run smoke tests per instance.
- pause rollout after first failure.
- support feature-flag gating for risky features.
- record deployment result per client.

Goal:
- one controlled release workflow, not 10 separate manual adventures.

## Monitoring

Minimum:
- Vercel deployment logs
- database provider dashboard
- Telegram failure logs in app

Recommended:
- Sentry or similar error monitoring
- uptime check for public page
- uptime check for admin login page
- daily backup check if provider supports it

Logging rules:
- every server log should include `CLIENT_SLUG` when possible.
- integration failures should include client slug, integration name, and record id.
- never log full phone numbers, tokens, passwords, document URLs, or payment details.

Incident response:
- assign one Uy Joy owner for each incident.
- acknowledge client-impacting outage within 30 minutes during business hours.
- business hours default: Monday-Friday, 09:00-18:00 Asia/Tashkent, unless the client contract says otherwise.
- use Telegram/phone/email channel agreed with client.
- after resolution, send short summary: impact, cause, fix, prevention.

## API / Server Logic

Required support utilities:
- feature flag check helper
- role permission helper
- current platform settings loader
- Telegram test endpoint
- seed/admin creation process
- password change/reset flow
- structured logger that includes `CLIENT_SLUG`

No public provisioning API required for v1.

## Admin UI

Deployment-specific admin pages:

Settings route:
- `/portal/management-x7k9/settings`

Tabs:
- Company
- Branding
- Users
- Integrations
- Feature Plan
- System Info

System Info should show:
- app version/commit if available
- current plan
- enabled features
- public domain
- CRM/admin URL
- Telegram status
- storage status

## Public UI

The public UI must use the configured brand and content. It should never show Uy Joy branding unless the client package explicitly includes "powered by Uy Joy."

Default:
- do not show Uy Joy brand on paid white-label public pages.

Optional:
- include small "Powered by Uy Joy" only for discounted/pilot clients if agreed.

## Permissions

- Developer: can see system info and technical settings.
- Owner/admin: can manage company/brand/users.
- Marketing: optional role; can manage public page content only if enabled.
- Sales director/agent: no deployment settings.
- Back office/finance/legal: no deployment settings.

## Edge Cases

- Client domain not ready: launch on temporary Vercel domain.
- Telegram bot not ready: launch with CRM lead inbox, mark bot as pending.
- Client delays assets: use placeholder public page and keep CRM setup moving.
- Database migration fails: do not launch; fix migration.
- Client asks to self-host: Enterprise only.
- Client requests source code: separate legal/commercial discussion.
- Existing client wants plan upgrade: enable flags, migrate data if needed, run smoke test.
- Client wants staging: create separate staging DB/deployment; never share production DB.
- Bug affects many clients: use central release process, deploy one pilot instance first, then roll out.
- Secret leak: follow secret rotation playbook and notify affected client if needed.

## Test Plan

### Provisioning Test

- Create test database.
- Deploy test Vercel instance.
- Run migrations.
- Create first admin.
- Change/reset password as first admin.
- Configure branding.
- Submit lead.
- Verify Telegram.

### Smoke Test Script

- public page response 200
- admin login page response 200
- authenticated admin dashboard loads
- public lead form creates lead
- `/api/leads` GET requires auth
- Telegram test sends
- no PII in public HTML
- build passes
- structured logs include `CLIENT_SLUG`

### Security Test

- no `.env` committed
- protected APIs require auth
- feature-disabled APIs return 403
- sales agent cannot access settings
- password change/reset works
- secrets are not printed in logs
- error paths do not log payment details, tokens, full phone numbers, document URLs, or passwords.

## Estimated Time

Manual checklist version:
- 2-3 days to document and test.

Internal tooling version:
- 2-3 weeks for settings pages, helpers, password reset/change, structured logs, and setup scripts.

Central release tooling:
- 1-2 additional weeks before scaling beyond 5-10 clients.

Per client after template:
- Lead Page + Bot: 3-7 days.
- CRM Starter: 1-2 weeks.
- Full real-estate CRM: 2-4 weeks.
- Heavy visual explorer/custom design: 4-8 weeks.

## Acceptance Checklist

- [ ] New client checklist exists.
- [ ] Required env vars are documented.
- [ ] `CLIENT_SLUG` logging rule exists.
- [ ] Environment matrix is documented.
- [ ] First admin creation process exists.
- [ ] Password change/reset is launch-blocking for paid clients.
- [ ] Feature flags and package limits are documented.
- [ ] Telegram bot setup is documented and testable.
- [ ] Domain setup is documented.
- [ ] Smoke test checklist exists.
- [ ] Rollback rules are documented.
- [ ] Backup restore drill policy is documented.
- [ ] Secret rotation playbook is documented.
- [ ] Incident response communication policy is documented.
- [ ] Central multi-client release process is planned before scaling.
- [ ] Public page can be client-branded.
- [ ] CRM can be deployed separately per client.
- [ ] No secrets are committed.
