# 06 - Pipeline Card Redesign

## Goal
Turn the voronka board into an operational card system that shows urgency and next action.

## Why This Step Matters
Managers scan cards quickly. Directors need to spot ignored leads. Cards must show phone, apartment, source, manager, last contact, and next action.

## Files To Modify
- `src/app/portal/management-x7k9/crm/pipeline/PipelineBoard.tsx`
- `src/app/portal/management-x7k9/crm/pipeline/page.tsx`
- `src/lib/crm-access.ts`
- `messages/*.json`

## Exact Implementation Tasks
- Add urgency badges for overdue and stale leads.
- Add filters for mine, unassigned, today, overdue, no answer, and bron.
- Improve mobile card layout.
- Keep drag-and-drop behavior.

## Acceptance Criteria
- Cards answer who, phone, apartment, status, manager, and urgency.
- Board remains usable on mobile widths.
- Existing stage transition API still works.

## Risks
- Too much information per card.
- Drag-and-drop usability on mobile remains limited.

## What NOT To Do
- Do not add new stages in this step.
- Do not rebuild pipeline storage.

## Test Checklist
- Move lead between statuses.
- Filter cards.
- Test unassigned claim action.
- Smoke-check mobile width.
