# Public Page And Lead Bot Implementation Plan

## Goal

Create the sellable front door for each client: a branded public page that captures leads and sends them instantly to Telegram, while also writing them into the CRM when that package is enabled.

This is the first product clients will emotionally understand. It must look like their own brand, not Uy Joy, and it must make lead delivery feel immediate.

## Current Repo Context

- The public homepage already has project content, interactive explorer, apartment listing links, FAQ, contact forms, floating contact, Telegram and Instagram links.
- Contact forms already post to `/api/leads`.
- Lead source validation already exists.
- Public lead creation already normalizes phone, validates Uzbek numbers, rate-limits by IP, and uses honeypot fields.
- Project model already stores brand/contact fields such as phone, Telegram URL, Instagram URL, sales office address, hours, logo, domain, slug, and images.
- Tenant lookup by domain exists in middleware for project resolution.
- There is not yet a Telegram bot notification pipeline for new leads.

## Build Principles

- Public page must be client-branded.
- Public form must be fast and reliable.
- Telegram notification must happen immediately after lead creation.
- CRM insertion must not depend on Telegram success.
- Telegram failure must be logged but should not lose the lead.
- Public page customization should be config/content-driven before custom code.
- Client packages should control which sections and features appear.

## Public Page Product Levels

### Lead Page

For the lowest package.

Sections:
- header with logo and contact buttons
- hero with project name and offer
- project highlights
- lead form
- contact/social links
- FAQ
- footer

### Project Page

For CRM Starter and higher.

Adds:
- project description
- image gallery
- location section
- available apartment highlights
- source tracking
- richer CTA blocks

### Full Public Sales Page

For Full Sales Platform.

Adds:
- interactive building/floor/unit explorer
- apartment listing
- featured apartments
- construction progress if later built
- branded animations and custom sections

## Data Model

### PublicPageConfig

If a separate config table is added, fields should include:

- `id`
- `projectId`
- `brandName`
- `logoUrl`
- `faviconUrl`
- `primaryColor`
- `secondaryColor`
- `accentColor`
- `backgroundColor`
- `textColor`
- `fontMode`: `default`, `modern`, `premium`
- `heroTitleJson`: JSON translations `{ "uz": "...", "ru": "...", "en": "..." }`
- `heroSubtitleJson`: JSON translations
- `heroImageUrl`
- `heroVideoUrl`
- `primaryCtaLabelJson`
- `secondaryCtaLabelJson`
- `formTitleJson`
- `formSubtitleJson`
- `thankYouTitleJson`
- `thankYouMessageJson`
- `enabledSections`: JSON array
- `designTokens`: JSON for spacing, radius, section style, button style
- `customCss`: disabled in v1; Enterprise-only later with strict sanitization
- `createdAt`
- `updatedAt`

Alternative v1 decision:
- Reuse and extend `Project` for most of these fields if speed matters.
- Add separate config only when multiple public pages per project are needed.

Default decision:
- Use a separate `PublicPageConfig` if building white-label commercially. It keeps client branding separate from real-estate project data.

Localization rules:
- every public text field must support Uzbek, Russian, and English values, even if only one language is enabled.
- fallback order is selected locale -> default locale -> first non-empty translation.
- font choices must support Latin and Cyrillic. Do not use a "premium" font mode unless Russian/Cyrillic text renders cleanly.

Brand color rules:
- validate hex format.
- warn if primary text/background pairs fail WCAG AA contrast.
- allow admin to save with warning only for non-critical decorative colors.
- block white-on-white or invisible form/button combinations.

Custom CSS rule:
- do not ship raw custom CSS in v1.
- if Enterprise custom CSS is added later, parse/sanitize through a CSS allowlist or restrict it to safe design tokens.

### LeadSource

Seed standard source keys:
- `public_page`
- `contact_form`
- `apartment_page`
- `visual_explorer`
- `floating_contact`
- `waitlist`
- `telegram`
- `instagram`
- `campaign`
- `manual`

Rules:
- Store raw source key on lead.
- Display localized/human label in UI.
- Do not reject known existing sources during migration; map them:
  - `bosh-sahifa` -> `public_page`
  - `kvartiralar` -> `apartment_page`
  - `vizual` -> `visual_explorer`

### Campaign Tracking

Add to lead:
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `utmContent`
- `utmTerm`
- `referrer`
- `landingPath`
- `campaign`

Rules:
- Preserve UTM values from first landing when possible.
- Store landing path with lead.
- Do not expose UTM fields publicly after submit.

### TelegramNotificationLog

Track delivery.

Fields:
- `id`
- `leadId`
- `clientId`
- `chatId`
- `status`: `pending`, `sent`, `failed`
- `messageText`
- `telegramMessageId`
- `errorMessage`
- `attemptCount`
- `nextAttemptAt`
- `lastAttemptAt`
- `sentAt`
- `createdAt`

Rules:
- Lead creation succeeds even if Telegram fails.
- Failed Telegram notifications should show in admin diagnostics or lead activity.
- Use this table as an outbox queue. Public form submission writes `pending` with `attemptCount = 0` and `nextAttemptAt = now()`; a background job sends/retries.
- Retry up to 3 times with backoff: 1 minute, 5 minutes, 15 minutes.
- After max retries, mark `failed` and show in admin integration diagnostics.

