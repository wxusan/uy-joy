# Reports And Dashboards Implementation Plan

## Goal

Build reports that make owners, directors, sales agents, marketing, and finance immediately understand what is happening in the business. Reports must prove the value of the platform in a demo and support daily operations after launch.

The first version should be practical and accurate, not overly complex. It should answer: where leads come from, who follows up, what units sell, where deals get stuck, and what money is expected.

## Current Repo Context

- Existing admin dashboard shows total units, available, reserved, sold, total leads, new leads, recent leads, and simple inventory mix.
- Existing analytics page embeds PostHog but is developer-only.
- Lead data already includes status, source, project, unit snapshot, assignedTo text, nextFollowUp, and createdAt.
- Unit data already includes status, price, area, floor, building, and project relationships.
- No dedicated reporting tables exist.
- No chart library is currently installed beyond existing dependencies. Add Recharts when implementing v1 reports.

## Build Principles

- Reports must be role-specific.
- Every chart must answer a real business question.
- Use date filters consistently.
- Prefer server-side aggregation.
- Keep charts readable and exportable.
- Do not expose finance/client details to unauthorized roles.
- Demo reports should include realistic seed data.
- Use Recharts for v1 dashboard charts. Install `recharts` when implementing reports instead of hand-rolling all chart primitives.
- Every metric card should drill down to the filtered list behind the number.
- Show period comparison for owner-level KPIs.

## Dashboard Structure

### Executive Dashboard

Audience:
- owner
- developer
- admin
- sales director

Questions answered:
- How many leads did we get?
- How many became meetings/reservations/sales?
- How much revenue is in pipeline?
- Which agents are performing?
- Which sources bring useful leads?
- Which inventory is moving?

Widgets:
- total leads in period
- new leads today
- active leads
- overdue follow-ups
- reservations in period
- sold units in period
- pipeline value
- pipeline value vs previous period
- expected payment value if finance enabled
- lead conversion funnel
- top agents
- top sources
- inventory status mix

### Sales Director Dashboard

Audience:
- sales director
- owner
- admin

Widgets:
- unassigned leads
- overdue tasks by agent
- leads by pipeline status
- stage aging
- agent action count
- meetings scheduled
- visits completed
- reservations
- sold deals
- lost reasons
- first-response SLA breaches
- stage aging by status

Daily use:
- see who needs attention
- reassign leads
- push agents to follow up

### Sales Agent Dashboard

Audience:
- sales agent

Widgets:
- my active leads
- my tasks today
- my overdue tasks
- my new leads
- my upcoming meetings
- my hot leads
- my reservations
- my sold deals this month
- my target progress if target is configured

Rules:
- Sales agent sees own records only.
- If director views an agent dashboard, include team comparison only for authorized roles.

### Inventory Dashboard

Audience:
- owner
- sales director
- admin
- finance view allowed

Widgets:
- total units
- available/reserved/sold
- status by building
- status by floor
- status by room count
- price range distribution
- top requested units
- units with many leads but no sale
- slow-moving units
- sold value by building

### Marketing Dashboard

Audience:
- marketing
- owner
- sales director

Widgets:
- leads by source
- leads by campaign
- source conversion to meeting/reservation/sold
- cost per lead only if ad spend model is enabled
- cost per sale only if ad spend and sold deals exist
- UTM campaign table
- public form conversion count

### Finance Dashboard

Audience:
- finance
- owner
- admin

Widgets:
- total sold value
- expected payments this month
- paid this month
- unpaid scheduled payments
- overdue payments
- overdue clients
- cashflow by month
- payment plan status

Rules:
- Finance dashboard is hidden unless payment plan feature is enabled.
- Sales agents cannot see full finance dashboard by default.

## Data Requirements

### Existing Data Used

- `Lead.status`
- `Lead.source`
- `Lead.createdAt`
- `Lead.nextFollowUp`
- `Lead.projectId`
- `Lead.unitId`
- `Lead.unit*Snapshot`
- `Unit.status`
- `Unit.pricePerM2`
- `Unit.totalPrice`
- `Unit.area`
- `Unit.rooms`
- `Building.name`
- `Floor.number`

### CRM Core Data Used

- `Client`
- `Activity`
- `Task`
- `PipelineStage`
- `assignedToId`
- `lastActivityAt`
- `lastContactedAt`
- `nextActionAt`

### Real Estate Layer Data Used

- `Deal`
- `PaymentPlan`
- `Payment`
- `Document`

### Optional Marketing Spend Data

Cost metrics require an `AdSpend` model. Do not show cost-per-lead or cost-per-sale until this data exists.

Fields:
- `id`
- `source`
- `campaign`
- `periodStart`
- `periodEnd`
- `amount`
- `currency`
- `notes`
- `createdById`
- `createdAt`
- `updatedAt`

## Metrics Definitions

