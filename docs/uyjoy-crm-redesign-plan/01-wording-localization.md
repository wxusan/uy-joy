# 01 - Wording Localization

## Goal
Make the existing CRM wording feel native to Uzbekistan real-estate sales teams without changing data models or rebuilding workflows.

## Why This Step Matters
Managers adopt CRM faster when labels sound like their daily office language. This step removes generic SaaS terms and replaces them with practical sales-office words: lid, klient, voronka, bron, qayta aloqa, ofisga keladi, and sotildi.

## Files To Modify
- `messages/uz.json`
- `messages/ru.json`
- `messages/en.json`
- `src/app/portal/management-x7k9/crm/leads/[leadId]/LeadQuickActions.tsx`
- `src/app/portal/management-x7k9/crm/leads/[leadId]/page.tsx`
- `src/app/portal/management-x7k9/crm/pipeline/PipelineBoard.tsx`

## Exact Implementation Tasks
- Replace Uzbek CRM navigation labels with local sales-office wording.
- Add missing lead status labels for `meeting`, `negotiation`, and `lost`.
- Update CRM subtitles, empty states, report labels, task labels, and quick-action labels.
- Replace hard-coded English activity titles in lead quick actions with translated strings.
- Display translated lead statuses in lead detail and stage history where translation keys exist.
- Display translated default pipeline stage names instead of raw database stage names for default stages.
- Keep Russian and English locales coherent and professional.

## Acceptance Criteria
- Uzbek CRM screens no longer feel like generic Western SaaS.
- No visible quick-action activity title is hard-coded in English.
- Lead statuses have readable labels in Uzbek, Russian, and English.
- No database schema or workflow logic is changed.
- English and Russian locales remain valid JSON and readable.

## Risks
- Over-localizing public/customer-facing text with too much internal slang.
- Introducing missing translation keys that break pages.
- Accidentally changing behavior while editing copy.

## What NOT To Do
- Do not redesign navigation structure yet.
- Do not create centralized label helpers yet.
- Do not add new CRM features.
- Do not change Prisma schema.
- Do not rename database status values.

## Test Checklist
- Run `npm run lint`.
- Run `npm run test:platform`.
- Run `npm run test:crm`.
- Run `npm run test:reports`.
- Smoke-check CRM dashboard, leads list, lead detail, pipeline, deals, tasks, and reports in Uzbek.
- Confirm JSON parses for all locale files.
