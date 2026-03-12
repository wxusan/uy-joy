# CLAUDE.md — UyJoy Codebase Guide

## Project Overview

**UyJoy** is an interactive apartment sales platform for a residential complex in Uzbekistan. It lets buyers visually browse apartments by clicking on building elevations and floor plan SVG polygons, and gives admins a full CMS to manage projects, buildings, floors, units, leads, and media.

**Target market**: Uzbekistan real estate. Default language is Uzbek (`uz`). Three locales: `uz`, `ru`, `en`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database ORM | Prisma (PostgreSQL via Neon) |
| Auth | NextAuth.js v4 (credentials provider, JWT sessions) |
| i18n | next-intl + cookie-based locale |
| Image hosting | Cloudinary |
| AI features | Google Gemini 1.5 Flash |
| Analytics | PostHog |
| Fonts | Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono |

---

## Directory Structure

```
uy-joy/
├── messages/               # next-intl translation files
│   ├── uz.json             # Uzbek (default)
│   ├── ru.json             # Russian
│   └── en.json             # English
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
├── scripts/                # One-off data migration scripts
│   └── data/               # JSON export snapshots
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Public home page (ISR, 60s)
│   │   ├── layout.tsx      # Root layout (fonts, i18n, PostHog)
│   │   ├── kvartiralar/    # Apartments listing page
│   │   ├── vizual/         # Visual/3D tour page
│   │   ├── projects/[projectId]/
│   │   │   ├── page.tsx    # Project detail
│   │   │   └── explore/    # Interactive floor explorer
│   │   ├── portal/management-x7k9/   # Admin portal (obscured URL)
│   │   │   ├── login/      # Auth login
│   │   │   ├── projects/   # CRUD for projects → buildings → floors → units
│   │   │   ├── leads/      # CRM lead management
│   │   │   ├── analytics/  # Analytics dashboard
│   │   │   ├── faqs/       # FAQ management
│   │   │   ├── hero-images/# Hero image management
│   │   │   └── users/      # User management
│   │   └── api/            # REST API routes
│   │       ├── auth/[...nextauth]/
│   │       ├── projects/   # CRUD
│   │       ├── buildings/  # CRUD + floor-positions
│   │       ├── floors/     # CRUD + copy-to-all
│   │       ├── units/      # CRUD + bulk PATCH
│   │       ├── leads/      # CRUD
│   │       ├── faqs/       # CRUD
│   │       ├── hero-images/# CRUD
│   │       ├── users/      # CRUD
│   │       ├── upload/     # Cloudinary file upload
│   │       └── ai/
│   │           ├── translate/          # Gemini text translation
│   │           ├── detect-apartments/  # Gemini polygon detection from floor plan image
│   │           └── detect-floors/      # Gemini floor detection from building image
│   ├── components/         # Shared React components
│   │   ├── admin/          # Admin-only components
│   │   │   ├── PolygonEditor.tsx       # SVG polygon draw/edit tool
│   │   │   ├── TopViewMapper.tsx       # Aerial view building mapper
│   │   │   ├── FloorPositionEditor.tsx # Building elevation click zones
│   │   │   └── TranslatedInput.tsx     # Multi-language input with AI translate
│   │   └── [public components]
│   ├── hooks/
│   │   └── useTranslatedContent.ts    # Client hook: get DB translation for current locale
│   ├── lib/
│   │   ├── auth.ts         # NextAuth options
│   │   ├── prisma.ts       # Prisma client singleton
│   │   ├── cached-queries.ts # unstable_cache wrappers (ISR)
│   │   ├── cloudinary.ts   # URL optimization helpers
│   │   ├── translations.ts # DB content translation helpers
│   │   ├── locales.ts      # Locale constants (uz/ru/en, default=uz)
│   │   ├── flags.ts        # Feature flags (SHOW_AI)
│   │   └── utils.ts        # General utilities
│   ├── types/
│   │   └── index.ts        # Shared TypeScript interfaces
│   ├── middleware.ts        # Auto-detect locale from Accept-Language, set cookie
│   └── i18n.ts             # next-intl request config (reads locale cookie)
├── tailwind.config.ts
├── next.config.mjs         # next-intl plugin, Cloudinary remote patterns
└── tsconfig.json
```

---

## Data Model

The core hierarchy is: **Project → Building → Floor → Unit**