### Lead Metrics

- New leads: leads created in selected period.
- Active leads: leads not in won/lost/closed statuses.
- Unassigned leads: leads with no `assignedToId`.
- Overdue follow-ups: open tasks where due date is before now.
- Contacted leads: leads with status at or beyond contacted, or activity type call/message logged.
- Conversion to reservation: reserved deals divided by leads in period.
- Conversion to sold: sold deals divided by leads in period.
- First response time: time from lead `createdAt` to `firstResponseAt`.
- Stage aging: current time minus `stageEnteredAt`, or historical duration from `LeadStageHistory`.
- Period comparison: selected period metric compared with immediately previous period of the same length.
- Pipeline value: sum of open deal sale prices. If no deal exists but lead has unit snapshot, show that only as "estimated pipeline".
- Probability-weighted pipeline: sum of open deal sale price multiplied by `PipelineStage.probabilityPercent`; only show when stage probabilities are configured.

### Agent Metrics

- Assigned leads: active leads assigned to agent.
- Actions completed: activities created by agent in period excluding system events.
- Calls logged: activity type `communication` with `metadata.channel = call`.
- Meetings scheduled: `Task.type = meeting` with `Task.status = open`, plus optionally `Activity.type = meeting` with `metadata.action = scheduled`.
- Visits completed: activity type `visit` with `metadata.action = completed`.
- Reservations: deals reserved by or assigned to agent.
- Sold deals: deals sold by or assigned to agent.
- Overdue tasks: open tasks assigned to agent past due.
- Target progress: actual sold deals/revenue divided by `SalesAgentProfile.monthlyTargetDeals` or `monthlyTargetRevenue`.

### Inventory Metrics

- Available count: units where status is `available`.
- Reserved count: units where status is `reserved`.
- Sold count: units where status is `sold`.
- Inventory value: sum of unit total prices for selected status.
- Hot unit: unit with direct leads, saved interests, profile views, or visual explorer clicks in period. If only leads exist, label metric as "lead interest" rather than total demand.
- Slow unit: available unit with low direct interest and high days since created or status changed.

### Finance Metrics

- Expected payments: sum expected amount due in period.
- Paid payments: sum paid amount with paidAt in period.
- Overdue amount: expected minus paid for overdue payments.
- Remaining balance: deal sale price minus paid total.

## API / Server Logic

### Report API Structure

Add:
- `GET /api/reports/overview`
- `GET /api/reports/sales`
- `GET /api/reports/agents`
- `GET /api/reports/inventory`
- `GET /api/reports/marketing`
- `GET /api/reports/finance`

Common query params:
- `from`
- `to`
- `projectId`
- `buildingId`
- `agentId`
- `source`
- `status`

Default date range:
- last 30 days.

Time zone:
- Asia/Tashkent by default for reporting buckets.

Response shape:
- `summary`: metric cards
- `series`: chart data
- `tables`: table data
- `filters`: applied filters
- `comparison`: previous-period values for KPI cards
- `drilldowns`: URLs or query objects for each clickable metric

### Scheduled Digest API

Add later in reports phase if email provider exists:
- `POST /api/reports/digests/send-weekly`

Default digest:
- Monday morning Asia/Tashkent.
- recipients: owner and sales director.
- content: leads, sales, overdue follow-ups, reservations, sold units, top sources, overdue payments if enabled.

If email provider is not available, generate the digest view in-app first and add email delivery later.

### Export APIs

Add:
- `GET /api/reports/leads.csv`
- `GET /api/reports/deals.csv`
- `GET /api/reports/payments.csv`
- `GET /api/reports/agent-performance.csv`

CSV rules:
- formula-safe escaping
- UTF-8 BOM for Excel compatibility
- role-based filtering
- exported rows match selected filters

### Aggregation Strategy

V1:
- compute aggregates directly with Prisma queries.
- use database groupBy where possible.
- for complex metrics, fetch bounded data for selected period and aggregate server-side.

Later:
- add materialized report tables only if performance becomes a problem.

## Admin UI

### Shared Report Controls

Every report page should have:
- date range selector
- project selector
- optional agent selector
- optional source selector
- export button
- refresh button

Date ranges:
- today
- yesterday
- last 7 days
- last 30 days
- this month
- last month
- custom

### Chart Types

Use simple, readable charts:
- metric cards
- bar charts
- line charts
- stacked bars
- funnel chart
- table with sortable columns

Chart library:
- use Recharts for bar, line, stacked bar, and funnel-like composed charts.
- keep metric cards as custom components.
- avoid adding a second chart library unless Recharts blocks a required chart.

Avoid:
- decorative 3D charts
- complex multi-axis charts in v1
- charts without numeric labels

### Executive Dashboard UI

Route:
- `/portal/management-x7k9/reports`

