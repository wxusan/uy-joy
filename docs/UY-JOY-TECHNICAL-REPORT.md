# UY-JOY — Complete Technical Report

---

## 1. PROJECT OVERVIEW

**UY-JOY** is a Next.js real estate visualization and sales platform for a luxury residential apartment complex in Uzbekistan. It features an interactive floor plan explorer (aerial view → building view → floor plan → apartment), a multilingual interface (Uzbek, Russian, English), and a full admin portal for managing buildings, floors, apartments, and sales leads.

---

## 2. TECHNOLOGY STACK

| Category | Technology |
|----------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 5.22 |
| Auth | NextAuth 4.24 (Credentials) |
| Images | Cloudinary 2.9 |
| i18n | next-intl 3.22 |
| Analytics | PostHog |
| AI | OpenAI + Google Generative AI |
| Icons | lucide-react |
| Passwords | bcryptjs |

---

## 3. DATABASE SCHEMA

### User
```
id            String   PK CUID
email         String   unique
password      String   bcrypt hashed
name          String
role          String   default "admin"
createdAt     DateTime
```

### Project
```
id                       String    PK
name                     String
nameTranslations         String?   JSON {uz, ru, en}
description              String?
descriptionTranslations  String?   JSON {uz, ru, en}
address                  String?
addressTranslations      String?   JSON {uz, ru, en}
coverImage               String?   Cloudinary URL
topViewImage             String?   aerial/master plan image
latitude                 Float?    GPS
longitude                Float?    GPS
infrastructure           Json?     nearby amenities
expectedYear             Int?      completion year e.g. 2028
buildings                Building[]
createdAt                DateTime
```

### Building
```
id               String    PK
name             String    e.g. "A", "B", "C"
nameTranslations String?   JSON {uz, ru, en}
projectId        String    FK → Project
floors           Floor[]
frontViewImage   String?   facade photo
backViewImage    String?
leftViewImage    String?
rightViewImage   String?
polygonData      Json?     [{x%, y%}] shape on aerial view
labelX           Float?    label position % of image width
labelY           Float?    label position % of image height
pointX           Float?    center dot position %
pointY           Float?    center dot position %
labelScale       Float?    label size multiplier (default 1.0)
sortOrder        Int       default 0 (A=0, B=1, C=2...)
createdAt        DateTime
```

### Floor
```
id             String    PK
number         Int       floor level
buildingId     String    FK → Building
basePricePerM2 Float?    base price per m²
floorPlanImage String?   floor plan diagram image
positionData   Json?     {yStart%, yEnd%} clickable zone on building view
units          Unit[]
createdAt      DateTime
```

### Unit (Apartment)
```
id                       String    PK
unitNumber               String    e.g. "01", "02"
floorId                  String    FK → Floor
rooms                    Int       number of bedrooms
area                     Float     square meters
status                   String    available | reserved | sold
pricePerM2               Float?
totalPrice               Float?
polygonData              Json?     [{x%, y%}] outline on floor plan
labelX                   Float?    label position %
labelY                   Float?    label position %
sketchImage              String?   photo 1
sketchImage2             String?   photo 2
sketchImage3             String?   photo 3
sketchImage4             String?   photo 4
description              String?
descriptionTranslations  String?   JSON {uz, ru, en}
features                 Json?     ["balcony", "view", ...]
customerName             String?   sale details
customerPhone            String?
customerNotes            String?
statusChangedAt          DateTime?
createdAt                DateTime
updatedAt                DateTime
```

### Lead (Sales Inquiry)
```
id           String    PK
name         String
phone        String
projectId    String?
projectName  String?
unitId       String?   specific apartment if selected
unitNumber   String?
status       String    new | inCRM | callback | inProgress | contacted | converted | notInterested | closed
notes        String?
source       String?   "kvartiralar" | "vizual" | "bosh-sahifa"
assignedTo   String?   team member name
nextFollowUp DateTime?
createdAt    DateTime
```