```
Project
  ├── name / nameTranslations (JSON)
  ├── description / descriptionTranslations (JSON)
  ├── address / addressTranslations (JSON)
  ├── coverImage, topViewImage (Cloudinary URLs)
  ├── latitude, longitude
  ├── infrastructure (JSON — nearby places)
  ├── expectedYear (completion year)
  └── buildings[]
        ├── name / nameTranslations
        ├── frontViewImage, backViewImage, leftViewImage, rightViewImage
        ├── polygonData (JSON [{x,y},...] — position on aerial view, as % of image)
        ├── labelX, labelY, pointX, pointY, labelScale (aerial view positioning)
        ├── sortOrder
        └── floors[]
              ├── number (floor number, 1-based)
              ├── basePricePerM2
              ├── floorPlanImage (Cloudinary URL)
              ├── positionData (JSON {yStart, yEnd} — clickable zone on building elevation)
              └── units[]
                    ├── unitNumber (e.g. "701", "702")
                    ├── rooms, area
                    ├── status: "available" | "reserved" | "sold"
                    ├── pricePerM2, totalPrice
                    ├── polygonData (JSON [{x,y},...] — unit outline on floor plan, % coords)
                    ├── labelX, labelY
                    ├── sketchImage, sketchImage2, sketchImage3, sketchImage4
                    ├── description / descriptionTranslations (JSON)
                    ├── features (JSON)
                    └── customerName, customerPhone, customerNotes, statusChangedAt

Lead               # CRM: name, phone, projectId, unitId, status, source, notes
HeroImage          # Homepage slideshow images, sortOrder
FAQ                # questionUz/En/Ru + answerUz/En/Ru, sortOrder, isActive
User               # email, password (bcrypt), name, role (default "admin")
```

**Important**: All polygon coordinates are **percentages (0–100)** relative to the image dimensions, not pixel values.

---

## Two Translation Systems

### 1. UI strings — next-intl (`messages/*.json`)
Used for static UI text. Server components use `getTranslations()`, client components use `useTranslations()`.

```typescript
// Server
const t = await getTranslations("explore");
t("selectFloor"); // "Select a floor to view apartments"

// Client
const t = useTranslations("admin");
t("saving"); // "Saving..."
```

### 2. DB content — custom JSON fields (`*Translations` columns)
Admin-entered content (project names, descriptions, unit descriptions) is stored as JSON in `*Translations` columns alongside the original value.

```typescript
// Schema pattern
name: String           // original/fallback value
nameTranslations: String?  // JSON: {"uz": "...", "ru": "...", "en": "..."}

// Server components
import { getTranslation } from "@/lib/translations";
const locale = (cookieStore.get("locale")?.value || "uz") as Locale;
const projectName = getTranslation(project.nameTranslations, project.name, locale);

// Client components
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
const { t, locale } = useTranslatedContent();
const name = t(project.nameTranslations, project.name);
```

Fallback chain: requested locale → `uz` → `ru` → `en` → first available → original field value.

---

## Locale System

- Supported: `uz`, `ru`, `en` — default is `uz` (Uzbek)
- Locale is stored as a **cookie** (`locale`) with 1-year expiry
- Middleware (`src/middleware.ts`) auto-sets the cookie from `Accept-Language` on first visit
- `src/i18n.ts` reads the cookie for next-intl server-side config
- `LanguageSwitcher` component sets the cookie client-side

---

## Admin Portal

URL: `/portal/management-x7k9/` (security-by-obscurity)

- **Auth**: NextAuth.js credentials provider, bcrypt password hashing, JWT sessions
- **Session check**: `AdminGuard` client component in the admin layout redirects unauthenticated users to `/portal/management-x7k9/login`
- **Navigation tree**: Projects → Buildings → Floors → Floor Plan Editor (polygon draw tool)

### Floor Plan Editor (`/portal/management-x7k9/projects/[projectId]/buildings/[buildingId]/floors/[floorId]/editor`)
The most complex admin page. Features:
- Upload floor plan image
- Draw/edit/delete unit polygons via `PolygonEditor` component
- Select a polygon to edit unit details (number, rooms, area, status, price, photos)
- AI-detect apartments from floor plan image (Gemini, feature-flagged)
- Copy layout to all floors in the building
- Renumber all units in `{floor}{order:02d}` format (e.g. floor 7 → "701", "702")

---

## API Routes

All routes are in `src/app/api/`. They follow REST conventions:
- `GET /api/units?floorId=&status=&projectId=&rooms=` — list with optional filters
- `GET /api/units?page=1&limit=50` — paginated (only when `page` param present)
- `POST /api/units` — create
- `PUT /api/units/[id]` — update
- `DELETE /api/units/[id]` — delete
- `PATCH /api/units` — bulk update `{ unitIds: string[], data: { status?, pricePerM2?, totalPrice? } }`

After mutations that affect public data, routes call `revalidateTag("project")` to bust the ISR cache.

