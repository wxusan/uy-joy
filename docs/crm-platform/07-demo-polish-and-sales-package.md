# Demo Polish And Sales Package Implementation Plan

## Goal

Prepare a brag-worthy working demo that can sell the platform to real-estate developers. The demo must show the full story: custom branded public page, lead capture, Telegram bot, CRM pipeline, agent work, unit reservation, calculator, payment plan, documents, and owner reports.

The demo should feel like a finished product, not a developer prototype.

## Current Repo Context

- The current product already has a strong public visual real-estate experience.
- Admin exists and can manage projects, units, FAQs, users, and leads.
- Existing docs and presentations are present in the repo and may be sales collateral.
- The CRM platform plan files define the future system. This file defines how to package and present it.

## Demo Strategy

Build one premium fake client instance called something like:

- `ATLAS Residence / АТЛАС РЕЗИДЕНС`
- `Mirabad Heights / МИРАБАД ҲАЙТС`
- `Nova City / НОВА СИТИ`
- `Yangi Hayot Residence / ЯНГИ ҲАЁТ РЕЗИДЕНС`

Default choice:
- Use one premium bilingual/trilingual demo brand with clean visuals, strong public page, Cyrillic-safe typography, and realistic data.

Purpose:
- show developers what their own branded system could look like
- demonstrate lead journey end-to-end
- justify setup plus monthly pricing
- make the CRM feel operational and serious
- prove the system is local-market ready, not only English SaaS styling.
- show mobile usability for sales agents.

### Demo Infrastructure

Use:
- dedicated demo database.
- dedicated demo Telegram bot.
- muted/private demo Telegram channel.
- fake demo phone numbers.
- fake documents only.
- separate demo PostHog project if analytics are shown.

Rules:
- never send demo leads into a real client or Uy Joy operational channel.
- never use real buyer/client documents.
- demo can be reset between meetings.
- keep a pre-recorded screen recording in case meeting internet is bad.

## Demo Data Requirements

### Company / Brand

Create:
- brand name
- Cyrillic brand name
- Uzbek/Russian/English display names
- logo
- colors
- public phone
- Telegram channel/group
- Instagram link placeholder
- sales office address
- sales hours
- Uzbek/Russian/English content where useful

Colors:
- choose a premium but restrained palette
- avoid making everything one color
- public page can be more branded
- CRM should stay utilitarian
- use a font with Latin and Cyrillic support.

### Project

Create one realistic project:
- project name
- address
- description
- expected completion year
- cover image
- master plan/top view image
- at least 2 buildings
- at least 6 floors per building
- at least 6 units per floor for demo data

### Units

Seed at least:
- 20 available units
- 6 reserved units, each linked to a reserved deal
- 6 sold units, each linked to a sold/payment-active deal

Unit variety:
- 1-room
- 2-room
- 3-room
- 4-room
- different areas
- different price levels
- different buildings/floors

Each unit should have:
- unit number
- rooms
- area
- price per m2
- total price
- status
- building/floor context

### Users / Sales Team

Create:
- owner user
- sales director
- 3 sales agents
- back_office user for finance/legal-style document and payment work
- optional marketing user only if marketing dashboard/campaign reporting is part of the demo

Demo names should look realistic but not be real private client data.

### Clients

Create 20-40 demo clients.

Client types:
- cold new leads
- interested leads
- meeting scheduled
- visited sales office
- negotiating discount
- reserved unit
- contract signed
- sold
- lost

Fields:
- full name
- phone
- preferred language
- source
- assigned agent
- notes

### Leads

Create 30-60 demo leads across statuses.

Sources:
- public page
- apartment page
- visual explorer
- Telegram
- Instagram
- campaign
- manual

Pipeline distribution:
- new: 8
- contacted: 10
- meeting: 8
- negotiation: 7
- reserved: 6
- sold: 6
- lost: 5

Assignment is shown through assigned agents, not an `assigned` pipeline stage.

### Activities

Create realistic timeline records:
- calls
- notes
- Telegram messages
- SMS logs
- meetings
- visits
- status changes
- assignments
- task completions
- document uploads
- payment updates

Every important demo lead should have at least 3 activities.

### Tasks

Create tasks:
- today follow-ups
- overdue follow-ups
- tomorrow meetings
- document requests
- payment reminders

Need:
- visible overdue items for management demo
- visible completed activity for agent performance

### Deals

Create 13 demo deals:
- 4 reserved
- 2 contract preparation
- 2 payment active
- 4 sold
- 1 cancelled/lost