### HeroImage
```
id        String   PK
imageUrl  String   Cloudinary URL
sortOrder Int      default 0
createdAt DateTime
```

### FAQ
```
id           String   PK
questionUz   String
questionEn   String
questionRu   String
answerUz     String
answerEn     String
answerRu     String
sortOrder    Int      default 0
isActive     Boolean  default true
createdAt    DateTime
```

---

## 4. APP ROUTES

### Public (Customer-Facing)

#### `/` — Home Page
- Hero section (project name, description, CTA buttons)
- Animated stats (total, available, reserved, sold units)
- Interactive explorer (aerial → building → floor → unit)
- Featured apartments carousel
- Location & infrastructure section (Google Maps)
- FAQ accordion
- Contact form
- Data: ISR cached, 60s revalidation

#### `/projects/[projectId]` — Project Detail
- Project overview, stats, price range, features

#### `/projects/[projectId]/explore` — Interactive Floor Plan Explorer
- Full 3-level navigation:
  1. Aerial view with building polygon overlays
  2. Building facade with clickable floor zones
  3. Floor plan with apartment polygon overlays
  4. Unit detail modal (photos, specs, contact form)
- URL state: building/floor selection in query params (shareable links)
- PostHog analytics events on every navigation step

#### `/kvartiralar` — Apartments Listing
- Browsable list/grid of all available apartments

#### `/vizual` — Visual Tour
- Alternative visual navigation entry point

### Admin Portal (Protected — requires NextAuth login)

#### `/portal/management-x7k9/login`
- Email + password login form

#### `/portal/management-x7k9/` — Dashboard
- Summary stats: total units, available, reserved, sold, leads
- Quick navigation to all sections
- Server-rendered (instant load, no spinner)

#### `/portal/management-x7k9/projects`
- Project overview, top view image upload
- Building polygon mapper (draw building shapes on aerial photo)
- Set expected completion year

#### `/portal/management-x7k9/projects/[projectId]/buildings`
- Add/rename/delete buildings
- Upload facade images (front, back, left, right)
- Navigate to floor management

#### `/portal/management-x7k9/projects/[projectId]/buildings/[buildingId]/floors`
- Add/delete floors
- Set floor position (yStart%, yEnd% for clickable zones on building view)
- Upload floor plan images
- Navigate to polygon editor

#### `/portal/management-x7k9/projects/[projectId]/buildings/[buildingId]/floors/[floorId]/editor`
- Visual polygon drawing tool on floor plan image
- Click to place vertices → click first point to close
- Drag vertices to adjust
- Set apartment number, label position
- AI-assisted apartment detection (Google Generative AI)

#### `/portal/management-x7k9/projects/[projectId]/units`
- Bulk unit management
- Filter by building, floor, status, rooms
- Bulk status change (available/reserved/sold)
- Bulk price update
- Upload apartment photos
- Customer reservation details

#### `/portal/management-x7k9/leads`
- All sales inquiries in one table
- Source tracking (kvartiralar / vizual / bosh-sahifa)
- Status management per lead
- CSV export
- Paginated (20 per page)

#### `/portal/management-x7k9/faqs`
- Create/edit/delete FAQs in 3 languages

#### `/portal/management-x7k9/hero-images`
- Manage homepage carousel images

#### `/portal/management-x7k9/analytics`
- Embedded PostHog analytics dashboard

---

## 5. KEY COMPONENTS

### Visualization Chain
```
ExploreClient.tsx          ← state machine (Project → Building → Floor → Unit)
  ├── ProjectTopView.tsx   ← aerial image + SVG building polygon overlays + HTML labels
  ├── BuildingViewer.tsx   ← facade image + floor position overlay zones
  └── FloorPlanPolygon.tsx ← floor plan image + SVG unit polygon overlays
```

