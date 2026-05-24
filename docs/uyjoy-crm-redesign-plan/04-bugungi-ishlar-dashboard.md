# 04 - Bugungi Ishlar Dashboard

## Goal
Replace the generic CRM overview with a daily action dashboard for sales managers and directors.

## Why This Step Matters
Uzbekistan sales teams need to know what must happen now: new leads, unanswered leads, overdue follow-ups, office visits, expiring bron, and hot clients.

## Files To Modify
- `src/app/portal/management-x7k9/crm/page.tsx`
- possible new components under `src/components/crm/`
- `src/lib/crm-access.ts`
- `src/lib/reports.ts` or new lightweight dashboard query helpers
- `messages/*.json`

## Exact Implementation Tasks
- Add cards for new leads, unanswered leads, overdue follow-ups, today visits, active bron, and expiring bron.
- Use role-specific scopes.
- Make every dashboard number link to a filtered list where possible.
- Keep queries server-side and indexed.

## Acceptance Criteria
- Sales managers see their own urgent work first.
- Directors see team-level operational queues.
- No decorative charts are added.

## Risks
- Expensive queries if filters are not indexed.
- Dashboard becoming another reports page instead of action page.

## What NOT To Do
- Do not build advanced analytics.
- Do not add database tables unless query performance proves it necessary.

## Test Checklist
- Test owner, director, and sales agent scopes.
- Verify counts match filtered destinations.
- Run reports and CRM tests.