### AnalyticsEvent Spec

Use PostHog when configured, but do not make lead creation depend on analytics.

Events:
- `public_page_view`
- `lead_form_view`
- `lead_form_start`
- `lead_form_submit`
- `lead_form_success`
- `lead_form_error`
- `telegram_notification_sent`
- `telegram_notification_failed`

Properties:
- `source`
- `projectId`
- `unitId`
- `landingPath`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `locale`

Rules:
- never send full phone number or sensitive client notes to analytics.
- if phone is needed for dedupe analytics later, send a one-way hash only.

### Embedded Lead Widget

Offer an embed for clients who already have a website.

V1 option:
- iframe embed URL: `/embed/lead-form?projectId=...&source=client_site`.

Widget behavior:
- same validation and rate limits as public form.
- same Telegram/CRM flow.
- postMessage height updates if iframe is used.
- no access to parent page data except UTM/referrer query params.

Client embed requirement:
- iframe host page must install a small `message` listener if it wants automatic height resizing.
- provide copy-paste snippet in client onboarding docs.

Security headers:
- normal public/admin pages should keep anti-framing protections.
- `/embed/lead-form` must set a controlled `Content-Security-Policy frame-ancestors` allowlist for configured client domains.
- do not allow arbitrary domains to frame the widget.
- if multiple client domains are allowed, store them in public page settings.

## API / Server Logic

### Public Lead Create Flow

Endpoint:
- existing `POST /api/leads`

Steps:
1. Read request body.
2. Validate schema.
3. Normalize and validate phone.
4. Check honeypot fields.
5. Rate-limit by IP.
6. Validate source.
7. Resolve project/client instance.
8. Snapshot unit if `unitId` exists.
9. Deduplicate/create client if CRM enabled.
10. Create lead.
11. Create `lead_created` activity if CRM enabled.
12. Insert `TelegramNotificationLog` pending row if `leadBot` enabled.
13. Return success to public user.

Failure behavior:
- Validation failure: return 400.
- Rate limit: return 429.
- Honeypot filled: return accepted fake success.
- Telegram failure: return 201 if lead saved.
- Database failure: return 500.

### Telegram Outbox Worker

Add endpoint:
- `POST /api/integrations/telegram/process-outbox`

Trigger:
- Vercel Cron every minute or every 5 minutes.
- Optional manual "retry now" admin action.

Security:
- require secret header, for example `CRON_SECRET`.

Worker behavior:
- select pending/failed retryable rows where `nextAttemptAt <= now`.
- send Telegram message.
- on success, store `telegramMessageId`, `sentAt`, status `sent`.
- on failure, increment `attemptCount`, store `errorMessage`, set next backoff or status `failed`.
- keep job idempotent.

### Telegram Send Helper

Create helper:
- `sendLeadTelegramNotification(lead, context)`

Message format:

```text
New lead

Name: {name}
Phone: {phone}
Source: {source label}
Project: {projectName or "-"}
Unit: {building/floor/unit or "-"}
Language: {preferred language or "-"}
Campaign: {utmCampaign or "-"}
Time: {Tashkent local time}

CRM: {lead profile URL if CRM enabled}
```

Rules:
- Keep message readable on mobile.
- Include direct `tel:` phone only if Telegram formatting supports it safely.
- Include CRM link only for CRM-enabled packages.
- Do not include internal notes or sensitive data.

Telegram API endpoint:
- `https://api.telegram.org/bot{token}/sendMessage`

Required env:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional future:
- per-project Telegram chat id.
- per-source Telegram chat id.
- separate owner/director/agent bot routes.

### Telegram Test API

Add authenticated admin endpoint:
- `POST /api/integrations/telegram/test`

Behavior:
- sends test message to configured chat.
- returns success/failure.
- developer/admin only.

### Public Page Config API

Add authenticated endpoints:
- `GET /api/public-page/config`
- `PATCH /api/public-page/config`

Permissions:
- owner/admin/developer can edit.
- marketing can edit public copy/media if allowed.

Validation:
- colors must be valid hex.
- section keys must be known.
- URLs must be safe strings.
- text fields must be translation JSON objects.
- contrast warnings should be returned for brand colors.

## Admin UI

### Public Page Settings

Route:
- `/portal/management-x7k9/public-page`

Tabs:
- Brand
- Hero
- Sections
- Forms
- Integrations
- Preview

Brand fields:
- brand name
- logo upload
- favicon upload
- colors
- default locale
- enabled locales

Hero localized fields:
- per-locale title editor for `heroTitleJson`
- per-locale subtitle editor for `heroSubtitleJson`
- hero image
- per-locale CTA label editors

Sections:
- show/hide project overview
- show/hide apartment highlights
- show/hide FAQ
- show/hide location
- show/hide gallery
- show/hide visual explorer

Forms:
- form title
- form subtitle
- required fields
- thank-you message
- redirect after submit optional
- embed widget settings