**How polygon rendering works:**
- All coordinates stored as 0–100 (percentages of image size)
- SVG uses `viewBox="0 0 100 100"` with `preserveAspectRatio="none"`
- Coordinates used directly — no pixel conversion needed
- Admin `PolygonEditor` uses the same coordinate system → perfect alignment
- `vectorEffect="non-scaling-stroke"` keeps stroke width consistent at all zoom levels

**Building labels (ProjectTopView):**
- Labels are absolutely-positioned HTML `<button>` elements (NOT SVG foreignObject)
- Position: `left: ${labelX}%`, `top: ${labelY}%`
- A line connector runs from the label to the building center dot
- Tailwind responsive sizing: `text-xs sm:text-sm`

**Floor zones (BuildingViewer):**
- Each floor has `positionData: {yStart, yEnd}` as % of building image height
- Rendered as absolute-positioned divs over the facade image
- Hover reveals floor number + available unit count

### Admin Drawing Tools
```
admin/PolygonEditor.tsx     ← draw apartment outlines on floor plan
admin/TopViewMapper.tsx     ← draw building footprints on aerial image + set label positions
admin/FloorPositionEditor.tsx ← drag to set floor zones on building facade
```

### Unit Detail Modal (`UnitDetailModal.tsx`)
- Apartment number (formatted: floor number + unit → "F01", "F02")
- Rooms, area, status badge, price
- Up to 4 photos with lightbox
- Contact form for available units → creates Lead via POST /api/leads
- Reserved/sold status message for unavailable units

### Intent Popup (`IntentPopup.tsx`)
- Triggers on: 33 seconds on page, 70% scroll depth, exit intent
- Shows contact form
- Button always visible even after popup is dismissed
- Phone input uses `inputMode="tel"` for numeric keyboard on mobile

---

