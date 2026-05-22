# CRM Core Implementation Plan

## Goal

Turn the current admin lead list into a daily-use sales CRM. This is the standardized core that every client receives from CRM Starter and above. It must support lead intake, client profiles, sales agent ownership, pipeline movement, actions, follow-ups, search, filters, and manager visibility.

The CRM core must work before advanced real-estate payments, documents, SMS, Instagram, or AI are added.

## Current Repo Context

- Leads already exist as `Lead` records with name, phone, project/unit snapshots, status, source, assignedTo, nextFollowUp, notes, and createdAt.
- Lead status options already exist in `src/lib/lead-status.ts`.
- Admin leads UI exists at `/portal/management-x7k9/leads`.
- Lead APIs exist at `/api/leads` and `/api/leads/[id]`.
- Users exist in `User` with simple string `role`.
- Sidebar exists in `src/components/AdminSidebar.tsx`.
- Admin shell styles exist in `src/app/globals.css`.
- API auth protection is handled by middleware and `requireAdmin`.

## Build Principles

- Do not replace the current lead capture flow. Extend it.
- Keep public lead creation stable.
- Store important CRM changes as activities.
- Use server-side filtering and pagination, not only local filtering.
- Make lead/client profile pages the main workspace.
- Keep CRM UI dense, operational, and fast.
- Treat sales agent assignment as user ownership, not just a text field.
- Assignment is a field, not a pipeline stage. A lead can be new/contacted/etc. and still be unassigned, but that should trigger warnings.
- Track first response time and stage aging from day one because owners will ask for these metrics.

## Data Model

### User Changes

Extend `User` behavior without breaking existing users.

Add or plan:
- `role`: keep string but expand accepted values.
- `isActive`: boolean, default true.
- `phone`: optional.
- `avatarUrl`: optional.
- `lastLoginAt`: optional.

Allowed roles:
- `developer`
- `owner`
- `admin`
- `sales_director`
- `sales_agent`
- `back_office`
- `marketing` optional
- `finance` optional alias of `back_office`
- `legal` optional alias of `back_office`

Migration note:
- Existing `admin` and `superadmin` users must keep access.
- Map `superadmin` to owner/admin-level behavior or keep it as legacy alias with full access.
- Existing `Lead.assignedTo` text values should remain in place during migration. New UI should prefer `assignedToId`; backfill from names to users only when there is a confident match.

### Client

Create a canonical client/person record.

Fields:
- `id`
- `fullName`
- `phone`
- `phoneNormalized`
- `secondaryPhone`
- `email`
- `telegramUsername`
- `instagramUsername`
- `preferredLanguage`: `uz`, `ru`, `en`, or null
- `type`: `individual`, `company`
- `companyName`
- `source`
- `notes`
- `status`: `active`, `inactive`, `blacklisted`, `duplicate`
- `createdById`
- `assignedToId`
- `createdAt`
- `updatedAt`

Indexes:
- `phoneNormalized`
- `assignedToId`
- `status`
- `createdAt`

Rules:
- One client can have many leads.
- One client can have many activities.
- One client can later have many deals.
- Phone is the primary dedupe key in v1.

### Phone Normalization Spec

Store two phone values:
- `phone`: display value as entered or cleaned for UI.
- `phoneNormalized`: canonical value used for dedupe/search.

Canonical format:
- use E.164 when possible, for example `+998901234567`.

Uzbekistan normalization:
- remove spaces, hyphens, and parentheses.
- if value starts with `998` and has 12 digits, prefix `+`.
- if value starts with `+998` and has 13 characters including plus, keep.
- if value has 9 digits and starts with a known mobile prefix such as `90`, `91`, `93`, `94`, `95`, `97`, `98`, `99`, `33`, `55`, `77`, or `88`, prefix `+998`.
- reject local values that cannot be confidently normalized.

Foreign numbers:
- accept values starting with `+` and 8-15 digits after cleanup.
- store as E.164-like string.
- label country as unknown unless a phone parsing library is added.

