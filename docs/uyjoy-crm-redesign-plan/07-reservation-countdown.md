# 07 - Reservation Countdown

## Goal
Make active bron status and expiry visible everywhere sales and directors work.

## Why This Step Matters
Bron conflicts and forgotten expiries create real operational loss. Countdown visibility protects inventory and creates urgency.

## Files To Modify
- `src/app/portal/management-x7k9/crm/deals/page.tsx`
- `src/app/portal/management-x7k9/crm/deals/[dealId]/page.tsx`
- `src/app/portal/management-x7k9/projects/[projectId]/units/UnitsClient.tsx`
- possible new `ReservationCountdown` component
- `messages/*.json`

## Exact Implementation Tasks
- Display expiry countdown on deal cards/tables and unit admin views.
- Highlight expiring and expired bron.
- Link countdown to reservation/deal detail.
- Keep existing expiry check API unchanged.

## Acceptance Criteria
- Every active bron clearly shows when it expires.
- Expired or near-expiry bron is visually obvious.
- No automatic release policy changes are introduced.

## Risks
- Incorrect timezone display.
- Confusing reserved vs sold status.

## What NOT To Do
- Do not change reservation expiration business rules.
- Do not auto-release inventory unless separately approved.

## Test Checklist
- Test future, near-expiry, and expired reservation dates.
- Run CRM and reports tests.
