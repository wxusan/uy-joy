# White-Label Product Architecture Plan

## Goal

Build Uy Joy as a productized white-label real-estate sales platform. The platform is a reusable "shablon" codebase, but every paying client receives an individual deployed product: their own public page, CRM URL, database, domain, media storage configuration, Telegram bot/channel, users, branding, and operational data.

The CRM should stay mostly standardized so it can be maintained profitably. The public page should be customized heavily enough that each client feels the platform belongs to their brand.

## Current Repo Context

- The app is a Next.js 14 App Router project with TypeScript, Tailwind, Prisma, NextAuth, next-intl, Cloudinary, PostHog, OpenAI, and Google Generative AI dependencies.
- The admin portal currently lives under `/portal/management-x7k9`.
- Existing core models are `User`, `Project`, `Building`, `Floor`, `Unit`, `Lead`, `HeroImage`, and `FAQ`.
- Existing CRM behavior is basic: public forms create `Lead` records, admin can list leads, filter locally, export CSV, and update status.
- Existing public product already has real-estate strengths: public project page, apartment listing, interactive visual explorer, unit modal, multilingual content, contact forms, and Telegram/Instagram public links.
- Existing auth has roles as string values: `admin`, `superadmin`, `developer`.
- Current middleware protects admin pages and selected APIs. `/api/leads` allows public `POST` and protects admin `GET`.
- Current app is closer to a single project/client deployment than a multi-company SaaS database.

## Business Architecture

### Platform Positioning

Use this language in product and sales material:

> We build your own branded digital sales platform: custom public page, lead capture, Telegram bot alerts, real-estate CRM, sales agents, apartment inventory, payment plans, documents, and reports. It runs on your own domain with your own database and your own brand.

### Product Shape

- Master codebase: Uy Joy owns and maintains one reusable repo.
- Client instance: each client receives a separate deployment from that repo.
- Public page: customized per client.
- CRM: standardized workflow with light branding.
- Database: separate database per client.
- Domain: separate domain or subdomain per client.
- Media: separate Cloudinary folder/account/prefix per client.
- Integrations: separate tokens and credentials per client.
- Data ownership: no shared operational tables between different clients.

### Why Single-Tenant First

Choose one deployment/database per client for the first commercial version.

Benefits:
- Easier privacy story for clients.
- Easier custom public design and domain setup.
- Safer database access boundaries.
- Easier client export or handoff if needed.
- Lower implementation complexity than full multi-tenant SaaS.

Tradeoff:
- More deployment operations per client.
- Updates must be rolled out carefully across instances.

Default decision: use single-tenant white-label deployments until at least 5-10 paying clients prove the business model.

## Client Instance Architecture

Each client instance must have:

- `NEXTAUTH_URL`: client CRM/public domain.
- `DATABASE_URL`: client-specific Postgres database.
- `DIRECT_URL`: direct database URL for migrations if required.
- `NEXTAUTH_SECRET`: unique per deployment.
- `CLIENT_SLUG`: stable client identifier stamped into logs, jobs, and support tracking.
- `CRON_SECRET`: secret header for scheduled jobs such as Telegram outbox, overdue payments, and reservation expiry.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: client or Uy Joy managed credentials.
- `TELEGRAM_BOT_TOKEN`: client bot token or Uy Joy managed bot token.
- `TELEGRAM_CHAT_ID`: client group/channel/user target.
- Optional `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`: SMS provider credentials.
- Optional `INSTAGRAM_*` and `META_*`: Instagram/Meta integration credentials.
- Optional `OPENAI_API_KEY` and `GEMINI_API_KEY`: AI features.
- Optional `NEXT_PUBLIC_POSTHOG_KEY`: analytics.

Each client instance must store a `PlatformSettings` style record or equivalent configuration with:

- company legal name
- public brand name
- logo URL
- favicon URL
- primary color
- secondary color
- accent color
- default locale
- enabled locales
- public phone number
- public Telegram URL
- public Instagram URL
- sales office address
- sales hours
- active subscription plan
- feature flags
- user limit
- project limit
- storage limit label
- created by Uy Joy support contact