Sections:
- KPI row
- lead funnel
- sales pipeline
- agent leaderboard
- source performance
- inventory mix
- period comparison row
- weekly digest preview link when enabled

### Agent Performance UI

Route:
- `/portal/management-x7k9/reports/agents`

Table columns:
- agent
- assigned leads
- overdue tasks
- actions
- calls
- meetings
- reservations
- sold deals
- conversion rate

Click agent:
- opens sales agent profile.

### Inventory Report UI

Route:
- `/portal/management-x7k9/reports/inventory`

Sections:
- status cards
- building/floor matrix
- room count distribution
- top requested units
- slow units table

### Marketing Report UI

Route:
- `/portal/management-x7k9/reports/marketing`

Sections:
- source cards
- source-to-status table
- campaign table
- UTM table

### Finance Report UI

Route:
- `/portal/management-x7k9/reports/finance`

Sections:
- payment KPI cards
- cashflow chart
- overdue payments table
- client overdue table

## Public UI

Not applicable. Reports are admin-only. Public pages may send analytics events later, but no public report UI is needed.

## Permissions

V1 role mapping:
- `back_office` receives finance-report access when payment/finance features are enabled.
- `finance` is an optional alias of `back_office`.
- `marketing` is optional and should be hidden unless campaign/source reporting is included.

### Executive Reports

Allowed:
- developer
- owner
- admin
- sales_director

### Agent Reports

Allowed:
- developer
- owner
- admin
- sales_director

Sales agent:
- only personal dashboard.

### Marketing Reports

Allowed:
- developer
- owner
- admin
- sales_director
- marketing

Marketing should not see finance details by default.

### Finance Reports

Allowed:
- developer
- owner
- admin
- back_office
- finance optional alias

Sales director can optionally view finance summary if configured.

## Edge Cases

- No data: show empty state with explanation, not broken charts.
- Date range too large: cap or warn if queries are slow.
- Agent deleted/inactive: show historical name and inactive label.
- Source unknown: group under `Unknown`.
- Unit deleted after lead: use lead snapshot fields.
- Deal without unit: show under draft/no unit.
- Payment plan disabled: hide finance report.
- User lacks permission: return 403 and hide sidebar link.
- Multiple currencies: v1 can show configured default currency only; multi-currency is Enterprise.
- Pipeline value missing deals: show estimated pipeline separately and explain source.
- Ad spend missing: hide cost-per-lead and cost-per-sale.
- Drilldown target empty: still navigate to filtered list with empty state.

## Test Plan

### API Tests

- Overview returns correct lead counts.
- Agent report respects assigned records.
- Sales agent cannot fetch all-agent report.
- Inventory report counts available/reserved/sold correctly.
- Finance report calculates overdue amount.
- Overview returns previous-period comparisons.
- Pipeline value separates deal-backed value from estimated lead/unit snapshot value.
- Ad spend metrics stay hidden when no `AdSpend` records exist.
- CSV export escapes formula values.

### UI Tests

- Report pages render with no data.
- Date filters update metrics.
- Clicking KPI cards opens filtered drilldown pages.
- Export button downloads CSV.
- Unauthorized role does not see report link.
- Empty chart states look clean.

### Manual Demo Test

1. Seed demo leads across several statuses.
2. Seed agents with tasks and activities.
3. Seed units with available/reserved/sold statuses.
4. Seed deals and payments.
5. Open executive dashboard.
6. Filter last 30 days.
7. Open agent report and compare agents.
8. Open finance report and identify overdue payment.
9. Export leads and payments CSV.

## Estimated Time

Solo developer:
- Report API endpoints: 4-6 days.
- Dashboard UI components: 5-8 days.
- Recharts integration: 1-2 days.
- CSV exports: 2-3 days.
- Drilldowns and period comparisons: 2-3 days.
- Permission checks: 1-2 days.
- Demo seed data and polish: 2-3 days.

Total: 2-3 weeks depending chart polish and digest scope.

## Acceptance Checklist

- [ ] Executive dashboard exists.
- [ ] Sales director dashboard/report exists.
- [ ] Sales agent personal dashboard exists.
- [ ] Inventory report exists.
- [ ] Marketing/source report exists.
- [ ] Finance report exists when enabled.
- [ ] Date range filters work.
- [ ] Period comparisons work.
- [ ] KPI drilldowns navigate to filtered lists.
- [ ] Pipeline value definition is implemented and labeled.
- [ ] Agent target vs actual widgets consume sales agent targets.
- [ ] Cost-per-lead/sale are hidden unless ad spend data exists.
- [ ] Recharts is the chosen chart library.
- [ ] Weekly digest is specified, with in-app fallback if email is not ready.
- [ ] Role permissions are enforced.
- [ ] CSV exports are formula-safe.
- [ ] Empty states are handled.
- [ ] Demo data makes reports impressive.
- [ ] Build passes.