## 6. API ROUTES

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects` | List / create projects |
| GET/PUT/DELETE | `/api/projects/[id]` | Single project |
| GET/POST | `/api/buildings` | List / create buildings |
| GET/PUT/DELETE | `/api/buildings/[id]` | Single building (includes polygonData, labelX/Y, etc.) |
| GET/POST | `/api/buildings/[id]/floor-positions` | Floor zone positions |
| GET/POST | `/api/floors` | List / create floors |
| GET/PUT/DELETE | `/api/floors/[id]` | Single floor |
| POST | `/api/floors/[id]/copy-to-all` | Copy floor plan to all floors |
| GET/POST/PATCH | `/api/units` | List (paginated) / create / bulk update |
| GET/PUT/DELETE | `/api/units/[id]` | Single unit |
| GET/POST | `/api/leads` | List (paginated, ?page=1&limit=20) / create |
| GET/PUT/DELETE | `/api/leads/[id]` | Single lead |
| GET/POST | `/api/faqs` | FAQs |
| GET/PUT/DELETE | `/api/faqs/[id]` | Single FAQ |
| GET/POST | `/api/hero-images` | Hero carousel images |
| GET/PUT/DELETE | `/api/hero-images/[id]` | Single hero image |
| POST | `/api/upload` | Upload image to Cloudinary → returns URL |
| POST | `/api/ai/detect-apartments` | Google Gemini: detect apartments from floor plan image |
| POST | `/api/ai/detect-floors` | Google Gemini: detect floors from facade image |
| POST | `/api/ai/translate` | OpenAI: translate text → {uz, ru, en} |

---

## 7. INTERNATIONALIZATION

- **Languages**: Uzbek (uz, default), Russian (ru), English (en)
- **Detection**: Middleware reads `Accept-Language` header on first visit, sets `locale` cookie for 1 year
- **Messages**: `messages/uz.json`, `messages/ru.json`, `messages/en.json`
- **Library**: `next-intl` — `useTranslations()` in client, `getTranslations()` in server components
- **DB translations**: Stored as JSON strings `'{"uz":"...","ru":"...","en":"..."}'`
- **Helper**: `getTranslation(jsonString, fallback, locale)` in `src/lib/translations.ts`

---

## 8. CACHING STRATEGY

- **ISR (60s)**: Home page and project pages revalidate every 60 seconds
- **Unstable cache**: Database queries wrapped with `unstable_cache()` + cache tags
- **Cache tags**: `revalidateTag("project")` called after admin changes
- **Admin pages**: `export const dynamic = "force-dynamic"` — always fresh, never cached

---

## 9. PERFORMANCE PATTERNS

### Admin pages (instant load)
All admin pages use **server component + client component split**:
- `page.tsx` — async server component, queries Prisma directly, passes `initialData` as props
- `*Client.tsx` — receives initial data into `useState`, renders immediately, handles mutations

Before this pattern, admin pages used `"use client"` + `useEffect` fetching which caused visible loading delay.

### Image optimization (Cloudinary)
```
getHeroImageUrl()      → 1600w, auto:best quality
getCardImageUrl()      → 600w, auto:good quality
getThumbnailUrl()      → 400×400, auto:eco quality
getFullImageUrl()      → 1200w, auto:good quality
```
Next.js `<Image>` component handles lazy loading.

---

## 10. AUTHENTICATION

- **System**: NextAuth.js (Credentials provider)
- **Hashing**: bcryptjs
- **Session**: JWT
- **Protected paths**: `/portal/management-x7k9/**`
- **Redirect**: Unauthenticated → `/portal/management-x7k9/login`

---

## 11. ANALYTICS (PostHog)

Custom events tracked:

| Event | When | Properties |
|-------|------|-----------|
| `Viewed Block` | User selects building | block name, project |
| `Viewed Floor` | User selects floor | block, floor number, project |
| `Viewed Apartment` | User clicks unit | block, unit number, floor, area, rooms |
| `Contacted Sales` | User submits contact form | same as above + source |

---

## 12. USER JOURNEY (Full Flow)

```
Home Page (/)
  ↓ CTA button
/projects/[id]/explore
  ↓ aerial view — click building polygon
Building View (facade image with floor zones)
  ↓ click floor zone
Floor Plan View (floor plan image with apartment polygons)
  ↓ click apartment polygon
Unit Modal (photos, specs, price, status)
  ↓ fill contact form (available units only)
POST /api/leads → Lead created in DB
  ↓
Admin sees lead in /portal/management-x7k9/leads
  ↓
Admin calls customer, updates lead status
```

---

## 13. IMPORTANT FILE PATHS

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | All DB models |
| `src/app/page.tsx` | Home page |
| `src/app/projects/[projectId]/explore/page.tsx` | Explorer entry |
| `src/components/ExploreClient.tsx` | Main nav state machine |
| `src/components/ProjectTopView.tsx` | Aerial + building polygons |
| `src/components/BuildingViewer.tsx` | Facade + floor zones |
| `src/components/FloorPlanPolygon.tsx` | Floor plan + apartment SVG polygons |
| `src/components/UnitDetailModal.tsx` | Unit modal + contact form |
| `src/components/IntentPopup.tsx` | Engagement popup (33s timer) |
| `src/components/admin/PolygonEditor.tsx` | Drawing tool |
| `src/components/admin/TopViewMapper.tsx` | Aerial image editor |
| `src/components/admin/FloorPositionEditor.tsx` | Floor zone editor |
| `src/app/portal/management-x7k9/leads/LeadsClient.tsx` | Leads table UI |
| `src/lib/cloudinary.ts` | Image URL helpers |
| `src/lib/translations.ts` | Translation helper |
| `src/lib/cached-queries.ts` | ISR cache logic |
| `src/middleware.ts` | Language detection + cookie |
| `src/i18n.ts` | next-intl config |
| `messages/{uz,ru,en}.json` | UI string translations |
| `next.config.mjs` | Next.js + Cloudinary config |
