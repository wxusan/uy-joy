# 10 - Automation Layer

## Goal
Add safe, narrow automations for repetitive operational pressure points after the manual workflow is stable.

## Why This Step Matters
Automation should prevent lost leads and missed bron/payment deadlines, not create a confusing workflow engine.

## Files To Modify
- cron/API routes for reminders and checks
- `src/lib/crm.ts`
- `src/lib/telegram.ts`
- possible new `src/lib/automation-rules.ts`
- `messages/*.json`

## Exact Implementation Tasks
- Automate overdue follow-up reminders.
- Automate reservation expiry warnings.
- Automate duplicate review flags.
- Automate manager inactivity alerts.
- Automate payment overdue alerts.
- Add logs for every automated action.

## Acceptance Criteria
- Automations are idempotent.
- Alerts are limited and explain why they fired.
- Manual overrides remain possible.

## Risks
- Spammy notifications.
- False positives damaging trust.
- Hidden automation confusing managers.

## What NOT To Do
- Do not build a generic automation builder.
- Do not add AI or enterprise workflow engines.
- Do not make automations silently mutate high-risk business data.

## Test Checklist
- Run each automation against test data twice to verify idempotency.
- Test disabled/missing integration settings.
- Run CRM and reports tests.
