# 05 - Lead Quick Actions

## Goal
Make lead detail faster than Telegram for basic sales actions.

## Why This Step Matters
Managers will not write long notes. They need one-tap actions: call, Telegram, no answer, remind later, office visit, create bron.

## Files To Modify
- `src/app/portal/management-x7k9/crm/leads/[leadId]/LeadQuickActions.tsx`
- `src/app/api/crm/activities/route.ts`
- `src/app/api/crm/tasks/route.ts`
- possible new endpoints under `src/app/api/crm/leads/[id]/`
- `messages/*.json`

## Exact Implementation Tasks
- Add action buttons for call, Telegram, no answer, office visit, and create bron/deal.
- Add reminder preset buttons.
- Create translated activity titles and bodies.
- Avoid requiring long notes.

## Acceptance Criteria
- A manager can log a normal sales touch in one click.
- Reminder presets create tasks with correct due dates.
- Lead activity timeline updates after action.

## Risks
- Too many buttons causing visual noise.
- One-click actions creating low-quality activity spam.

## What NOT To Do
- Do not add real telephony integration yet.
- Do not add Telegram bot command handling yet.

## Test Checklist
- Log each quick action.
- Confirm first response and last contacted fields update where expected.
- Run CRM tests.