Dedupe:
- match on exact `phoneNormalized`.
- if phone cannot be normalized, do not dedupe automatically; create lead and flag for manual review.
- allow multiple clients to share one phone only through admin override.

### Lead

Keep existing `Lead`, but evolve it.

Add:
- `clientId`
- `assignedToId`
- `sourceDetail`
- `campaign`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `utmContent`
- `utmTerm`
- `lostReason`
- `lastActivityAt`
- `lastContactedAt`
- `nextActionAt`
- `closedAt`
- `convertedAt`

Keep existing snapshot fields.

Deprecate gradually:
- `assignedTo` text field. Keep for backwards compatibility, but new UI should use `assignedToId`.

Status pipeline default for v1:
- `new`
- `contacted`
- `meeting`
- `negotiation`
- `reserved`
- `sold`
- `lost`

Optional later stages:
- `visited`
- `contract`
- `closed`

Do not use `assigned` as a pipeline stage. Assignment belongs to `assignedToId`. A `new` lead with no agent means unassigned. A `contacted` lead with no agent is invalid and should be shown as a data quality warning.

Rules:
- Public form creates `Lead`.
- If phone matches existing client, attach lead to that client.
- If no matching client, create client automatically.
- Moving to `sold` should later require deal data from real-estate layer.
- Moving to `lost` should require `lostReason`.
- `stageEnteredAt` should update every time status changes.
- `firstResponseAt` should be set when the first outbound call/message/meeting activity is logged or when status first moves beyond `new`.

### PipelineStage

Use configurable stages but seed defaults.

Fields:
- `id`
- `key`
- `name`
- `sortOrder`
- `color`
- `isDefault`
- `isWon`
- `isLost`
- `isActive`
- `createdAt`
- `updatedAt`

Rules:
- `key` is stable and used by code.
- `name` can be customized per client.
- Inactive stages are hidden but old leads retain history.
- Seed only the seven v1 stages unless a client explicitly needs more.
- Keep `probabilityPercent` on the stage record if reports need probability-weighted pipeline value.

### LeadStageHistory

Add explicit stage history so reporting does not depend on scanning the full activity log forever.

Fields:
- `id`
- `leadId`
- `fromStatus`
- `toStatus`
- `changedById`
- `enteredAt`
- `leftAt`
- `durationSeconds`
- `createdAt`

Rules:
- when a lead changes status, close the previous open stage row by setting `leftAt` and `durationSeconds`.
- create a new row for the new status.
- also create an activity record for human timeline display.
- use this table for stage aging and SLA reports.

### Activity

Append-only timeline records for CRM work.

Fields:
- `id`
- `type`
- `title`
- `body`
- `clientId`
- `leadId`
- `unitId`
- `dealId`
- `taskId`
- `actorId`
- `assignedToId`
- `direction`: `inbound`, `outbound`, `internal`, null
- `channel`: `phone`, `sms`, `telegram`, `instagram`, `website`, `manual`, `system`
- `metadata`: JSON
- `occurredAt`
- `createdAt`

Activity types for v1:
- `created`
- `status_changed`
- `assigned`
- `note`
- `communication`
- `meeting`
- `visit`
- `task`
- `deal`
- `document`
- `payment`
- `system`

Store details in metadata:
- communication channel: `call`, `sms`, `telegram`, `instagram`, `email`, `manual`.
- task action: `created`, `completed`, `cancelled`, `rescheduled`.
- meeting action: `scheduled`, `completed`, `cancelled`.
- document action: `uploaded`, `approved`, `rejected`.
- payment action: `scheduled`, `paid`, `partial`, `overdue`.
- refund action: `requested`, `approved`, `paid`, `rejected`.

Do not store `task_overdue` as an activity event in v1. Overdue is a derived task state. If a scheduled job later sends overdue reminders, log that as `system` or `task` with metadata.

Rules:
- Every lead creation writes `created`.
- Every status change writes `status_changed`.
- Every assignment writes `assigned`.
- Activities should not be hard-deleted in normal UI.
- Keep database `type` values stable and use `title`/`metadata` for user-facing specificity.

### Task