Each deal should link:
- client
- lead
- unit
- sales agent
- sale price
- discount if any
- payment plan if relevant

### Payment Plans

Create payment examples:
- cash purchase
- 12-month installment
- 24-month installment
- mortgage-style plan

Include:
- paid payments
- unpaid future payments
- overdue payment
- partial payment

### Documents

Create placeholder document records:
- passport uploaded
- reservation agreement approved
- contract needs review
- payment receipt uploaded
- one rejected document with reason

Do not use real personal documents.

## Demo Public Page

### Required Sections

Header:
- logo
- phone
- Telegram
- language switcher if multilingual demo enabled

Hero:
- brand/project name as main signal
- strong render/photo
- short offer
- CTA to form
- CTA to apartments/visual explorer

Project overview:
- completion year
- location
- unit count
- starting price
- available units

Apartment highlights:
- 3-6 featured units
- status labels
- prices
- CTA to request call

Lead form:
- name
- phone
- preferred language optional
- submit
- success state

FAQ:
- payment options
- mortgage/installment
- sales office
- documents needed
- reservation process

Footer:
- address
- phone
- Telegram
- Instagram

### Demo Form Behavior

In demo:
1. Fill form with test visitor.
2. Lead appears in CRM.
3. Telegram bot receives message.
4. Source is `public_page`.
5. Campaign can be shown if demo URL has UTM params.

## Demo CRM Flow

### Flow 1: Lead Capture

Script:
1. "This is your public page, fully branded for your project."
2. Submit lead form.
3. Show Telegram notification.
4. Open CRM lead inbox.
5. Show new lead already created.

Value:
- client sees immediate lead delivery
- no manual copying
- sales team can react fast

### Flow 2: Sales Pipeline

Script:
1. Open Kanban pipeline.
2. Show leads by stage.
3. Drag lead from new to contacted.
4. Activity appears automatically.
5. Assign to agent.
6. Schedule follow-up task.

Value:
- owner sees process
- agents see daily work

### Flow 3: Client Profile

Script:
1. Open client profile.
2. Show phone, source, language, assigned agent.
3. Show timeline: form, Telegram, call, meeting, note.
4. Show interested units.

Value:
- all client history in one place

### Flow 4: Unit And Deal

Script:
1. Open unit from lead/deal.
2. Show available status and price.
3. Create deal.
4. Use calculator.
5. Reserve unit.
6. Unit status changes to reserved.

Value:
- CRM connects directly to real inventory

### Flow 5: Payment Plan And Docs

Script:
1. Open deal profile.
2. Show payment plan.
3. Mark one payment paid.
4. Show document upload/approval.
5. Show overdue payment example.

Value:
- sales, finance, and legal work in one system

### Flow 6: Owner Reports

Script:
1. Open executive dashboard.
2. Show lead sources.
3. Show agent performance.
4. Show inventory status.
5. Show finance summary.

Value:
- owner sees business control, not just a website

## Sales Materials

### One-Line Offer

"We build your own branded digital sales office: public page, Telegram lead capture, CRM, apartment inventory, sales agents, payment plans, documents, and reports."

### Package Names

Use simple public-facing names:

- Lead Capture Platform
- Real Estate CRM
- Full Digital Sales Office
- Enterprise Custom Platform

### Pricing Table

Pricing positioning:
- If selling as a premium foreign-style platform, keep USD pricing and emphasize ownership, custom branding, real-estate specificity, and separate database/domain.
- If selling to price-sensitive local developers, offer UZS-anchored monthly options with a lower entry tier.
- Do not position the platform as a cheaper Bitrix24/amoCRM clone. Position it as a developer's own branded sales office connected to inventory, public page, Telegram, payments, docs, and reports.

Lead Capture Platform:
- setup: 700-1500 USD
- monthly: 79-149 USD
- includes public page, lead form, Telegram bot, simple lead inbox/export
- local-market monthly variant: from 490,000-990,000 UZS/month for bot + basic lead inbox, with reduced support and no deep CRM.
- local variant reduction: fewer users, no custom public design beyond simple branding, no SLA, limited support hours, no advanced reports.

Real Estate CRM:
- setup: 2500-5000 USD
- monthly: 249-499 USD
- includes lead capture, CRM pipeline, client profiles, agents, actions, tasks, basic reports
- local-market monthly variant: from 1,500,000-3,500,000 UZS/month depending users and support.
- local variant reduction: user cap, standard CRM template, limited onboarding, no SMS/Instagram/AI, no custom workflow, basic support.

