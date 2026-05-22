# UyJoy — White-Label Real-Estate Sales Platform

A Next.js platform for client-branded apartment sales: public lead pages, CRM, inventory, deals, payments, documents, reports, Telegram delivery, and white-label deployment controls.

"Uy Joy" means "home" in Uzbek.

## Features

- **White-label settings** — client env/status, feature plan, integrations, users, password operations
- **Public sales page** — branded content, apartments, lead capture, Telegram outbox
- **CRM** — leads, clients, tasks, pipeline, role-scoped visibility
- **Real estate layer** — inventory, deals, reservations, payment plans, documents, refunds
- **Reports** — executive, sales, inventory, finance, marketing, agent, weekly digest

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (Credentials provider)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill required values, especially `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `CLIENT_SLUG`, `CLIENT_PLATFORM_PLAN`, `CRON_SECRET`, and Cloudinary credentials.

### 3. Initialize the database

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Create first admin

```bash
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='StrongPass12345' npm run admin:create-first
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

Use the launch docs before every paid white-label deployment:

- `docs/crm-platform/06-client-launch-checklist.md`
- `docs/runbook.md`
- `LAUNCH_CHECKLIST.md`

Smoke test:

```bash
SMOKE_SITE=https://client-domain npm run smoke:client
```

Demo reset for the sales instance:

```bash
DEMO_DATABASE_CONFIRM=demo npm run demo:reset
```

Use `.env.demo.example` only with a dedicated demo database.

## Project Structure

```
uy-joy/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # PostgreSQL migrations
│   └── seed.ts            # Demo data seeder
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Public white-label page
│   │   ├── apartments/                 # Public apartment inventory
│   │   ├── portal/management-x7k9/     # Admin CRM
│   │   └── api/                        # API routes
│   ├── components/
│   │   ├── AdminSidebar.tsx            # Role/feature gated admin nav
│   │   ├── BuildingViewer.tsx          # Interactive public inventory
│   │   ├── ApartmentLeadModal.tsx      # Public lead capture
│   │   └── ...                         # Other UI components
│   └── lib/
│       ├── prisma.ts                   # Prisma client singleton
│       ├── auth.ts                     # NextAuth configuration
│       ├── platform-plans.ts           # Plan/feature/role source of truth
│       ├── platform-settings.ts        # Env-backed client settings
│       └── utils.ts                    # Helper functions
└── ...
```

## Development

### Reset Database

```bash
npx prisma migrate reset
```

### View Database

```bash
npx prisma studio
```

### Build for Production

```bash
npm run build
npm start
```

## License

MIT