## Standardized vs Customized Boundary

### Always Standardized

These should remain mostly identical across clients:

- CRM sidebar layout
- lead pipeline logic
- client profile structure
- activity timeline structure
- task/follow-up behavior
- roles and permissions
- deal/payment/document core workflows
- dashboards and reports
- export behavior
- API security rules
- database schema

### Lightly Customized

These can change per client without custom code:

- CRM logo
- CRM brand name
- CRM primary color
- public contact information
- languages enabled
- status labels if needed
- sales agent list
- source labels
- project/building/unit data
- Telegram bot target

### Heavily Customized

These are paid setup/design work:

- public page design
- hero copy and media
- project storytelling
- visual apartment explorer assets
- custom public sections
- public page animations
- branded PDF templates

### Paid Custom Add-ons

These must not be included in base pricing unless explicitly sold:

- custom CRM workflow for one client
- custom external ERP/accounting integration
- bank/mortgage provider integration
- custom legal contract generator
- WhatsApp integration
- call center provider integration
- customer portal
- broker portal
- deep analytics warehouse/export

## Package Architecture

### Package 1: Lead Page + Bot

Purpose: fastest product to sell.

Includes:
- branded public landing/project page
- lead form
- phone validation
- spam protection
- Telegram bot/channel alert
- basic admin lead inbox or CSV export
- source tracking
- one admin user

Excludes:
- full CRM pipeline
- sales agent assignment
- unit/deal/payment workflows
- reports beyond simple lead count/export

### Package 2: CRM Starter

Includes everything in Lead Page + Bot, plus:
- lead/client profiles
- sales pipeline
- sales agents
- assignments
- tasks and follow-ups
- activity timeline
- basic dashboards
- up to 3 users by default
- CSV exports

Excludes:
- payment plan tracking
- finance dashboard
- document approval workflow
- SMS/Instagram/calling integrations unless purchased

### Package 3: Real Estate CRM Growth

Includes CRM Starter, plus:
- inventory management
- unit to deal linkage
- reservation/sold workflow
- calculator
- payment plan draft and tracking
- document upload
- agent performance reports
- source performance reports
- up to 10 users by default

### Package 4: Full Sales Platform

Includes Real Estate CRM Growth, plus:
- custom public page
- stronger reporting
- finance dashboard
- SMS integration
- AI assistant basics
- branded document templates if included in scope
- onboarding/training
- support SLA

### Package 5: Enterprise Custom

Includes:
- multi-project or multi-company custom setup
- custom integrations
- dedicated support
- advanced roles
- custom deployment process
- custom reporting
- negotiated usage limits

## Feature Flags

Use feature flags so package differences are explicit.

Required flags:

- `publicPage`: branded public page enabled.
- `leadBot`: Telegram lead notifications enabled.
- `crm`: CRM navigation and pages enabled.
- `pipeline`: Kanban pipeline enabled.
- `salesAgents`: assignment and agent profiles enabled.
- `tasks`: tasks/follow-ups enabled.
- `inventory`: real-estate inventory management enabled.
- `deals`: deal/purchase records enabled.
- `calculator`: price/payment calculator enabled.
- `paymentPlans`: payment plan records enabled.
- `documents`: document upload and document statuses enabled.
- `reports`: dashboard/report pages enabled.
- `financeReports`: finance dashboard enabled.
- `sms`: SMS provider enabled.
- `instagram`: Instagram/Meta integration enabled.
- `calling`: calling integration/logging enabled.
- `aiAssistant`: AI summaries/replies/suggestions enabled.
- `customerPortal`: buyer portal enabled.
- `brokerPortal`: broker/partner portal enabled.

Flag rules:
- Hidden UI must not be the only protection. API routes must check feature availability.
- Feature-disabled API routes should return `403` for authenticated users.
- Public form must still work for Lead Page + Bot plan.
- Reports should degrade gracefully if some feature data does not exist.