Full Digital Sales Office:
- setup: 6000-12000 USD for Growth, 15000-30000 USD for Pro
- monthly: 699-3000 USD depending scope
- includes inventory, deals, calculator, payments, docs, reports, integrations
- local-market variant should be quoted case-by-case because setup/design quality changes the economics.
- local variant reduction must be written into the quote: fewer integrations, lighter public design, reduced support, or lower user/project limits.

Enterprise:
- setup: 30000 USD+
- monthly: 3000 USD+
- includes custom integrations, multi-project workflows, SLA, advanced permissions

### Add-ons

- visual apartment explorer: 5000-20000 USD
- SMS setup: 500-1500 USD plus SMS cost
- Instagram setup: 1000-3000 USD
- calling setup: 1000-3000 USD
- AI assistant: 199-799 USD/month
- contract generation: 1000-5000 USD
- custom public page section: 500-3000 USD
- data migration: 300-2000 USD
- extra users: 10-25 USD/user/month

## Objection Handling

### "We already use Telegram."

Answer:
- "Good. We do not replace Telegram. We connect Telegram to a system where every lead, agent action, unit, payment, and report is tracked."

### "We already have a website."

Answer:
- "Then we can keep your current website and add lead capture plus CRM, or rebuild the sales page if you want a stronger branded experience."

### "Why monthly payment?"

Answer:
- "Because this is not only a website. It includes hosting oversight, updates, CRM improvements, integrations, support, backups/checks, and continuous operation."

### "Can we pay once?"

Answer:
- "For a static website, yes. For CRM and sales operations, no. The platform needs ongoing maintenance and support."

### "Can CRM be fully custom?"

Answer:
- "The core CRM is standardized so it stays reliable and affordable. Custom workflows are possible as paid add-ons."

### "Is our data separate?"

Answer:
- "Yes. Your platform runs with its own database, domain, users, and configuration."

### "We already use amoCRM or Bitrix24."

Answer:
- "Those are strong general CRMs. We are different because the public page, apartment inventory, unit reservation, payment plans, documents, Telegram lead capture, and owner reports are built into your own branded real-estate platform. We can also start by sending leads to your current CRM if you want a soft transition."

### "Bitrix/amoCRM is cheaper."

Answer:
- "If you only need generic CRM, they may be enough. If you want your own branded sales platform connected to your apartments, website, lead forms, Telegram, documents, payments, and reports, that is the layer we provide."

## Pilot Offer Strategy

For first 1-3 clients:

Offer:
- discount on setup
- normal monthly fee or slightly discounted monthly for first 3 months

In exchange:
- testimonial
- permission to show non-sensitive screenshots
- permission to publish lead/conversion improvement as case study
- fast feedback calls

Do not give:
- unlimited custom features
- lifetime free monthly plan
- source code ownership

## Demo Meeting Script

### Minute 0-2: Positioning

Say:
- "This is not just CRM. It is your digital sales office."
- "Your public page captures demand; the CRM helps your team turn demand into reservations and sales."

### Minute 2-6: Public Page

Show:
- branded page
- apartment/project info
- lead form

Submit:
- demo lead with test phone

### Minute 6-8: Telegram

Show:
- Telegram notification arrives immediately

Say:
- "Your team does not wait for someone to check the website admin."

### Minute 8-15: CRM

Show:
- new lead
- pipeline
- assignment
- activity
- follow-up task
- client profile

### Minute 15-22: Real Estate Workflow

Show:
- interested unit
- calculator
- reserve unit
- payment plan
- documents

### Minute 22-28: Reports

Show:
- owner dashboard
- agent performance
- source conversion
- inventory status
- finance summary

### Minute 28-30: Offer

Show:
- packages
- recommend one package
- timeline
- setup/monthly price
- next step: pilot setup

## Demo Quality Checklist

Before showing a client:

- public page looks polished
- all CTA buttons work
- form creates lead
- Telegram message arrives
- CRM lead opens
- pipeline drag works
- activity timeline has realistic history
- unit/deal/payment/doc demo works
- reports have non-empty charts
- no placeholder "lorem ipsum"
- no obvious developer-only text
- no console errors during demo flow
- no broken images
- no real private data

## API / Server Logic

Demo data should be seeded through scripts, not manual clicking only.

Create or update demo seed script:
- users
- project
- buildings
- floors
- units
- clients
- leads
- activities
- tasks
- deals
- payments
- documents
- ad spend/campaign data if marketing reports are shown

