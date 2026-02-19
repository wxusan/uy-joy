# UyJoy — Interactive Apartment Platform

A modern, production-ready Next.js application for visualizing and managing apartment residency. Built with an interactive SVG floor plan viewer, real-time status updates, and a complete admin panel.

"Uy Joy" means "home" in Uzbek 🇺🇿

## Features

- 🏢 **Interactive Floor Plans** — SVG-based floor plans with color-coded unit status
- 🎯 **Building Visualization** — Building elevation view with clickable floors
- 💰 **Dynamic Pricing** — Per-floor base prices with unit-specific overrides
- 🔐 **Admin Panel** — Secure dashboard for managing projects, units, and users
- 📱 **Responsive Design** — Mobile-first approach with Tailwind CSS
- 🗃️ **SQLite Database** — Zero-config local database with Prisma ORM

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** SQLite + Prisma ORM
- **Auth:** NextAuth.js (Credentials provider)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for local development).

### 3. Initialize the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Seed demo data

```bash
npx prisma db seed
```

This creates:
- 1 project: "Navruz Residence"
- 1 building: "Block A" with 9 floors
- 54 apartments with varied sizes and statuses
- 1 superadmin user

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

**Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)

- **Email:** admin@navruz.uz
- **Password:** admin123

## Project Structure

```
uy-joy/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Demo data seeder
│   └── dev.db             # SQLite database file
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── projects/[projectId]/
│   │   │   ├── page.tsx                # Project detail page
│   │   │   └── explore/page.tsx        # Interactive floor plan viewer
│   │   ├── admin/
│   │   │   ├── page.tsx                # Dashboard
│   │   │   ├── projects/               # Project management
│   │   │   └── users/                  # User management (superadmin)
│   │   └── api/                        # API routes
│   ├── components/
│   │   ├── FloorPlanSVG.tsx            # Interactive SVG floor plan
│   │   ├── FloorSelector.tsx           # Floor list with availability
│   │   ├── UnitDetailModal.tsx         # Unit information popup
│   │   └── ...                         # Other UI components
│   └── lib/
│       ├── prisma.ts                   # Prisma client singleton
│       ├── auth.ts                     # NextAuth configuration
│       └── utils.ts                    # Helper functions
└── ...
```

## Unit Status Colors

- 🟢 **Available** — Green (#22c55e)
- 🟡 **Reserved** — Yellow (#eab308)
- 🔴 **Sold** — Red (#ef4444)

## Price Tiers (Demo Data)

| Floors | Price per m² |
|--------|-------------|
| 1-3    | 8,000,000 UZS |
| 4-6    | 10,000,000 UZS |
| 7-9    | 12,000,000 UZS |

Corner units (positions 0 and 5) have a 15% premium.

## Development

### Reset Database

```bash
npx prisma db push --force-reset
npx prisma db seed
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