### Package To Feature Flag Matrix

This table is the v1 source of truth. Implementation should mirror it in one server-side module, for example `src/lib/platform-plans.ts`, and all UI/API checks should import from that module.

| Feature | Lead Page + Bot | CRM Starter | Real Estate CRM Growth | Full Sales Platform | Enterprise |
|---|---:|---:|---:|---:|---:|
| `publicPage` | yes | yes | yes | yes | yes |
| `leadBot` | yes | yes | yes | yes | yes |
| `crm` | no | yes | yes | yes | yes |
| `pipeline` | no | yes | yes | yes | yes |
| `salesAgents` | no | yes | yes | yes | yes |
| `tasks` | no | yes | yes | yes | yes |
| `reports` | lead count | basic | standard | advanced | custom |
| `inventory` | optional display | optional display | yes | yes | yes |
| `deals` | no | no | yes | yes | yes |
| `calculator` | no | no | yes | yes | yes |
| `paymentPlans` | no | no | yes | yes | yes |
| `documents` | no | no | yes | yes | yes |
| `financeReports` | no | no | basic | yes | custom |
| `sms` | add-on | add-on | add-on | included/add-on | custom |
| `instagram` | add-on | add-on | add-on | add-on | custom |
| `calling` | no | call log | call log | add-on | custom |
| `aiAssistant` | no | no | add-on | basic | custom |
| `customerPortal` | no | no | no | add-on | custom |
| `brokerPortal` | no | no | no | add-on | custom |

Rules:
- do not duplicate package limits in random components.
- docs explain packages; code enforces packages from one source.
- changing a package should require editing one module and updating this table.

## Roles And Permissions

### V1 Role Strategy

The full role list below is the long-term permission vocabulary. For v1, keep the live role set smaller so early Uzbek developer clients are not forced to manage too many roles.

V1 required roles:
- `developer`: Uy Joy internal support/engineering only.
- `owner`: client owner or CEO.
- `admin`: client operations admin.
- `sales_director`: sales boss/team lead.
- `sales_agent`: sales user.
- `back_office`: combined finance/legal/admin paperwork user.

V1 optional aliases:
- `finance`: map to `back_office` unless the client buys separated finance workflow.
- `legal`: map to `back_office` unless the client buys separated legal workflow.
- `marketing`: enable only for clients that actively manage campaigns and source reporting.

Reason:
- early clients usually have one sales boss, several agents, and one office/back-office person.
- separating finance/legal/marketing too early adds training and permission complexity.

The definitions below are the full long-term permission vocabulary. V1 should activate only the required role subset above, plus optional aliases only when the sold package needs them.

### Developer Role Definition

`developer` means Uy Joy internal support/engineering staff, not a client-side developer.

Rules:
- developer access is for setup, debugging, migrations, support, and incident response.
- developer must not be used for normal client operations.
- developer access should be disclosed in client contract/SLA.
- future impersonation must require audit logs: actor, target user, reason, start time, end time, client instance, and actions.
- until impersonation is built, developers should log in only as their own developer account.
- developer account creation/deletion is controlled by Uy Joy, not client admins.

### Developer

Can:
- access all admin pages
- access technical settings
- manage env-dependent integrations
- view diagnostics
- run migration/deployment tasks outside app
- impersonation support only if later implemented with audit logs

Cannot:
- be exposed as a client-facing role label unless needed.

### Owner

Can:
- see all leads, clients, deals, units, payments, documents, and reports
- approve major discounts if approval workflow exists
- view finance reports
- view agent performance
- export reports

Cannot by default:
- edit technical integration credentials
- delete system data without explicit delete permission

### Admin

Can:
- manage users
- manage project content
- manage basic CRM settings
- manage public page content
- invite sales agents

Cannot by default:
- change billing plan flags
- edit deployment/infrastructure settings
- permanently delete finance records

### Sales Director

Can:
- view all CRM records
- assign and reassign leads
- manage sales pipeline
- view agent dashboards
- update lead/client/deal statuses
- approve normal reservations
- export sales data

