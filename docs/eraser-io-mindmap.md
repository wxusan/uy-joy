# Eraser.io uchun UY-JOY Loyihasi Mindmap

Quyidagi kodni eraser.io saytiga ko'chirib boring va "Diagram" → "Mermaid" yoki "Mindmap" turini tanlang.

---

```mermaid
mindmap
  root((UY-JOY 🏠\nKo'chmas mulk platformasi))
    TEXNOLOGIYALAR
      Framework: Next.js 14 App Router
      Til: TypeScript
      Stil: Tailwind CSS
      Ma'lumotlar bazasi: PostgreSQL + Prisma ORM
      Autentifikatsiya: NextAuth.js
      AI: OpenAI API integratsiyasi
      Analitika: PostHog

    MA'LUMOTLAR BAZASI MODELLARI
      User (Foydalanuvchi)
        id, email, password
        name, role (admin/superadmin)
      Project (Loyiha)
        name (uz/en/ru tarjimalar)
        address, coverImage, topViewImage
        GPS koordinatalari
        infrastructure (yaqin joylar)
        expectedYear (tugash yili)
      Building (Bino)
        name (uz/en/ru)
        frontViewImage, backViewImage
        leftViewImage, rightViewImage
        polygonData (aerial ko'rinishda joy)
        sortOrder (A, B, C tartib)
      Floor (Qavat)
        number, basePricePerM2
        floorPlanImage
        positionData (bino ko'rinishida joyi)
      Unit (Kvartira/Xona)
        unitNumber, rooms, area
        status: available/reserved/sold
        pricePerM2, totalPrice
        polygonData (qavat rejasida joyi)
        sketchImage x4 (suratlar)
        customerName, customerPhone
        descriptionTranslations
      Lead (Mijoz so'rovi)
        name, phone, projectId
        status: new/contacted/converted/closed
        source, assignedTo, nextFollowUp
      HeroImage (Bosh sahifa rasmlari)
      FAQ (Ko'p so'raladigan savollar)
        uz/en/ru versiyalar

    SAHIFALAR (FRONTEND)
      Bosh sahifa (/)
        Hero rasm slayderi
        Loyihalar ro'yxati
        Statistikalar (AnimatedCounter)
        Ko'p so'raladigan savollar
        Bog'lanish formasi
        Yaqin infratuzilma xaritasi
      Kvartiralar sahifasi (/kvartiralar)
        Barcha kvartiralar filtrlangan ro'yxat
        Guruhlab ko'rsatish
        Holat bo'yicha filtrlash
      Vizual ko'rinish (/vizual)
        3D/SVG bino ko'rinishi
        Qavat tanlash
        Kvartira holati ranglar
      Loyiha sahifasi (/projects/[id])
        Loyiha tafsilotlari
        Binolar ro'yxati
      Interaktiv ko'rinish (/projects/[id]/explore)
        Aerial top-view
        Bino tanlash (polygon bosish)
        Qavat tanlash
        Kvartira polygon bosish
        Kvartira tafsilotlari modal

    ADMIN PANEL (/portal/management-x7k9)
      Login sahifasi
      Dashboard (bosh sahifa)
      Loyihalar boshqaruvi
        Loyiha qo'shish/tahrirlash/o'chirish
        Bino qo'shish
        Qavat qo'shish
        Kvartira qo'shish
        Polygon chizish (xaritada)
      Foydalanuvchilar (superadmin)
        Admin qo'shish/tahrirlash
        Rol boshqaruvi
      Lidlar (Mijozlar)
        Yangi lidlar
        Holat yangilash
        Keyingi qo'ng'iroq sanasi
      Hero rasmlar boshqaruvi
      FAQ boshqaruvi
      Analitika (PostHog)

    API ENDPOINTLARI
      /api/projects — CRUD loyihalar
      /api/buildings — CRUD binolar
      /api/floors — CRUD qavatlar
      /api/units — CRUD kvartiralar
      /api/leads — Lid boshqaruvi
      /api/users — Foydalanuvchi boshqaruvi
      /api/hero-images — Bosh sahifa rasmlari
      /api/faqs — FAQ boshqaruvi
      /api/upload — Fayl yuklash
      /api/auth — NextAuth autentifikatsiya
      /api/ai/detect-apartments — AI kvartira aniqlash
      /api/ai/detect-floors — AI qavat aniqlash
      /api/ai/translate — AI tarjima

    AI XUSUSIYATLARI
      Kvartira avtomatik aniqlash
        Qavat rejasi rasmi yuklanadi
        AI polygon koordinatalar qaytaradi
      Qavat avtomatik aniqlash
        Bino fasadi rasmi yuklanadi
        AI qavat chegaralarini aniqlaydi
      Ko'p tilli tarjima
        Uzbek / Ingliz / Rus

    UI KOMPONENTLAR
      Navbar + LanguageSwitcher (uz/en/ru)
      BuildingViewer (SVG bino ko'rinishi)
      FloorPlanPolygon (Polygon chizish)
      FloorSelector (Qavat tanlash)
      UnitDetailModal (Kvartira ma'lumotlari)
      ApartmentCard / GroupedApartmentCard
      ProjectTopView (Aerial ko'rinish)
      LocationInfrastructure (Xarita)
      ContactForm + FloatingContact
      IntentPopup (Niyat so'rovi)
      AdminSidebar
      ScrollReveal (Animatsiya)
      PriceLegend (Narx belgisi)

    KVARTIRA HOLATLARI
      🟢 Bo'sh (available) — Sotuvda
      🟡 Band (reserved) — Bron qilingan
      🔴 Sotilgan (sold) — Sotib olingan

    KO'P TILLILIK
      O'zbek tili (asosiy)
      Rus tili
      Ingliz tili
      i18n.ts — Tarjima sozlamalari
      Barcha ma'lumotlar JSON formatda saqlanadi
```

---

## Eraser.io da ishlatish yo'riqnomasi

1. [eraser.io](https://eraser.io) saytiga kiring
2. Yangi fayl oching
3. "Diagram" turini tanlang
4. Yuqoridagi kod blokini (``` ichidagi qismni) ko'chirib joylashtiring
5. Mermaid render tugmasini bosing

---

## Muqobil: Entity Relationship Diagram (Ma'lumotlar bazasi uchun)

```
erDiagram
    PROJECT ||--o{ BUILDING : "o'z ichiga oladi"
    BUILDING ||--o{ FLOOR : "o'z ichiga oladi"
    FLOOR ||--o{ UNIT : "o'z ichiga oladi"
    PROJECT ||--o{ LEAD : "bog'liq"
    USER {
        string id
        string email
        string name
        string role
    }
    PROJECT {
        string id
        string name
        string address
        float latitude
        float longitude
        int expectedYear
    }
    BUILDING {
        string id
        string name
        string projectId
        int sortOrder
    }
    FLOOR {
        string id
        int number
        float basePricePerM2
    }
    UNIT {
        string id
        string unitNumber
        int rooms
        float area
        string status
        float totalPrice
    }
    LEAD {
        string id
        string name
        string phone
        string status
    }
```