### Upload API (`/api/upload`)
- Accepts `multipart/form-data` with `file`, `type` (`project|building|floor|unit|hero`), and `id`
- Uploads to Cloudinary under `uy-joy/{type}/` folder
- Returns `{ url, filename }` — always store the full Cloudinary URL

### AI APIs (require `GEMINI_API_KEY`)
- `POST /api/ai/translate` — translates text to uz/ru/en using Gemini 1.5 Flash
- `POST /api/ai/detect-apartments` — analyzes floor plan image, returns polygon coordinates
- `POST /api/ai/detect-floors` — analyzes building elevation image, returns floor zones

---

## Caching Strategy

Public pages use ISR with `export const revalidate = 60` (60-second cache).

Cached queries in `src/lib/cached-queries.ts` use `unstable_cache` with tags:
- `"project"` tag — busted by any mutation to projects/buildings/floors/units
- `"hero-images"` tag — busted by hero image mutations
- `"faqs"` tag — busted by FAQ mutations

---

## Image Handling

All images are hosted on Cloudinary. Use the helpers in `src/lib/cloudinary.ts` when rendering:

```typescript
import { getHeroImageUrl, getCardImageUrl, getFullImageUrl, getThumbnailUrl } from "@/lib/cloudinary";

getHeroImageUrl(url)    // 1600px wide, best quality
getFullImageUrl(url)    // 1200px wide, good quality
getCardImageUrl(url)    // 600px wide, good quality
getThumbnailUrl(url)    // 400×400, eco quality
```

The `next.config.mjs` allows remote images from `res.cloudinary.com`.

---

## Feature Flags

Defined in `src/lib/flags.ts`:

```typescript
export const SHOW_AI = (process.env.NEXT_PUBLIC_SHOW_AI || "false").toLowerCase() === "true";
```

The AI detection button in the floor plan editor is hidden unless `NEXT_PUBLIC_SHOW_AI=true`.

---

## Unit Numbering Convention

Unit numbers follow the pattern `{floorNumber}{unitIndex:02d}`:
- Floor 7, unit 1 → `"701"`
- Floor 7, unit 10 → `"710"`
- Floor 12, unit 3 → `"1203"`

The "Renumber All" button in the floor plan editor sorts units by polygon centroid position (top-to-bottom, left-to-right) and applies this format.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# PostgreSQL (Neon serverless recommended)
DATABASE_URL="postgresql://..."

# Turso (optional SQLite alternative — see .env.example)
TURSO_DATABASE_URL="libsql://..."
TURSO_AUTH_TOKEN="..."

# NextAuth
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary (required for image uploads)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# AI features (optional)
GEMINI_API_KEY="..."
OPENAI_API_KEY="sk-..."      # listed but Gemini is the primary AI

# Feature flags
NEXT_PUBLIC_SHOW_AI="false"  # set to "true" to show AI buttons in admin
```

---

## Development Workflow

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push         # sync schema to DB
npx prisma db seed         # or: npm run seed

# Start dev server
npm run dev                 # http://localhost:3000

# Build for production
npm run build               # runs prisma generate then next build

# Lint
npm run lint
```

### Admin access
After seeding, log in at `/portal/management-x7k9/login`. Check `prisma/seed.ts` for the default credentials.

---

## Key Conventions

### Components
- **Server components by default** — use `async` and `await` data fetching directly
- Mark with `"use client"` only when using hooks, state, or browser APIs
- Admin pages that need interactivity split into `page.tsx` (server, fetches data) + `*Client.tsx` (client, handles interactions)

### State updates in admin
- Use optimistic updates where possible — update local state immediately, then confirm with the server
- After mutations, call `revalidateTag(...)` on the server to bust the ISR cache

### Translations in new DB content fields
- Follow the existing pattern: add a `fooTranslations String?` column alongside `foo String`
- Use `getTranslation(field.fooTranslations, field.foo, locale)` to read
- Use `createTranslationsJson({ uz, ru, en })` from `src/lib/translations.ts` to write

### API response shapes
- List endpoints return plain arrays unless paginated (paginated: `{ data, total, page, pages }`)
- Single-item endpoints return the object directly
- Error responses: `{ error: string }` with appropriate HTTP status

### Styling
- Tailwind CSS only — no CSS modules or styled-components
- Color palette: `emerald-*` for primary/CTA, `slate-*` for neutrals, `red-*` for errors/sold, `yellow-*` for reserved
- Admin UI uses `slate-900` sidebar, `slate-50` background, white cards with `shadow-sm border`

### No test suite
There are currently no automated tests. Verify changes manually in the browser.