Cannot by default:
- edit finance payment confirmations
- approve legal documents
- edit integration credentials

### Sales Agent

Can:
- see assigned leads and clients
- create activities
- schedule tasks/follow-ups
- move assigned leads through allowed statuses
- create deal drafts
- request reservation

Cannot by default:
- see other agents' leads
- reassign leads to others
- approve big discounts
- mark payment as paid
- approve documents
- delete clients/leads

### Marketing

Can:
- see lead sources and campaign performance
- manage source/campaign labels
- view public page form performance
- export marketing reports

Cannot by default:
- see sensitive documents
- edit payment records
- mark units sold

### Finance

Can:
- view deals
- manage payment plans
- mark payments paid/unpaid/overdue
- upload receipts
- view finance reports
- export payments

Cannot by default:
- reassign leads
- edit public page content
- approve legal documents unless also legal

### Legal

Can:
- view deals and client identity details
- upload/review/approve/reject documents
- manage contract statuses

Cannot by default:
- manage payments
- reassign leads
- edit project inventory

### Back Office

V1 combined finance/legal role.

Can:
- view clients and deals.
- upload and review documents.
- manage payment plans and mark payments paid if finance feature is enabled.
- view finance reports if finance feature is enabled.
- add internal notes.

Cannot by default:
- reassign sales leads.
- change public page design.
- manage technical integration credentials.
- delete clients, leads, or deals.

## Data Ownership Rules

- Client data belongs to the client instance.
- Uy Joy support/developer access should be operational, not casual.
- Every sensitive action should be auditable in later versions.
- No public page should expose customer PII, internal notes, documents, payments, or assigned agents unless intentionally shown in a buyer portal.

## Data Retention And Offboarding

This must be part of the privacy and trust story before selling the platform.

Active subscription:
- client data stays in the client database.
- Uy Joy may access data only for support, maintenance, debugging, migration, or agreed service work.
- backups follow the database provider's retention policy.

Non-payment grace period:
- first 7 days overdue: service remains active and owner/admin sees a payment warning.
- 8-30 days overdue: CRM can become read-only; public lead capture can be paused or kept active depending contract.
- after 30 days overdue: service may be suspended.

Cancellation/offboarding:
- provide export of leads, clients, deals, payments, and documents within the agreed period.
- export format: CSV for structured records, ZIP for uploaded documents when storage allows.
- keep suspended client data for 60-90 days after cancellation unless contract says otherwise.
- delete or archive database and media after retention window only after written confirmation.

Backup note:
- provider backups may retain deleted data for a limited time.
- contract/privacy text must mention backup retention limitations.

## Public Interfaces

Public visitor flow:

1. Visitor opens client public page.
2. Visitor views project, units, pricing, location, or visual explorer.
3. Visitor submits form with name and phone.
4. App validates, rate-limits, and stores lead.
5. Telegram bot sends lead to client.
6. If CRM enabled, lead appears in CRM pipeline.
7. If unit selected, lead stores unit snapshot.

Admin user flow:

1. User logs in at client admin URL.
2. Role decides visible sidebar items.
3. User sees dashboard relevant to role.
4. Sales users work from pipeline/tasks.
5. Owners/directors review dashboards and reports.

## Technical Defaults

- Keep one repo.
- Use Prisma migrations as source of database truth.
- Use NextAuth credentials for v1, add SSO later only if Enterprise requires it.
- Use server-side filtering/pagination for CRM lists.
- Use append-only activity records for important actions.
- Use Cloudinary or configured storage for uploaded files.
- Use Telegram first as integration v1.
- Add SMS after CRM core and public lead page are stable.
- Add Instagram later because approvals and Meta policies can slow launch.

## Rollout Strategy

### Internal Demo

Use Uy Joy/Navruz data as the first serious internal instance.

Must prove:
- CRM can handle real leads.
- Telegram notifications work.
- Sales team can use pipeline daily.
- Owner dashboards make sense.