Rules:
- seed data must be fake.
- seed can be reset in demo database.
- never run demo reset on client production database.

### Demo Reset Script

Create a one-command reset before serious demos:
- `npm run demo:reset`

Behavior:
- require `DEMO_DATABASE_CONFIRM=demo` or similar safety env.
- refuse to run if `NODE_ENV=production`.
- delete demo CRM records in safe order.
- recreate demo users, project, units, clients, leads, activities, tasks, deals, payments, documents, and report data.
- print demo login credentials.
- send no Telegram messages during seeding unless `DEMO_SEND_TELEGRAM=true`.

This is required before the second or third sales meeting. Manual cleanup will break the demo.

## Admin UI

Demo admin should include:
- clean sidebar
- branded CRM header
- meaningful dashboard cards
- non-empty pipeline
- readable profile pages
- polished empty/loading states

Avoid:
- raw technical setup screens during sales demo
- showing unfinished integration errors
- showing feature flags unless asked

Do not show:
- stack traces or console errors
- empty dashboards
- half-built SMS/Instagram/calling pages
- raw environment variable pages
- migration/deployment screens
- test users with silly names
- real private leads/documents
- unstyled default browser forms
- pricing admin screens unless discussing package controls

## Public UI

Demo public page must be visually stronger than a normal template.

Requirements:
- brand first viewport signal
- good hero image/render
- clear lead form
- mobile responsive
- project details credible
- no UI overlap
- no broken media
- Cyrillic and Uzbek text render correctly.
- mobile public page and mobile CRM pipeline are demo-ready.

## Permissions

Demo accounts:
- owner account for main demo
- sales agent account to show limited view if asked
- back_office account for payment/document workflows
- optional finance/legal split only if showcasing separated workflow

Do not demo as developer unless showing technical trust.

## Edge Cases

- Telegram fails during meeting: have backup screenshot/video or a second test bot.
- Internet slow: keep local/demo environment ready if possible.
- Wi-Fi fails completely: play pre-recorded 3-5 minute screen recording, then continue discussion.
- Client asks for feature not built: place it in add-ons or roadmap, do not promise free.
- Client asks for discount: discount setup, not monthly, if possible.
- Client asks to start small: sell Lead Capture Platform first, then upgrade path.
- Demo Telegram bot posts too many messages: use muted/private demo channel and reset script with Telegram sending disabled.

## Test Plan

### Demo Rehearsal

Run full demo twice before client meeting:
1. public page form
2. Telegram
3. CRM lead
4. pipeline drag
5. task creation
6. deal creation
7. reservation
8. calculator/payment plan
9. document upload/status
10. reports

### Browser/Device

Check:
- desktop Chrome
- mobile viewport
- mobile phone if available
- public page
- public lead form success state
- admin page
- CRM pipeline on mobile, at least read-only
- lead profile on mobile

### Data

Check:
- all demo numbers make sense
- no impossible payment plan totals
- no empty charts
- no private real names/documents

## Estimated Time

After core features exist:
- demo seed data: 2-3 days
- public page polish: 2-4 days
- reports/demo dashboard polish: 1-2 days
- sales collateral/pricing sheet: 1-2 days
- demo reset script: 1-2 days
- mobile demo fixes and backup recording: 1-2 days
- rehearsal and fixes: 1 day

Total: about 2 weeks for a reliable client-facing demo.

## Acceptance Checklist

- [ ] Demo public page exists.
- [ ] Demo brand supports Latin and Cyrillic.
- [ ] Dedicated demo Telegram bot/channel exists.
- [ ] Demo reset script exists.
- [ ] Backup screen recording exists.
- [ ] Demo form creates lead.
- [ ] Telegram notification arrives.
- [ ] CRM pipeline has realistic leads.
- [ ] Client profiles have activity history.
- [ ] Agents have assignments and tasks.
- [ ] Units include available/reserved/sold examples.
- [ ] Deals exist with payment plans.
- [ ] Documents exist with statuses.
- [ ] Reports are non-empty and useful.
- [ ] Mobile public page and mobile CRM pipeline are demo-ready.
- [ ] Pricing/package table is ready.
- [ ] UZS-anchored pricing variant is documented.
- [ ] Demo script is ready.
- [ ] Objection handling is ready.
- [ ] amoCRM/Bitrix24 objection is covered.
- [ ] "What not to show" list is documented.
- [ ] No real private data is used.
- [ ] Demo can be completed in 30 minutes.
