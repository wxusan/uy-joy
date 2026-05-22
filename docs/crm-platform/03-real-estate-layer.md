# Real Estate CRM Layer Implementation Plan

## Goal

Add the real-estate-specific operating layer on top of the CRM core. This layer connects clients, leads, agents, apartment units, deals, reservations, payment plans, documents, and finance visibility.

This is the main difference between Uy Joy and a generic CRM. The client should feel that the platform understands how apartment sales actually work.

## Current Repo Context

- Existing inventory hierarchy is `Project -> Building -> Floor -> Unit`.
- `Unit` already stores status, price, area, room count, images, description, features, and simple customer fields.
- Existing unit statuses include values like `available`, `reserved`, and `sold`.
- Existing admin unit page can update unit data and customer sale/reservation fields.
- Existing lead records can snapshot selected unit details.
- There is no canonical `Client`, `Deal`, `PaymentPlan`, `Payment`, or `Document` model yet.
- Public pages must not expose customer PII; this is already called out in launch checks.

## Build Principles

- A sale must be represented as a deal, not only a unit status.
- A unit status change to reserved/sold must connect to client and deal data.
- Unit customer fields should become legacy compatibility fields once deals exist.
- Payment plans and documents belong to deals.
- Back-office finance/legal work must be permissioned separately from sales, even if one `back_office` role covers both in v1.
- Every important real-estate workflow change must create an activity.

## Data Model

### Deal

Represents a sales opportunity or purchase connected to a client and usually one unit.

Fields:
- `id`
- `dealNumber`: human-friendly sequential/code value
- `clientId`
- `leadId`
- `projectId`
- `primaryUnitId`
- `assignedToId`
- `createdById`
- `status`
- `source`
- `currency`: base pricing currency for the deal; keep as canonical amount currency, usually `USD`.
- `displayCurrency`: currency shown to sales/client, usually `USD`
- `paymentCurrency`: currency accepted in receipts, often `UZS`
- `exchangeRateToPaymentCurrency`
- `exchangeRateLockedAt`
- `listPrice`
- `discountAmount`
- `discountPercent`
- `salePrice`
- `discountFlaggedAt`
- `discountApprovedById`
- `discountApprovedAt`
- `initialPaymentAmount`
- `initialPaymentPercent`
- `remainingAmount`
- `paymentTermMonths`
- `monthlyPaymentAmount`
- `expectedCloseAt`
- `reservedAt`
- `reservationExpiresAt`
- `contractedAt`
- `soldAt`
- `lostAt`
- `lostReason`
- `notes`
- `createdAt`
- `updatedAt`

Statuses:
- `draft`
- `reserved`
- `contract_preparation`
- `contract_signed`
- `payment_active`
- `sold`
- `cancelled`
- `lost`

Rules:
- A client can have many deals.
- A lead can convert into one deal.
- A deal must have a client.
- A deal should usually have a unit, but draft deals can exist before unit selection.
- `salePrice = listPrice - discountAmount`.
- `remainingAmount = salePrice - initialPaymentAmount`.
- `monthlyPaymentAmount = remainingAmount / paymentTermMonths` unless custom schedule is used.
- if discount exceeds configured threshold, write flagged activity and require director/owner approval before sold.
- lock exchange rate when deal moves to reserved or contract stage if payments are accepted in UZS.

### DealUnit

Use this if one deal can include multiple units later. In v1, use one primary unit but design for extension.

Fields:
- `id`
- `dealId`
- `unitId`
- `priceAtDeal`
- `isPrimary`
- `createdAt`

Rules:
- v1 creates one `DealUnit` per deal.
- Future enterprise clients can buy multiple units in one deal.

### PaymentPlan

Represents the agreed payment structure for a deal.

Fields:
- `id`
- `dealId`
- `name`
- `type`: `installment`, `mortgage`, `cash`, `custom`
- `totalAmount`
- `initialPaymentAmount`
- `remainingAmount`
- `termMonths`
- `startsAt`
- `scheduleJson`: optional custom schedule definition
- `status`: `draft`, `active`, `completed`, `cancelled`
- `notes`
- `createdById`
- `createdAt`
- `updatedAt`

Rules:
- One active payment plan per active deal in v1.
- New payment plan revisions can be created later.
- Finance/admin can activate a draft plan.
- Equal monthly plan is only the default generator. Custom schedules must support deferred starts, step-up payments, balloon payments, and milestone percentages.

### Payment Schedule JSON Shape

Use this shape for custom schedules:

```json
[
  {
    "sequence": 1,
    "label": "Initial payment",
    "dueDate": "2026-06-01",
    "amountType": "fixed",
    "amount": 20000,
    "percentOfSalePrice": null,
    "currency": "USD",
    "kind": "initial"
  },
  {
    "sequence": 2,
    "label": "Construction milestone 1",
    "dueDate": "2026-09-01",
    "amountType": "percent",
    "amount": null,
    "percentOfSalePrice": 20,
    "currency": "USD",
    "kind": "milestone"
  }
]
```

Rules:
- `amountType` is `fixed` or `percent`.
- generated `Payment` rows store the calculated expected amount at activation time.
- changing sale price after activation requires creating a revised plan or finance/admin confirmation.

### Payment

Represents one expected or actual payment entry.

Fields:
- `id`
- `paymentPlanId`
- `dealId`
- `clientId`
- `sequence`
- `label`
- `dueDate`
- `expectedAmount`
- `expectedAmountPaymentCurrency`
- `exchangeRate`
- `paidAmount`
- `paidAmountPaymentCurrency`
- `status`: `scheduled`, `partial`, `paid`, `overdue`, `cancelled`
- `paidAt`
- `method`: `cash`, `bank_transfer`, `card`, `other`, null
- `receiptDocumentId`
- `notes`
- `createdAt`
- `updatedAt`

Rules:
- Payment is overdue when due date is past and paid amount is less than expected amount.
- Marking payment paid writes activity.
- Finance can edit paid amount and method.
- Sales can view summary if plan allows, but finance owns confirmation.
- if payment is made in UZS against USD-priced deal, store both original deal currency amount and payment currency amount with historical exchange rate.

### Refund

V1 must record refunds even if money movement happens outside the app.

Fields:
- `id`
- `dealId`
- `paymentId`
- `clientId`
- `amount`
- `currency`
- `reason`
- `status`: `requested`, `approved`, `paid`, `rejected`
- `requestedById`
- `approvedById`
- `paidAt`
- `notes`
- `createdAt`
- `updatedAt`

Rules:
- cancellation after partial payment should create a refund task or refund record.
- finance owns refund status.
- refund record is enough for v1 credibility; actual bank transfer remains external.

Refund workflow:
- sales director/admin cancels deal and enters reason.
- system creates refund record with status `requested` if paid payments exist.
- `back_office`/finance reviews and moves status to `approved` or `rejected`.
- `back_office`/finance marks status `paid` after external transfer is completed.
- every refund status change writes a payment/refund activity.

### Document

Represents uploaded or generated files related to clients/deals/payments.

Fields:
- `id`
- `clientId`
- `leadId`
- `dealId`
- `unitId`
- `paymentId`
- `uploadedById`
- `reviewedById`
- `type`
- `title`
- `fileUrl`
- `fileName`
- `fileSize`
- `mimeType`
- `status`: `missing`, `uploaded`, `needs_review`, `approved`, `rejected`, `expired`
- `rejectionReason`
- `expiresAt`
- `createdAt`
- `updatedAt`

Document types:
- `passport`
- `id_card`
- `contract`
- `reservation_agreement`
- `payment_receipt`
- `bank_document`
- `power_of_attorney`
- `other`

Rules:
- Documents are never public.
- Legal/admin can approve/reject.
- Finance can approve payment receipts if configured.
- Upload writes activity.
- Approval/rejection writes activity.

### Unit Changes

Keep existing `Unit` fields, but add:
- `currentDealId`
- `reservedByClientId`
- `soldToClientId`
- `reservedAt`
- `soldAt`
- `reservationExpiresAt`

Deprecate later:
- `customerName`
- `customerPhone`
- `customerNotes`

Compatibility rule:
- If old unit customer fields exist, show them in admin as legacy data until migrated into client/deal records.

Foreign key rule:
- avoid hard circular required relations between `Unit.currentDealId` and `Deal.primaryUnitId`.
- make `Unit.currentDealId` nullable.
- on deal delete, set `Unit.currentDealId` to null; do not cascade delete units.
- production UI should cancel/archive deals rather than delete them.

## Workflow Details

### Lead To Deal

1. Agent opens lead profile.
2. Agent chooses "Create deal".
3. System requires or creates client.
4. Agent selects interested unit or keeps deal as draft.
5. System snapshots current unit price and details.
6. Deal status starts as `draft`.
7. Activity `deal_created` is written.

### Reserve Unit