Integrations:
- Telegram bot token status
- Telegram chat id
- send test button
- failed Telegram notifications list
- retry failed notifications button
- SMS status when enabled
- Instagram status when enabled

Preview:
- open public page in new tab
- show mobile preview later if time allows

### Lead Source Settings

Route:
- `/portal/management-x7k9/crm/sources`

Fields:
- source key
- display label
- active/inactive
- default assigned agent optional
- default pipeline stage optional

Rules:
- system sources cannot be deleted, only renamed/inactivated.

## Public UI

### Page Layout

Header:
- logo
- phone button
- Telegram button
- language switcher if multiple locales

Hero:
- large project/brand signal
- clear value proposition
- primary CTA scrolls to form
- secondary CTA opens phone/Telegram/apartments depending package

Lead Form:
- name
- phone
- optional preferred language
- optional interested apartment/unit hidden field
- honeypot fields hidden
- submit button
- loading state
- success state
- error state

Trust/Info:
- project highlights
- location
- apartment examples
- FAQ
- contact details

Footer:
- brand
- phone
- Telegram
- Instagram
- address
- legal links if available

### Form UX Details

- Phone input should accept spaces, parentheses, and hyphens but submit normalized.
- Show localized validation messages.
- Disable submit while sending.
- On success, show thank-you message and alternative contact buttons.
- If Telegram URL exists, show "Write on Telegram" shortcut after success.
- If lead submission fails, show friendly retry message.

## Permissions

- Public visitors can submit forms only.
- Marketing can edit public text/media if the optional marketing role is enabled.
- Admin/owner/developer can edit all public page settings.
- Sales agents cannot edit public page settings.
- Telegram integration settings are admin/developer only.
- V1 `back_office` has no public page editing permission by default.

## Edge Cases

- Telegram token missing: lead still saves, admin shows integration warning.
- Telegram chat id wrong: lead saves, notification log fails.
- Public page no hero image: use project cover image or neutral fallback.
- Client has no apartments uploaded yet: show lead form and project info only.
- User submits same phone many times: create multiple leads but attach same client, or optionally suppress duplicates within time window.
- Client wants only Telegram leads, no CRM: save minimal lead for export/admin visibility unless contract explicitly says bot only.
- SMS/Instagram source arrives before integrations exist: allow manual source labels.
- Invalid UTM values: trim and store safe text only.
- Client chooses inaccessible colors: warn or block based on severity.
- Client uses Russian copy with unsupported font: choose fallback font with Cyrillic support.
- Existing website client wants only form: use iframe embed instead of full public page.

## Test Plan

### Public Form Tests

- Valid Uzbek phone creates lead.
- Phone with spaces/hyphens normalizes.
- Invalid phone returns error.
- Empty name returns error.
- Honeypot field returns fake success and does not create visible lead.
- Rate limit returns 429 after configured threshold.
- Unit form snapshots unit details.
- Embed form creates lead with correct source.
- PostHog events fire when key is configured and do not include PII.

### Telegram Tests

- Valid bot token and chat id sends message.
- Missing token does not block lead creation.
- Invalid chat id logs failure.
- Failed notification retries 3 times with backoff.
- Outbox worker is idempotent.
- CRM-enabled package includes CRM link.
- Lead Bot only package omits CRM link if no CRM route.

### Admin Config Tests

- Admin can update brand colors.
- Invalid color rejected.
- Low contrast color pair returns warning or block.
- Translation JSON fields render fallback correctly.
- Marketing cannot edit integration credentials unless allowed.
- Public page renders changed logo/title.

### Manual Demo Test

1. Open public page.
2. Submit form as visitor.
3. See thank-you state.
4. Telegram channel receives message.
5. CRM lead appears.
6. Lead source and UTM fields are stored.
7. Public page still exposes no private CRM data.

## Estimated Time

Solo developer:
- Public page config data model: 1-2 days.
- Public page settings UI: 3-5 days.
- Public template refinements: 4-6 days.
- Telegram helper and logging: 2-3 days.
- Telegram outbox/retry worker: 1-2 days.
- Lead source/UTM tracking: 2-3 days.
- Embed widget and analytics events: 2-4 days.
- Tests and demo polish: 2-3 days.

Total: about 2-3 weeks.

## Acceptance Checklist

- [ ] Public page can be branded per client.
- [ ] Lead form works and preserves spam/rate-limit protection.
- [ ] UTM/source data is stored.
- [ ] Telegram bot sends new lead notification through outbox worker.
- [ ] Telegram retry policy exists.
- [ ] Telegram failures do not lose leads.
- [ ] Admin can see failed Telegram notifications.
- [ ] Admin can test Telegram connection.
- [ ] Public page settings exist.
- [ ] Public text supports Uzbek/Russian/English translations.
- [ ] Brand color contrast warnings exist.
- [ ] Raw custom CSS is disabled or sanitized.
- [ ] Embed lead form exists for clients with existing websites.
- [ ] Public page analytics events are specified and PII-safe.
- [ ] Lead appears in CRM when CRM enabled.
- [ ] CRM link appears in Telegram only when appropriate.
- [ ] Public page never exposes internal CRM/client/payment/document data.
- [ ] Build passes.
