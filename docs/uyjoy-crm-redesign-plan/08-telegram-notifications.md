# 08 - Telegram Notifications

## Goal
Make Telegram an operational alert layer for new leads, assignment, follow-ups, bron, and payment risk.

## Why This Step Matters
Uzbekistan sales offices already work in Telegram. UyJoy must meet managers and directors there without making Telegram the only source of truth.

## Files To Modify
- `src/lib/telegram.ts`
- Telegram integration API routes
- lead creation route
- reservation and payment cron routes
- `messages/*.json`

## Exact Implementation Tasks
- Add localized Telegram templates for core events.
- Send new lead, assignment, overdue follow-up, expiring bron, and payment overdue alerts through outbox.
- Include concise action context and links.
- Keep CRM as source of truth.

## Acceptance Criteria
- Telegram failure never loses a lead.
- Messages are concise and actionable.
- Alerts are role/channel appropriate.

## Risks
- Alert fatigue.
- Sensitive client data leaking into broad groups.

## What NOT To Do
- Do not add Telegram quick-reply command processing yet unless explicitly scoped.
- Do not send finance details to sales groups.

## Test Checklist
- Test Telegram outbox success and failure.
- Test no-token/no-chat configuration.
- Run existing Telegram demo check if configured.