Sales follow-up and operational action records.

Fields:
- `id`
- `title`
- `description`
- `type`: `call`, `message`, `meeting`, `visit`, `document`, `payment`, `other`
- `status`: `open`, `completed`, `cancelled`
- `priority`: `low`, `normal`, `high`, `urgent`
- `clientId`
- `leadId`
- `dealId`
- `unitId`
- `assignedToId`
- `createdById`
- `dueAt`
- `completedAt`
- `createdAt`
- `updatedAt`

Rules:
- A lead can have many tasks.
- A task must have an owner.
- Open task with `dueAt` in the past is overdue.
- Completing a task writes activity.

### SalesAgentProfile

Optional profile extension for users in sales roles.

Fields:
- `id`
- `userId`
- `displayName`
- `phone`
- `telegramUsername`
- `avatarUrl`
- `isVisibleInReports`
- `monthlyTargetDeals`
- `monthlyTargetRevenue`
- `createdAt`
- `updatedAt`

Rules:
- Every sales agent is a `User`.
- Profile stores sales-specific metadata.

## API / Server Logic

### Lead APIs

Update `/api/leads`:

GET query parameters:
- `page`
- `limit`
- `q`
- `status`
- `assignedToId`
- `clientId`
- `projectId`
- `unitId`
- `source`
- `campaign`
- `from`
- `to`
- `overdue`
- `nextActionFrom`
- `nextActionTo`

Response:
- paginated data
- total
- page
- pages
- applied filters

POST behavior:
- validate public lead input
- normalize phone
- dedupe/create client
- create lead
- write activity
- trigger Telegram notification if feature enabled

PUT/PATCH `/api/leads/[id]`:
- update status, assignment, notes, next action fields
- write activity for status and assignment changes
- if status is lost, require lostReason
- return updated lead with client and assigned user summary

### Client APIs

Add:
- `GET /api/crm/clients`
- `POST /api/crm/clients`
- `GET /api/crm/clients/[id]`
- `PATCH /api/crm/clients/[id]`

List filters:
- `q`
- `assignedToId`
- `status`
- `source`
- `createdFrom`
- `createdTo`

Profile response includes:
- client fields
- leads
- tasks
- activities
- deals summary when real-estate layer exists

### Activity APIs

Add:
- `GET /api/crm/activities`
- `POST /api/crm/activities`

Filters:
- `clientId`
- `leadId`
- `dealId`
- `unitId`
- `type`
- `channel`

Manual creation allowed for:
- notes
- call logs
- SMS logs if no provider
- meeting logs
- visit logs

System activity creation should be centralized in a helper:
- `createActivity({ type, actorId, clientId, leadId, title, body, metadata })`

### Task APIs

Add:
- `GET /api/crm/tasks`
- `POST /api/crm/tasks`
- `PATCH /api/crm/tasks/[id]`
- `DELETE /api/crm/tasks/[id]` only for admins/directors or convert to cancel

Common operations:
- create follow-up
- mark complete
- reschedule
- assign to agent
- cancel

### Pipeline APIs

Add:
- `GET /api/crm/pipeline`
- `PATCH /api/crm/pipeline/leads/[id]/stage`

Drag-and-drop request:
- `leadId`
- `status`
- optional `sortOrder`

Rules:
- v1 can sort columns by `updatedAt` or `lastActivityAt`.
- Manual per-card order can be added later.
- stage change endpoint must return the updated lead with current status, assigned user summary, `updatedAt`, `stageEnteredAt`, and latest task summary.
- if the client sends an `updatedAt` value and the database row changed since then, return `409 Conflict` with the latest record so UI can show an overwrite warning.

### Atomic Agent Claim

Add endpoint:
- `POST /api/crm/leads/[id]/claim`

Server behavior:
- require authenticated sales agent and `allowAgentClaim`.
- run conditional update where `id = leadId` and `assignedToId IS NULL`.
- if affected row count is 1, claim succeeds and activity is created.
- if affected row count is 0, fetch current lead and return `409 Conflict` with current assignee.

