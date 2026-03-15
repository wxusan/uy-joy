# UY-JOY — Eraser.io Diagram
# Copy everything inside the code block into eraser.io

```mermaid
flowchart TD

    subgraph MIJOZ["🏠  BO'LIM 1 — MIJOZ UCHUN: Mahsulot nima qiladi?"]
        direction TB

        subgraph XARIDOR["👤 Xaridor sayti"]
            A1["🌐 Bosh sahifa\n—\nLoyihalar, statistika,\nfoto-slider, FAQ, joylashuv xaritasi"]
            A2["🏢 Kvartiralar ro'yxati\n—\nFiltr: holat, xona soni\nGuruhlab ko'rsatish"]
            A3["🗺️ Interaktiv ko'rinish\n—\nHavodan kompleks xaritasi\n↓ Bino tanlash\n↓ Qavat tanlash\n↓ Kvartira tanlash"]
            A4["📋 Kvartira tafsiloti\n—\nMaydon, narx, xona soni\nHolat, 4 ta foto, tavsif\nUzbek / Rus / Ingliz"]
            A5["📞 Bog'lanish\n—\nIsm + telefon raqam\n→ Adminга lid bo'lib tushadi"]
        end

        subgraph HOLAT["🎨 Kvartira holatlari"]
            H1["🟢 Bo'sh\n(sotuvda)"]
            H2["🟡 Band\n(bron qilingan)"]
            H3["🔴 Sotilgan"]
        end

        subgraph PANEL["🔐 Admin panel (ichki)"]
            B1["📊 Dashboard\n—\nUmumiy ko'rinish"]
            B2["🏗️ Bino boshqaruvi\n—\nLoyiha / Bino / Qavat / Kvartira\nqo'shish va tahrirlash"]
            B3["👥 Lidlar (Mijozlar)\n—\nYangi so'rovlar\nHolat: yangi → bog'lanildi → sotildi\nKeyingi qo'ng'iroq sanasi"]
            B4["🖼️ Kontent\n—\nBosh sahifa rasmlari\nFAQ savollar"]
            B5["👤 Foydalanuvchilar\n—\nAdmin qo'shish (superadmin)"]
        end

        A1 --> A2 & A3
        A2 & A3 --> A4
        A4 --> A5
        A5 --> B3
    end

    subgraph TECH["⚙️  SECTION 2 — FOR DEVELOPERS: How it works"]
        direction TB

        subgraph FRONTEND["🖥️ Frontend — Next.js 14 App Router + TypeScript"]
            F1["/ — Landing Page\nSSR + React Components\nPostHog Analytics"]
            F2["/kvartiralar\nApartment listing\nClient-side filter & group"]
            F3["/vizual\nSVG Building Viewer\nInteractive polygon click"]
            F4["/projects/[id]/explore\nAerial View → Building\n→ Floor → Unit polygon"]
            F5["/portal/management-x7k9\nProtected Admin Panel\nNextAuth session guard"]
        end

        subgraph BACKEND["🔧 Backend — Next.js API Routes (REST)"]
            direction LR
            API1["CRUD /api/projects\n/api/buildings\n/api/floors\n/api/units"]
            API2["POST /api/leads\nGET  /api/leads\nPATCH status update"]
            API3["POST /api/upload\nFile storage handler"]
            API4["POST /api/auth\nNextAuth credentials\nJWT session"]
            API5["POST /api/ai/detect-apartments\nImage → polygon coords\n(% of image dimensions)"]
            API6["POST /api/ai/detect-floors\nBuilding image → floor\nboundaries (yStart/yEnd %)"]
            API7["POST /api/ai/translate\nText → uz + en + ru\nreturns JSON"]
        end

        subgraph DB["🗄️ Database — PostgreSQL + Prisma ORM"]
            direction LR
            DB1["User\nid · email · password\nname · role (admin/superadmin)"]
            DB2["Project\nname · nameTranslations JSON\naddress · coverImage · topViewImage\nlatitude · longitude\ninfrastructure JSON · expectedYear"]
            DB3["Building\nname · nameTranslations JSON\npolygonData JSON (aerial %)\nfrontView/back/left/rightImage\nsortOrder (A, B, C...)"]
            DB4["Floor\nnumber · basePricePerM2\nfloorPlanImage\npositionData JSON (yStart/yEnd %)"]
            DB5["Unit\nunitNumber · rooms · area\nstatus · pricePerM2 · totalPrice\npolygonData JSON (floor plan %)\nsketchImage × 4\ncustomerName · customerPhone\ndescriptionTranslations JSON"]
            DB6["Lead\nname · phone · projectId · unitId\nstatus: new→contacted→converted→closed\nsource · assignedTo · nextFollowUp"]
            DB7["HeroImage\nimageUrl · sortOrder"]
            DB8["FAQ\nquestion + answer × (uz, en, ru)\nsortOrder · isActive"]
        end

        subgraph AI["🤖 AI Layer — OpenAI API"]
            AI1["Apartment Detection\nUpload floor plan image\n→ returns polygon array\n[{x%, y%}, ...]"]
            AI2["Floor Detection\nUpload building facade\n→ returns floor boundaries\n[{yStart%, yEnd%}, ...]"]
            AI3["Auto Translation\nInput: any language text\nOutput: {uz, en, ru} JSON"]
        end

        subgraph STACK["🏗️ Full Stack"]
            S1["Next.js 14 · TypeScript\nApp Router · Server Actions"]
            S2["Tailwind CSS\nMobile-first responsive"]
            S3["NextAuth.js\nCredentials · JWT · Middleware"]
            S4["Prisma ORM\nType-safe · Auto migrations"]
            S5["PostHog\nUser analytics · Event tracking"]
            S6["i18n — 3 Languages\nUzbek · Russian · English"]
        end

        DB2 -->|"1 Project → many"| DB3
        DB3 -->|"1 Building → many"| DB4
        DB4 -->|"1 Floor → many"| DB5
        DB2 -->|"linked"| DB6

        F1 & F2 & F3 & F4 & F5 -->|"fetch()"| API1 & API2
        API1 & API2 -->|"prisma.query()"| DB2
        API5 & API6 & API7 -->|"openai.chat()"| AI1
        API4 --> S3
    end

    MIJOZ -.->|"Same product.\nTwo perspectives."| TECH
```

---

**Paste instructions:**
1. Copy everything inside the triple backticks above
2. Go to [app.eraser.io](https://app.eraser.io) → New file → **Diagram**
3. Paste → renders as Mermaid flowchart
4. Export as PNG or PDF
