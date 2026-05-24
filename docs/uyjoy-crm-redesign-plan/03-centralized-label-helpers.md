# 03 - Centralized Label Helpers

## Goal
Create a single source for display labels for lead, deal, payment, task, activity, source, and role values.

## Why This Step Matters
Raw status keys like `payment_active`, `contract_signed`, and `negotiation` should never leak into UI. Centralized helpers prevent inconsistent wording across pages.

## Files To Modify
- `src/lib/lead-status.ts`
- `src/lib/real-estate.ts`
- `src/lib/platform-plans.ts`
- new `src/lib/crm-labels.ts`
- CRM pages under `src/app/portal/management-x7k9/crm`
- reports pages under `src/app/portal/management-x7k9/reports`
- `messages/*.json`

## Exact Implementation Tasks
- Add typed label key maps for lead statuses, deal statuses, payment statuses, task types, activity types, and roles.
- Replace inline status label maps with centralized helpers.
- Add fallback behavior for unknown legacy values.
- Keep database values unchanged.

## Acceptance Criteria
- All known status values render through the helper.
- Unknown values render safely without crashing.
- No UI page manually hard-codes the same status map.

## Risks
- Over-abstracting labels too early.
- Breaking pages that need custom short labels.

## What NOT To Do
- Do not migrate stored status values.
- Do not add configurable client-specific labels yet.

## Test Checklist
- Add or update unit tests for helper mappings.
- Run CRM, platform, and reports tests.
- Search UI code for raw status maps after implementation.