Do not implement claim as read-then-write without a condition, because two agents can click at the same time.

## Admin UI

### Sidebar

Add CRM group:
- Dashboard
- Pipeline
- Leads
- Clients
- Tasks
- Sales Agents
- Reports

Visibility:
- CRM Starter and above sees CRM group.
- Sales agents see Pipeline, Leads, Clients, Tasks.
- Owners/directors/admins see Sales Agents and Reports.

### CRM Dashboard

Route:
- `/portal/management-x7k9/crm`

Widgets:
- new leads today
- unassigned leads
- overdue tasks
- leads by status
- agent activity today
- next follow-ups
- recent activities

### Pipeline Page

Route:
- `/portal/management-x7k9/crm/pipeline`

UI:
- horizontal Kanban columns
- lead cards
- column count
- search/filter toolbar
- quick assignment
- quick next action
- drag card between statuses

Card fields:
- client/lead name
- phone
- source
- project/unit if known
- assigned agent
- last activity
- next task due
- overdue indicator
- time in current stage
- first-response SLA warning if still new/uncontacted beyond configured threshold

Drag behavior:
- optimistic UI update
- API patch
- rollback on failure
- activity created server-side
- if API returns `409 Conflict`, show "Lead was updated by someone else" and refresh that card.

### Leads Page

Route:
- existing `/portal/management-x7k9/leads` can redirect to or become `/crm/leads`.

Columns:
- name
- phone
- source
- project/unit
- status
- assigned agent
- next action
- last activity
- created date

Bulk actions:
- assign selected leads
- change status
- export selected

### Lead Profile

Route:
- `/portal/management-x7k9/crm/leads/[leadId]`

Sections:
- header with name, status, assigned agent
- quick actions: call, message, task, note, meeting, visit
- contact details
- interest/project/unit details
- next task
- notes
- activity timeline
- related client
- related deals when enabled

### Clients Page

Route:
- `/portal/management-x7k9/crm/clients`

Columns:
- name
- phone
- assigned agent
- active leads
- deals count
- last activity
- next task
- source
- created date

### Client Profile

Route:
- `/portal/management-x7k9/crm/clients/[clientId]`

Sections:
- contact identity
- preferred language
- assigned agent
- all leads
- all tasks
- all activities
- deals and units when enabled
- documents when enabled
- payments when enabled

### Tasks Page

Route:
- `/portal/management-x7k9/crm/tasks`

Views:
- my tasks
- overdue
- today
- this week
- all team tasks for directors

Actions:
- complete
- reschedule
- reassign
- cancel

### Sales Agent Profile

Route:
- `/portal/management-x7k9/crm/agents/[userId]`

Metrics:
- assigned active leads
- new leads this month
- calls/actions logged
- overdue tasks
- meetings/visits
- reservations/deals when enabled
- conversion rate

## Public UI

CRM core does not change public pages except lead creation. Public forms should continue submitting the same visible fields:

- name
- phone
- project id/name
- unit id/number
- source

Hidden/tracked fields:
- UTM fields
- campaign
- referrer
- landing path

## Permissions

V1 role mapping:
- `back_office` receives the finance/legal-style permissions needed for payments and documents.
- `finance` and `legal` are optional aliases only when a client buys separated workflows.
- `marketing` is optional and should be hidden unless the package includes serious campaign/source management.

### Lead View

- Developer, owner, admin, sales_director: all leads.
- Sales agent: assigned leads plus unassigned leads only if setting allows claiming.
- Back office: read-only lead/client access when needed for linked payments or documents.
- Marketing: leads with limited sensitive details if configured.

### Lead Edit

- Owner/admin/sales_director: full edit.
- Sales agent: edit assigned leads only.
- Back office: no lead edit by default except internal notes if needed for payments/documents.
- Marketing: source/campaign fields only if allowed.

### Assignment

- Owner/admin/sales_director can assign/reassign any lead.
- Sales agent cannot reassign away from self.
- Sales agent can claim unassigned lead only if `allowAgentClaim` setting is enabled.
- Back office cannot assign/reassign leads.

### Activity