Requirements:
- client exists
- deal exists
- unit is available
- assigned sales agent exists
- reservation date exists
- reservation expiry exists, default 48 hours unless client settings override

Steps:
1. Agent clicks "Reserve unit".
2. System opens reservation modal.
3. Modal shows unit, client, price, discount, initial payment, notes.
4. System validates unit availability.
5. System updates deal status to `reserved`.
6. System updates the related lead status to `reserved` when a lead is linked.
7. System updates unit status to `reserved`.
8. System sets `reservedAt` and `reservationExpiresAt` on deal and unit.
9. System writes `unit_reserved` activity.
10. System creates a reminder task before reservation expiry.

Failure cases:
- unit already reserved/sold by another deal: show conflict error and do not update.
- user lacks permission: show forbidden.
- missing client: require client first.

### Reservation Expiry

Rules:
- every reservation has an expiry time.
- default hold window: 48 hours.
- sales director/admin can extend expiry with reason.
- expired reservation should be visible in dashboard.
- auto-release can be enabled after pilot validation; until then, generate overdue reservation tasks for directors.
- if auto-release is enabled, scheduled job releases unit and writes activity.

### Contract Preparation

Steps:
1. Sales or legal moves deal to `contract_preparation`.
2. Required docs checklist appears.
3. Legal uploads or requests contract docs.
4. Deal cannot move to `contract_signed` unless required docs are approved or admin overrides.

### Mark Sold

Requirements:
- deal status is `contract_signed` or `payment_active`, unless owner/admin override.
- sale price exists.
- payment plan exists or payment plan not required for cash plan.
- legal docs approved if feature enabled.

Steps:
1. Owner/director/admin clicks "Mark sold".
2. System validates requirements.
3. System updates deal status to `sold`.
4. System updates the related lead status to `sold` when a lead is linked.
5. System updates unit status to `sold`.
6. System sets `soldAt`.
7. System writes `unit_sold` activity.

### Cancel Deal

Steps:
1. Authorized user clicks cancel.
2. System requires reason.
3. If unit is reserved but not sold, unit returns to `available` unless admin chooses keep reserved.
4. Payment plan is cancelled.
5. If payments exist, system creates refund review record/task.
6. Open tasks are cancelled or reassigned depending on selection.
7. Activity `deal_cancelled` is written.

### Payment Plan Generation

Inputs:
- sale price
- initial payment amount or percent
- start date
- term months
- payment day of month
- custom first due date optional

Formula:
- `discountAmount = listPrice * discountPercent / 100` if percent provided.
- `salePrice = listPrice - discountAmount`.
- `remainingAmount = salePrice - initialPaymentAmount`.
- `monthlyPaymentAmount = remainingAmount / termMonths`.

Rules:
- If both discount amount and percent are entered, amount wins and percent is recalculated.
- If initial payment percent is entered, amount is calculated.
- If term months is 0 for cash plan, no monthly payments are created.
- Rounding must be consistent and visible.
- Custom schedule can override equal monthly payments.
- For step-up/deferred/balloon/milestone plans, use custom schedule rows instead of equal-month generator.

## API / Server Logic

### Deal APIs

Add:
- `GET /api/crm/deals`
- `POST /api/crm/deals`
- `GET /api/crm/deals/[id]`
- `PATCH /api/crm/deals/[id]`
- `POST /api/crm/deals/[id]/reserve`
- `POST /api/crm/deals/[id]/extend-reservation`
- `POST /api/crm/deals/[id]/mark-sold`
- `POST /api/crm/deals/[id]/cancel`

List filters:
- `q`
- `status`
- `clientId`
- `assignedToId`
- `projectId`
- `unitId`
- `source`
- `from`
- `to`

Server rules:
- do not trust client-calculated price totals
- recalculate deal financial fields on server
- check unit status before reservation/sold
- create activities inside same logical operation
- reserve operation must update unit and deal in one transaction.
- if discount exceeds threshold, block mark-sold unless approved or owner/admin override.

### Calculator APIs

Add:
- `POST /api/crm/calculator/preview`

Input:
- `unitId`
- `listPrice`
- `discountAmount`
- `discountPercent`
- `initialPaymentAmount`
- `initialPaymentPercent`
- `termMonths`
- `startDate`

Output:
- calculated sale price
- initial payment
- remaining amount
- monthly amount
- payment rows preview
- validation messages

No database writes for preview.

### Payment Plan APIs

Add:
- `POST /api/crm/deals/[id]/payment-plan`
- `PATCH /api/crm/payment-plans/[id]`
- `POST /api/crm/payment-plans/[id]/activate`
- `PATCH /api/crm/payments/[id]`
- `POST /api/crm/payments/run-overdue-check`

