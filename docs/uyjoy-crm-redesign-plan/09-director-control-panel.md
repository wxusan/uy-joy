# 09 - Director Control Panel

## Goal
Build a director view focused on control: ignored leads, inactive managers, overdue follow-ups, expiring bron, weak sources, and stuck money.

## Why This Step Matters
Directors need to act, not admire charts. This panel should reveal operational problems immediately and let directors intervene.

## Files To Modify
- reports or CRM dashboard routes
- possible new `src/lib/director-queues.ts`
- `src/lib/crm-access.ts`
- `messages/*.json`

## Exact Implementation Tasks
- Add queues for unanswered leads, inactive managers, overdue follow-ups, expiring bron, and overdue payments.
- Add manager comparison snapshot.
- Link every item to the actionable record.
- Keep finance details scoped.

## Acceptance Criteria
- Director can identify today’s operational risks in under one minute.
- No decorative analytics are added.
- Sales agents cannot access team-wide control data.

## Risks
- Panel feels punitive without helping managers.
- Heavy queries on large datasets.

## What NOT To Do
- Do not build broad BI dashboards.
- Do not expose finance data to unauthorized roles.

## Test Checklist
- Test role access.
- Test queue counts and links.
- Run report tests.