- Users can create activities on records they can view.
- Activities are not editable after a short grace period except by admin/director.
- System activities are not editable.
- Back office can create payment/document-related activities on records they can view.

### Tasks

- Task owner can complete/reschedule own tasks.
- Director/admin can reassign team tasks.
- Back office can complete payment/document tasks assigned to them.

## Edge Cases

- Duplicate phone from public form: attach new lead to existing client.
- Lead has no name but phone exists: reject public input unless configured for phone-only campaigns.
- Agent leaves company: keep historical assignment, allow bulk reassignment of active records.
- Lead assigned to inactive user: show warning and allow director reassignment.
- Status deleted/inactive: keep old leads visible with archived label.
- Drag to lost without lost reason: open modal requiring reason before API call.
- Public spam creates many leads: rate-limit and honeypot stay active.
- Client changes phone: preserve previous phone in activity or metadata later if needed.
- Two users update same lead: last write wins in v1, activity timeline records both changes.
- Prefer `409 Conflict` for high-risk updates when the client provides stale `updatedAt`; otherwise return the updated record so UI stays synchronized.
- Two agents claim same lead: conditional update allows only one winner.
- Lead stays in one stage too long: stage aging report highlights it.
- Lead has no first response after SLA threshold: dashboard flags it.

## Test Plan

### Unit / Schema Tests

- Phone normalization handles Uzbek formats.
- Lead create schema rejects invalid empty name/phone.
- Lead update rejects invalid status.
- Activity helper creates required fields.
- Task overdue logic works across time zones.
- Phone normalization covers Uzbek local, Uzbek E.164, foreign E.164, invalid short values, and duplicate matching.
- Stage history duration closes and opens correctly.

### API Tests

- Public `POST /api/leads` creates lead and client.
- Authenticated `GET /api/leads` supports server filters.
- Sales agent cannot view unassigned/all leads unless allowed.
- Status change creates activity.
- Status change creates lead stage history row.
- Assignment change creates activity.
- Lost status requires lost reason.
- Task complete creates activity.
- Atomic claim allows only one agent to claim an unassigned lead.

### UI Tests

- Pipeline renders all active stages.
- Dragging lead updates stage.
- Failed drag rolls back.
- Lead profile shows timeline.
- Client profile groups multiple leads.
- Task list filters overdue/today/week.

### Manual Smoke Tests

- Submit homepage lead.
- Confirm lead appears in CRM.
- Assign lead to agent.
- Agent logs call.
- Agent schedules follow-up.
- Move lead to contacted.
- Check activity timeline.
- Export leads CSV.

## Estimated Time

Solo developer:
- Data model and migrations: 3-5 days.
- API routes and permission helpers: 5-7 days.
- CRM pages and UI: 10-14 days.
- Pipeline drag-and-drop: 3-5 days.
- Activities/tasks: 4-6 days.
- Testing and polish: 4-6 days.

Total: 3-4 weeks.

Buffered client-facing estimate:
- 4-6 weeks solo once design decisions are locked.
- 3-4 weeks with one backend-focused and one UI-focused developer.

Two developers:
- 2-3 weeks if work is split between backend/data and UI.

## Acceptance Checklist

- [ ] Public lead creation still works.
- [ ] Leads auto-create or attach to clients.
- [ ] CRM sidebar exists.
- [ ] Pipeline page supports drag-and-drop statuses.
- [ ] Lead profile exists.
- [ ] Client profile exists.
- [ ] Activities are written for lead creation, assignment, status change, notes, calls, and tasks.
- [ ] Tasks/follow-ups can be created, completed, and filtered.
- [ ] Server-side lead filters work.
- [ ] Phone normalization spec is implemented.
- [ ] Atomic lead claim prevents double-claim races.
- [ ] Stage history supports time-in-stage reports.
- [ ] First-response timestamp supports SLA reports.
- [ ] Sales agents see only allowed records.
- [ ] Directors/admins can see team records.
- [ ] CSV export remains formula-safe.
- [ ] Build passes.
- [ ] Existing dirty worktree changes are not reverted.