Rules:
- Only finance/admin/owner can mark payments paid.
- Sales director can view and create draft plan if allowed.
- Payment changes create activity.
- overdue status is updated by scheduled job, not only when a user opens the page.

### Scheduled Jobs

Use Vercel Cron or equivalent scheduled endpoint for v1.

Jobs:
- daily overdue payment check.
- daily reservation expiry check.
- optional task SLA reminder check.

Rules:
- scheduled endpoints must require a secret header.
- jobs must be idempotent.
- every auto-release or overdue transition writes activity.

### Reservation Slip PDF

Add basic server-generated PDF later in this phase, even if full contract generation is a paid add-on.

Minimum reservation slip fields:
- client name and phone
- unit number/building/floor
- area/rooms
- reservation date and expiry
- listed price and agreed price
- initial payment expectation if any
- sales agent
- company/project name

Rules:
- PDF template can be simple and branded.
- generated slip is stored as `Document.type = reservation_agreement`.
- full legal contract generator remains paid/full-suite scope.
- library decision can wait until implementation, but pick one deliberately: `@react-pdf/renderer` for template-driven PDFs, or Playwright/Puppeteer print-to-PDF if HTML reuse is more valuable.

### Commission Roadmap

Do not build commission in v1 unless a pilot client requires it, but reserve roadmap space.

Future model:
- `CommissionPlan`
- `Commission`
- `agentId`
- `dealId`
- `basis`: fixed, percent of sale, percent of collected payment
- `status`: pending, approved, paid

### Document APIs

Add:
- `POST /api/crm/documents`
- `GET /api/crm/documents`
- `PATCH /api/crm/documents/[id]`
- `POST /api/crm/documents/[id]/approve`
- `POST /api/crm/documents/[id]/reject`

Rules:
- Uploaded files go through existing upload/storage pattern.
- Documents must be linked to at least one of client, lead, deal, unit, or payment.
- Rejection requires reason.

## Admin UI

### Unit Admin Updates

On unit detail/admin page show:
- current status
- current client
- current deal
- assigned agent
- reservation date
- sold date
- payment plan summary
- documents summary
- activity timeline filtered to unit

Actions:
- create deal for unit
- reserve for client
- mark sold
- release reservation
- open deal

### Deal List

Route:
- `/portal/management-x7k9/crm/deals`

Columns:
- deal number
- client
- unit
- status
- sale price
- assigned agent
- next payment
- payment status
- created date

Filters:
- status
- agent
- client
- project/building/unit
- payment status
- date range

### Deal Profile

Route:
- `/portal/management-x7k9/crm/deals/[dealId]`

Sections:
- deal header
- client card
- unit card
- price calculator
- payment plan
- payments table
- documents
- tasks
- activity timeline

Quick actions:
- reserve
- prepare contract
- mark contract signed
- create/activate payment plan
- mark payment paid
- upload document
- mark sold
- cancel deal

### Calculator UI

Fields:
- list price
- discount percent
- discount amount
- sale price
- initial payment percent
- initial payment amount
- term months
- monthly payment preview
- custom schedule toggle

Buttons:
- preview
- save as draft payment plan
- activate payment plan

Validation:
- sale price cannot be negative
- initial payment cannot exceed sale price
- term months required for installment
- payment date required for generated schedule

### Documents UI

List columns:
- type
- title
- linked record
- status
- uploaded by
- uploaded date
- reviewed by

Document actions:
- download/open
- approve
- reject
- replace
- mark expired

### Finance UI

Finance tab inside deal:
- total deal amount
- initial payment
- total expected
- total paid
- total remaining
- overdue amount
- next due date
- payments table

Payment row actions:
- mark paid
- partial payment
- attach receipt
- add note

## Public UI

Public pages should only change in these ways:

- unit inquiry can create lead with selected unit
- sold/reserved units can offer waitlist or contact form if enabled
- public page never shows internal client/deal/payment/document data
- public unit status can show available/reserved/sold only

## Permissions

V1 role mapping:
- `back_office` receives the finance/legal permissions listed below.
- `finance` and `legal` are optional aliases only when a client buys separated workflows.
- `marketing` is optional and should not see deal details unless reports are anonymized.

### Deals

- Owner/admin/sales_director: view all deals.
- Sales agent: view assigned deals only.
- Back office/finance/legal: view all deals, but edit only finance/legal fields.
- Marketing: no default deal access unless reports are anonymized.