### Pilot Client

Sell discounted pilot to first 1-3 clients.

Pilot rules:
- limited custom CRM changes
- discount exchanged for testimonial/case study
- explicit monthly subscription from day one
- written scope and add-on list

### Commercial Launch

After pilots:
- publish package pricing
- prepare onboarding checklist
- prepare demo script
- prepare standard contract/scope
- prepare support rules

## Estimates

- Architecture and package definition: 3-5 days.
- Master CRM foundation: 3-4 weeks.
- Real-estate workflows: 2-3 weeks.
- Public page and Telegram bot: 2 weeks.
- Reports: 1-2 weeks.
- White-label deployment process: 1-2 weeks.
- Demo polish: 1 week.

Total:
- Solo developer: 10-14 weeks for a brag-worthy v1.
- Two developers plus light design help: 6-9 weeks.
- Full suite with advanced integrations and AI: 5-7 months.

### Planning Buffer

Add a 30-40% delivery buffer before promising dates to clients.

Buffered commitments:
- solo developer brag-worthy v1: 14-20 weeks.
- two developers plus light design help: 9-13 weeks.
- full mature suite: 7-10 months.

Use unbuffered estimates internally for sprint planning, and buffered estimates for sales/contract commitments.

## Cost Planning

Development can stay close to 0 USD while building on free tiers.

Minimum demo costs:
- domain if needed
- optional paid database/hosting if demo gets traffic
- SMS only if testing paid messages

Pilot costs per client:
- hosting
- database
- storage
- domain
- SMS usage
- monitoring/backups if enabled

Default pricing target:
- Lead Page + Bot: 700-1500 USD setup, 79-149 USD/month.
- CRM Starter: 2500-5000 USD setup, 249-499 USD/month.
- Real Estate CRM Growth: 6000-12000 USD setup, 699-1200 USD/month.
- Full Sales Platform: 15000-30000 USD setup, 1500-3000 USD/month.

Local-market variants:
- Plan 07 defines UZS-anchored monthly variants for price-sensitive Uzbek developers.
- Those variants must reduce scope, support, users, or features explicitly; do not sell the same USD package at half price without narrowing the offer.

## Edge Cases

- Client wants custom CRM workflow: quote as add-on.
- Client wants shared database for multiple brands: defer until Enterprise.
- Client asks for source code ownership: avoid unless priced separately.
- Client wants no subscription: offer one-time website only, not CRM platform.
- Client wants WhatsApp: treat as later add-on due provider complexity.
- Client has no good project assets: sell photo/render/design preparation as setup work.
- Client wants their own server: Enterprise only.
- Client stops paying: follow retention/offboarding policy; do not delete data casually.
- Client asks whether Uy Joy can see their data: answer honestly that Uy Joy developer/support access exists for operations and will be controlled/audited.

## Test Plan

- Verify existing public lead form still creates leads.
- Verify admin lead list still requires auth.
- Verify public page never leaks client PII.
- Verify role-based access is enforced in UI and APIs.
- Verify feature-disabled routes return forbidden.
- Verify new deployment can run migrations from empty database.
- Verify new admin can log in on fresh client instance.
- Verify Telegram bot sends lead notification in test channel.
- Verify build passes before every client deployment.

## Acceptance Checklist

- [ ] Product is explicitly single-tenant white-label for v1.
- [ ] Standardized vs customized boundary is documented.
- [ ] Package feature flags are named.
- [ ] Package-to-feature matrix exists.
- [ ] Roles and permissions are defined.
- [ ] V1 role simplification is defined.
- [ ] Developer role is defined as Uy Joy internal support/engineering only.
- [ ] Client instance requirements are defined.
- [ ] Data retention/offboarding policy is documented.
- [ ] Public and admin flows are defined.
- [ ] Rollout stages are defined.
- [ ] Pricing targets are documented.
- [ ] Client-facing estimates include 30-40% buffer.
- [ ] Edge cases are documented.
- [ ] Another engineer can use this as the architecture source of truth.
