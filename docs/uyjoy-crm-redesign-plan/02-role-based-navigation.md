# 02 - Role-Based Navigation

## Goal
Make the sidebar and portal entry points match each role's real daily work instead of showing every enabled module to everyone.

## Why This Step Matters
Sales managers need fast access to leads, follow-ups, voronka, bron, and apartments. Directors need control panels. Finance needs payments and documents. Hiding irrelevant tools reduces confusion and onboarding time.

## Files To Modify
- `src/components/AdminSidebar.tsx`
- `src/lib/platform-plans.ts`
- `src/lib/crm-access.ts`
- `messages/uz.json`
- `messages/ru.json`
- `messages/en.json`

## Exact Implementation Tasks
- Define role-specific navigation groups for owner/director, sales manager, finance, marketing/content, and developer.
- Keep existing permission checks as the safety layer.
- Reorder visible links by daily use, not module category.
- Hide technical analytics, settings, source configuration, and public-page tools from normal sales roles.
- Keep direct URL authorization protected by existing permission checks.

## Acceptance Criteria
- Sales agents see only sales-operational links.
- Finance sees finance/payment/document links without fresh lead pipeline clutter.
- Owners and developers retain full access.
- Existing routes remain accessible for authorized users.

## Risks
- Hiding a page from navigation while a role still needs it operationally.
- Confusing plan feature flags with role permissions.

## What NOT To Do
- Do not remove routes.
- Do not change database roles.
- Do not build a custom permission editor.

## Test Checklist
- Test sidebar with owner, sales director, sales agent, external agent, marketing, finance, and developer accounts.
- Verify direct URL access still follows permission guards.
- Run `npm run test:platform`.
- Run `npm run test:crm`.