### Unit Reservation

- Sales agent can request or create reservation only for assigned client/lead if allowed.
- Sales director/admin/owner can reserve any available unit.
- Back office/finance/legal cannot reserve unless also sales role.

### Mark Sold

- Owner/admin/sales_director can mark sold.
- Sales agent cannot mark sold by default.
- Back office/finance can confirm payment but not mark sold unless configured.

### Payments

- Back office/finance/admin/owner can mark paid.
- Sales director can view.
- Sales agent can view payment summary for own deals if enabled.

### Documents

- Back office/legal/admin/owner can approve/reject.
- Sales can upload requested docs.
- Back office/finance can approve receipts if enabled.

## Edge Cases

- Unit price changes after deal draft: keep deal snapshot and show "unit price changed" warning.
- Unit reserved by two agents at same time: server must block second reservation.
- Deal cancelled after partial payment: create refund review record/task; finance handles actual money movement outside app.
- Client wants two units: v1 supports one primary unit, DealUnit table allows future expansion.
- Payment date falls on invalid calendar day: use last valid day of month.
- Discount above threshold: write flagged activity and require owner/director approval before sold.
- Document rejected after sold: keep sold status but flag document issue.
- Payment plan edited after payments exist: create warning and require finance/admin confirmation.
- Reservation expires: dashboard flags it; scheduled job can auto-release only if setting enabled.
- USD price paid in UZS: store historical exchange rate on payment.

## Test Plan

### API Tests

- Create deal from lead.
- Reserve available unit.
- Block reservation of sold unit.
- Block duplicate reservation.
- Reservation sets expiry and reminder task.
- Scheduled reservation expiry job is idempotent.
- Mark deal sold updates unit sold.
- Cancel reserved deal releases unit.
- Cancel paid deal creates refund review record/task.
- Calculator returns correct totals.
- Calculator handles custom schedule rows.
- Payment plan generation creates expected number of payments.
- Overdue payment job marks scheduled payments overdue.
- Mark payment paid updates paid/remaining status.
- Payment stores both deal currency and payment currency when different.
- Upload document links to deal.
- Reject document requires reason.

### UI Tests

- Deal list filters by status/agent/unit.
- Deal profile shows unit and client.
- Calculator updates preview correctly.
- Payment plan rows render.
- Custom schedule rows render.
- Document upload appears in document table.
- Unit detail shows linked deal.

### Permission Tests

- Sales agent cannot mark payment paid.
- Sales agent cannot see other agent deals.
- Finance can update payment but not reassign lead.
- Legal can approve documents but not mark payment paid.

### Manual Smoke Test

1. Submit public lead for unit.
2. Open lead in CRM.
3. Create client/deal.
4. Reserve unit.
5. Create calculator/payment plan.
6. Upload passport and contract.
7. Mark first payment paid.
8. Mark deal sold.
9. Confirm unit is sold publicly.
10. Confirm no client PII appears publicly.

## Estimated Time

Solo developer:
- Data model and migrations: 4-6 days.
- Deal APIs/workflows: 5-7 days.
- Calculator/payment plan: 4-6 days.
- Documents: 3-5 days.
- Admin UI: 8-12 days.
- Tests and polish: 4-6 days.

Total: 2-3 weeks after CRM core.

Buffered client-facing estimate:
- 3-5 weeks after CRM core.

## Acceptance Checklist

- [ ] Deals exist and link client, lead, unit, and agent.
- [ ] Reserving a unit updates both deal and unit.
- [ ] Reservation expiry and reminder behavior exists.
- [ ] Expired reservations are visible.
- [ ] Marking sold updates both deal and unit.
- [ ] Cancelling reserved deal can release unit.
- [ ] Cancelling paid deal creates refund review.
- [ ] Discount-above-threshold is flagged and approval-gated.
- [ ] Calculator preview works.
- [ ] Custom payment schedules support deferred, step-up, balloon, and milestone rows.
- [ ] Payment plan can be generated and activated.
- [ ] Payments can be marked paid/partial/overdue.
- [ ] Overdue payment scheduled job exists.
- [ ] Dual USD/UZS payment recording is supported.
- [ ] Basic reservation slip PDF is planned or implemented in this phase.
- [ ] Documents can be uploaded, approved, and rejected.
- [ ] Unit admin shows related deal/client/payment/docs.
- [ ] Back office/finance/legal permissions are enforced.
- [ ] Public pages expose no private deal/client/payment/doc data.
- [ ] Build passes.
