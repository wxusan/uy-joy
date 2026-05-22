import { PrismaClient, type User, type Unit, type Client, type Lead, type Deal } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "DemoPass123!";
const DEMO_BRAND = "Mirabad Heights";
const DEMO_BRAND_CYRILLIC = "МИРАБАД ҲАЙТС";

const pipelineStages = [
  { key: "new", name: "New", sortOrder: 10, color: "#2563eb", isDefault: true, isWon: false, isLost: false },
  { key: "contacted", name: "Contacted", sortOrder: 20, color: "#0891b2", isDefault: true, isWon: false, isLost: false },
  { key: "meeting", name: "Meeting", sortOrder: 30, color: "#7c3aed", isDefault: true, isWon: false, isLost: false },
  { key: "negotiation", name: "Negotiation", sortOrder: 40, color: "#ca8a04", isDefault: true, isWon: false, isLost: false },
  { key: "reserved", name: "Reserved", sortOrder: 50, color: "#ea580c", isDefault: true, isWon: false, isLost: false },
  { key: "sold", name: "Sold", sortOrder: 60, color: "#16a34a", isDefault: true, isWon: true, isLost: false },
  { key: "lost", name: "Lost", sortOrder: 70, color: "#64748b", isDefault: true, isWon: false, isLost: true },
];

const leadSources = [
  { key: "public_page", labelJson: { uz: "Ommaviy sahifa", ru: "Публичная страница", en: "Public page" } },
  { key: "apartment_page", labelJson: { uz: "Xonadon sahifasi", ru: "Страница квартиры", en: "Apartment page" } },
  { key: "visual_explorer", labelJson: { uz: "Vizual tanlov", ru: "Визуальный выбор", en: "Visual explorer" } },
  { key: "telegram", labelJson: { uz: "Telegram", ru: "Telegram", en: "Telegram" } },
  { key: "instagram", labelJson: { uz: "Instagram", ru: "Instagram", en: "Instagram" } },
  { key: "campaign", labelJson: { uz: "Kampaniya", ru: "Кампания", en: "Campaign" } },
  { key: "manual", labelJson: { uz: "Qo'lda", ru: "Вручную", en: "Manual" } },
];

const faqs = [
  {
    questionUz: "Bron qilish uchun qanday hujjatlar kerak?",
    answerUz: "Pasport nusxasi, telefon raqami va dastlabki to'lov tasdig'i yetarli.",
    questionRu: "Какие документы нужны для брони?",
    answerRu: "Достаточно копии паспорта, номера телефона и подтверждения первого платежа.",
    questionEn: "Which documents are needed for reservation?",
    answerEn: "A passport copy, phone number, and initial payment confirmation are enough.",
  },
  {
    questionUz: "Bo'lib to'lash bormi?",
    answerUz: "Ha, 12 va 24 oylik bo'lib to'lash rejalarini ko'rsatamiz.",
    questionRu: "Есть рассрочка?",
    answerRu: "Да, доступны демонстрационные планы на 12 и 24 месяца.",
    questionEn: "Are installments available?",
    answerEn: "Yes, the demo includes 12 and 24 month installment plans.",
  },
  {
    questionUz: "Savdo ofisi qachon ishlaydi?",
    answerUz: "Dushanbadan shanbagacha, 09:00 dan 19:00 gacha.",
    questionRu: "Когда работает офис продаж?",
    answerRu: "С понедельника по субботу, с 09:00 до 19:00.",
    questionEn: "When is the sales office open?",
    answerEn: "Monday to Saturday, 09:00 to 19:00.",
  },
  {
    questionUz: "Telegram orqali ariza yuboriladimi?",
    answerUz: "Ha, demo arizalar CRM va demo Telegram kanaliga tushadi.",
    questionRu: "Заявка приходит в Telegram?",
    answerRu: "Да, демо-заявки попадают в CRM и демо Telegram-канал.",
    questionEn: "Does the lead arrive in Telegram?",
    answerEn: "Yes, demo leads appear in CRM and the demo Telegram channel.",
  },
];

const names = [
  "Dilshod Akramov",
  "Malika Saidova",
  "Azizbek Nurmatov",
  "Irina Petrova",
  "Bekzod Hamidov",
  "Gulnora Usmonova",
  "Ruslan Sharipov",
  "Nargiza Aliyeva",
  "Timur Yuldashev",
  "Sevara Rakhimova",
  "Anvar Karimov",
  "Olga Smirnova",
  "Javlon Muminov",
  "Diana Kim",
  "Sardor Rasulov",
  "Kamila Ergasheva",
  "Farrukh Ismoilov",
  "Lola Usarova",
  "Pavel Morozov",
  "Shahnoza Umarova",
  "Otabek Sultonov",
  "Rano Qodirova",
  "Murod Nazarov",
  "Yulia Volkova",
  "Sherzod Abduganiyev",
  "Madina Akhmedova",
  "Alisher Sobirov",
  "Zarina Mamatova",
  "Eldor Ganiev",
  "Natalya Ivanova",
  "Oybek Rahmonov",
  "Feruza Nabieva",
  "Ibrohim Khusanov",
  "Sabina Egamberdiyeva",
  "Daler Mirzaev",
  "Munisa Tashpulatova",
  "Anton Belyaev",
  "Shokhrukh Adilov",
  "Nigora Kadyrova",
  "Vladislav Orlov",
  "Umid Juraev",
  "Dilafruz Kamilova",
  "Artur Sokolov",
  "Shahzod Umarov",
  "Zilola Hakimova",
  "Islom Norov",
  "Karina Abbasova",
  "Bobur Salimov",
  "Makhliyo Tursunova",
  "Yusuf Abdullaev",
];

function assertDemoSafety() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset demo data while NODE_ENV=production.");
  }
  if (process.env.DEMO_DATABASE_CONFIRM !== "demo") {
    throw new Error("Set DEMO_DATABASE_CONFIRM=demo before running npm run demo:reset.");
  }
  const databaseUrl = process.env.DATABASE_URL || "";
  const looksLikeDemoDatabase = /demo|localhost|127\.0\.0\.1/i.test(databaseUrl);
  if (!looksLikeDemoDatabase && process.env.DEMO_ALLOW_NON_DEMO_DATABASE !== "1") {
    throw new Error("DATABASE_URL must look like a demo/local database. Set DEMO_ALLOW_NON_DEMO_DATABASE=1 only after verifying the target DB.");
  }
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysAgo(days: number) {
  return daysFromNow(-days);
}

function money(value: number) {
  return Math.round(value);
}

async function clearDemoDatabase() {
  await prisma.analyticsEvent.deleteMany();
  await prisma.telegramNotificationLog.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentPlan.deleteMany();
  await prisma.document.deleteMany();
  await prisma.dealUnit.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.leadStageHistory.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.salesAgentProfile.deleteMany();
  await prisma.publicPageConfig.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.project.deleteMany();
  await prisma.fAQ.deleteMany();
  await prisma.heroImage.deleteMany();
  await prisma.adSpend.deleteMany();
  await prisma.leadSource.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const owner = await prisma.user.create({ data: { email: "owner@mirabad-demo.uz", password, name: "Aziza Owner", role: "owner" } });
  const director = await prisma.user.create({
    data: {
      email: "director@mirabad-demo.uz",
      password,
      name: "Madina Karimova",
      role: "sales_director",
      salesAgentProfile: { create: { displayName: "Madina Karimova", phone: "+998 90 700 10 01", monthlyTargetDeals: 7, monthlyTargetRevenue: 9200000000 } },
    },
  });
  const agents = await Promise.all(
    [
      ["jasur@mirabad-demo.uz", "Jasur Tursunov", "+998 90 700 10 02"],
      ["nodira@mirabad-demo.uz", "Nodira Abdullayeva", "+998 90 700 10 03"],
      ["timur@mirabad-demo.uz", "Timur Saidov", "+998 90 700 10 04"],
    ].map(([email, name, phone], index) =>
      prisma.user.create({
        data: {
          email,
          password,
          name,
          role: "sales_agent",
          salesAgentProfile: {
            create: {
              displayName: name,
              phone,
              telegramUsername: `demo_agent_${index + 1}`,
              monthlyTargetDeals: 4,
              monthlyTargetRevenue: 4200000000,
            },
          },
        },
      })
    )
  );
  const backOffice = await prisma.user.create({ data: { email: "backoffice@mirabad-demo.uz", password, name: "Kamola Finance", role: "back_office" } });
  const marketing = await prisma.user.create({ data: { email: "marketing@mirabad-demo.uz", password, name: "Sabrina Marketing", role: "marketing" } });
  return { owner, director, agents, backOffice, marketing };
}

async function createProject() {
  const project = await prisma.project.create({
    data: {
      slug: "mirabad-heights-demo",
      name: DEMO_BRAND,
      nameTranslations: JSON.stringify({ uz: "Mirabad Heights", ru: DEMO_BRAND_CYRILLIC, en: DEMO_BRAND }),
      description:
        "A premium two-tower residential complex in central Tashkent with panoramic layouts, underground parking, private courtyard, and a dedicated sales office.",
      descriptionTranslations: JSON.stringify({
        uz: "Toshkent markazidagi ikki minorali premium turar joy majmuasi: panoramali rejalashtirish, yerosti parking, yopiq hovli va savdo ofisi.",
        ru: "Премиальный жилой комплекс из двух башен в центре Ташкента: панорамные планировки, подземный паркинг, закрытый двор и офис продаж.",
        en: "A premium two-tower residential complex in central Tashkent with panoramic layouts, underground parking, private courtyard, and a sales office.",
      }),
      address: "Tashkent, Mirabad district, Nukus street 17",
      addressTranslations: JSON.stringify({
        uz: "Toshkent, Mirobod tumani, Nukus ko'chasi 17",
        ru: "Ташкент, Мирабадский район, улица Нукус 17",
        en: "Tashkent, Mirabad district, Nukus street 17",
      }),
      coverImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=85",
      masterPlanImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85",
      topViewImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85",
      latitude: 41.2995,
      longitude: 69.2817,
      expectedYear: 2028,
      phoneNumber: "+998 77 410 70 70",
      telegramUrl: "https://t.me/mirabad_demo_sales",
      instagramUrl: "https://instagram.com/mirabad.demo",
      salesOfficeAddress: "Mirabad Heights sales office, Nukus street 17",
      salesHoursStart: "09:00",
      salesHoursEnd: "19:00",
      salesDaysJson: "1,2,3,4,5,6",
      brandLogo: "https://dummyimage.com/320x120/111827/f8fafc&text=Mirabad+Heights",
      infrastructure: [
        { category: "metro", categoryIcon: "metro", places: ["Oybek metro - 6 min", "Kosmonavtlar metro - 8 min"] },
        { category: "school", categoryIcon: "school", places: ["International school - 5 min", "Kindergarten - 3 min"] },
        { category: "park", categoryIcon: "park", places: ["Central park - 7 min"] },
      ],
    },
  });

  await prisma.publicPageConfig.create({
    data: {
      projectId: project.id,
      brandName: DEMO_BRAND,
      logoUrl: project.brandLogo,
      primaryColor: "#0f172a",
      secondaryColor: "#f8fafc",
      accentColor: "#c0842f",
      backgroundColor: "#f5f1ea",
      textColor: "#111827",
      heroTitleJson: { uz: "Mirabad Heights", ru: DEMO_BRAND_CYRILLIC, en: DEMO_BRAND },
      heroSubtitleJson: {
        uz: "Mirobod markazida premium xonadonlar. Savdo jarayoni CRM bilan to'liq boshqariladi.",
        ru: "Премиальные квартиры в центре Мирабада. Продажи полностью управляются через CRM.",
        en: "Premium apartments in central Mirabad with a fully connected sales CRM.",
      },
      heroImageUrl: project.coverImage,
      primaryCtaLabelJson: { uz: "Qo'ng'iroq so'rash", ru: "Заказать звонок", en: "Request a call" },
      secondaryCtaLabelJson: { uz: "Xonadonlarni ko'rish", ru: "Смотреть квартиры", en: "View apartments" },
      formTitleJson: { uz: "Savdo bo'limi bilan bog'laning", ru: "Связаться с отделом продаж", en: "Contact sales" },
      formSubtitleJson: { uz: "Demo ariza CRM va Telegramga tushadi.", ru: "Демо-заявка попадет в CRM и Telegram.", en: "Demo leads appear in CRM and Telegram." },
      thankYouTitleJson: { uz: "Ariza qabul qilindi", ru: "Заявка принята", en: "Lead received" },
      thankYouMessageJson: { uz: "Menejer tez orada bog'lanadi.", ru: "Менеджер скоро свяжется.", en: "A manager will contact you shortly." },
      enabledSections: ["hero", "project_overview", "apartment_highlights", "location", "faq", "contact"],
      designTokens: { radius: 8, theme: "premium-demo", cyrillicSafe: true },
    },
  });

  await prisma.fAQ.createMany({ data: faqs.map((faq, sortOrder) => ({ ...faq, sortOrder, isActive: true })) });
  await prisma.heroImage.createMany({
    data: [
      { imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=85", sortOrder: 1 },
      { imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=85", sortOrder: 2 },
    ],
  });
  return project;
}

async function createInventory(projectId: string) {
  const unitTemplates = [
    { rooms: 1, area: 42, position: 0, premium: 1.05 },
    { rooms: 2, area: 58, position: 1, premium: 1 },
    { rooms: 2, area: 66, position: 2, premium: 1.08 },
    { rooms: 3, area: 84, position: 3, premium: 1.12 },
    { rooms: 3, area: 96, position: 4, premium: 1.16 },
    { rooms: 4, area: 128, position: 5, premium: 1.22 },
  ];
  const buildings = await Promise.all(
    ["Tower A", "Tower B"].map((name, index) =>
      prisma.building.create({
        data: {
          name,
          nameTranslations: JSON.stringify({ uz: name, ru: index === 0 ? "Башня A" : "Башня B", en: name }),
          projectId,
          frontViewImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85",
          polygonData: [
            { x: 20 + index * 34, y: 18 },
            { x: 45 + index * 34, y: 18 },
            { x: 45 + index * 34, y: 78 },
            { x: 20 + index * 34, y: 78 },
          ],
          labelX: 31 + index * 34,
          labelY: 14,
          pointX: 32 + index * 34,
          pointY: 50,
          completionYear: 2028 + index,
          sortOrder: index + 1,
        },
      })
    )
  );

  for (let buildingIndex = 0; buildingIndex < buildings.length; buildingIndex += 1) {
    const building = buildings[buildingIndex];
    for (let floorNumber = 1; floorNumber <= 6; floorNumber += 1) {
      const basePricePerM2 = 18_000_000 + floorNumber * 450_000 + buildingIndex * 650_000;
      const floor = await prisma.floor.create({
        data: {
          buildingId: building.id,
          number: floorNumber,
          basePricePerM2,
          positionData: { yStart: 84 - floorNumber * 10, yEnd: 91 - floorNumber * 10 },
          floorPlanImage: "https://dummyimage.com/1200x800/f4f1eb/111827&text=Demo+floor+plan",
        },
      });

      for (const template of unitTemplates) {
        const unitNumber = `${buildingIndex === 0 ? "A" : "B"}-${floorNumber}${String(template.position + 1).padStart(2, "0")}`;
        const pricePerM2 = money(basePricePerM2 * template.premium);
        await prisma.unit.create({
          data: {
            unitNumber,
            floorId: floor.id,
            rooms: template.rooms,
            area: template.area,
            status: "available",
            pricePerM2,
            totalPrice: money(pricePerM2 * template.area),
            labelX: 12 + template.position * 15,
            labelY: 28 + (template.position % 2) * 28,
            polygonData: [
              { x: 5 + template.position * 15, y: 18 },
              { x: 17 + template.position * 15, y: 18 },
              { x: 17 + template.position * 15, y: 48 },
              { x: 5 + template.position * 15, y: 48 },
            ],
            sketchImage: "https://dummyimage.com/900x700/f8fafc/111827&text=Demo+layout",
            description: `${template.rooms}-room demo apartment with city view and flexible payment options.`,
            descriptionTranslations: JSON.stringify({
              uz: `${template.rooms} xonali demo xonadon, shahar manzarasi va moslashuvchan to'lov rejasi.`,
              ru: `${template.rooms}-комнатная демо-квартира с видом на город и гибкой оплатой.`,
              en: `${template.rooms}-room demo apartment with city view and flexible payment options.`,
            }),
            features: ["demo", "city_view", template.rooms >= 3 ? "family_layout" : "compact_plan"],
          },
        });
      }
    }
  }

  return prisma.unit.findMany({ include: { floor: { include: { building: true } } }, orderBy: { unitNumber: "asc" } });
}

async function seedFoundation() {
  await prisma.pipelineStage.createMany({ data: pipelineStages });
  await prisma.leadSource.createMany({ data: leadSources.map((source) => ({ ...source, isSystem: true, isActive: true })) });
}

async function createLeadWithHistory(input: {
  index: number;
  name: string;
  status: string;
  source: string;
  campaign: string;
  agent: User | null;
  owner: User;
  director: User;
  projectId: string;
  projectName: string;
  unit: Unit & { floor: { number: number; building: { name: string } } };
  daysAgo: number;
}) {
  const phone = `+998 90 ${String(1100000 + input.index * 137).slice(0, 3)} ${String(2200 + input.index * 17).slice(0, 2)} ${String(3300 + input.index * 23).slice(0, 2)}`;
  const client = await prisma.client.create({
    data: {
      fullName: input.name,
      phone,
      phoneNormalized: phone.replace(/[^\d+]/g, ""),
      preferredLanguage: input.index % 3 === 0 ? "ru" : input.index % 3 === 1 ? "uz" : "en",
      source: input.source,
      notes: `Fake demo client interested in ${input.unit.unitNumber}.`,
      assignedToId: input.agent?.id || null,
      createdById: input.owner.id,
      createdAt: daysAgo(input.daysAgo),
    },
  });
  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      phone,
      clientId: client.id,
      projectId: input.projectId,
      projectName: input.projectName,
      unitId: input.unit.id,
      unitNumber: input.unit.unitNumber,
      status: input.status,
      source: input.source,
      campaign: input.campaign,
      utmSource: input.source === "instagram" ? "meta" : input.source,
      utmMedium: input.source === "campaign" || input.source === "instagram" ? "paid" : "organic",
      utmCampaign: input.campaign,
      landingPath: input.source === "apartment_page" ? `/apartments?unit=${input.unit.unitNumber}` : "/",
      preferredLanguage: client.preferredLanguage,
      assignedToId: input.agent?.id || null,
      notes: "Fake demo lead for sales walkthrough.",
      unitNumberSnapshot: input.unit.unitNumber,
      unitAreaSnapshot: input.unit.area,
      unitRoomsSnapshot: input.unit.rooms,
      unitPriceSnapshot: input.unit.totalPrice,
      buildingNameSnapshot: input.unit.floor.building.name,
      floorNumberSnapshot: input.unit.floor.number,
      stageEnteredAt: daysAgo(Math.max(0, input.daysAgo - 1)),
      firstResponseAt: input.status === "new" ? null : daysAgo(Math.max(0, input.daysAgo - 1)),
      lastActivityAt: daysAgo(Math.max(0, input.daysAgo - 1)),
      nextActionAt: ["sold", "lost"].includes(input.status) ? null : daysFromNow((input.index % 4) - 1),
      closedAt: input.status === "lost" ? daysAgo(1) : null,
      convertedAt: input.status === "sold" ? daysAgo(1) : null,
      lostReason: input.status === "lost" ? ["Price objection", "Bought from competitor", "Timing changed"][input.index % 3] : null,
      createdAt: daysAgo(input.daysAgo),
    },
  });

  await prisma.leadStageHistory.create({
    data: {
      leadId: lead.id,
      fromStatus: input.status === "new" ? null : "new",
      toStatus: input.status,
      changedById: input.agent?.id || input.director.id,
      enteredAt: lead.stageEnteredAt,
      createdAt: lead.createdAt,
    },
  });

  const actorId = input.agent?.id || input.director.id;
  await prisma.activity.createMany({
    data: [
      {
        type: "lead",
        title: "Lead captured from public page",
        body: "Fake demo lead captured with UTM attribution.",
        clientId: client.id,
        leadId: lead.id,
        unitId: input.unit.id,
        actorId: null,
        assignedToId: input.agent?.id || null,
        channel: "web",
        direction: "inbound",
        occurredAt: daysAgo(input.daysAgo),
        createdAt: daysAgo(input.daysAgo),
      },
      {
        type: "communication",
        title: input.index % 2 === 0 ? "Outbound call completed" : "Telegram message sent",
        body: "Manager confirmed budget, family size, and preferred floor.",
        clientId: client.id,
        leadId: lead.id,
        unitId: input.unit.id,
        actorId,
        assignedToId: input.agent?.id || null,
        channel: input.index % 2 === 0 ? "call" : "telegram",
        direction: "outbound",
        occurredAt: daysAgo(Math.max(0, input.daysAgo - 1)),
        createdAt: daysAgo(Math.max(0, input.daysAgo - 1)),
      },
      {
        type: input.status === "meeting" ? "visit" : "note",
        title: input.status === "meeting" ? "Sales office visit scheduled" : "Demo note added",
        body: "Client asked about installment options and document list.",
        clientId: client.id,
        leadId: lead.id,
        unitId: input.unit.id,
        actorId,
        assignedToId: input.agent?.id || null,
        channel: "crm",
        occurredAt: daysAgo(Math.max(0, input.daysAgo - 1)),
        createdAt: daysAgo(Math.max(0, input.daysAgo - 1)),
      },
    ],
  });

  await prisma.analyticsEvent.createMany({
    data: ["public_page_view", "lead_form_start", "lead_form_submit", "lead_form_success"].map((eventName, step) => ({
      eventName,
      source: input.source,
      campaign: input.campaign,
      utmSource: input.source === "instagram" ? "meta" : input.source,
      utmMedium: input.source === "campaign" || input.source === "instagram" ? "paid" : "organic",
      utmCampaign: input.campaign,
      projectId: input.projectId,
      unitId: input.unit.id,
      leadId: eventName === "lead_form_success" ? lead.id : null,
      clientId: eventName === "lead_form_success" ? client.id : null,
      sessionId: `demo-session-${input.index}`,
      landingPath: lead.landingPath,
      locale: client.preferredLanguage,
      occurredAt: daysAgo(input.daysAgo - step * 0.01),
    })),
  });

  return { client, lead };
}

async function createDemoDeal(input: {
  index: number;
  status: string;
  projectId: string;
  unit: Unit;
  client: Client;
  lead: Lead;
  agent: User;
  director: User;
  backOffice: User;
}) {
  const listPrice = input.unit.totalPrice || 0;
  const discountPercent = [0, 2, 4, 6, 8][input.index % 5];
  const salePrice = money(listPrice * (1 - discountPercent / 100));
  const initialPercent = input.index % 3 === 0 ? 100 : input.index % 3 === 1 ? 30 : 20;
  const termMonths = initialPercent === 100 ? 0 : input.index % 2 === 0 ? 12 : 24;
  const initialPaymentAmount = money(salePrice * (initialPercent / 100));
  const remainingAmount = salePrice - initialPaymentAmount;
  const isSoldLike = ["sold", "payment_active"].includes(input.status);
  const isReservedLike = ["reserved", "contract_preparation"].includes(input.status);
  const deal = await prisma.deal.create({
    data: {
      dealNumber: `DEMO-${String(input.index + 1).padStart(3, "0")}`,
      clientId: input.client.id,
      leadId: input.lead.id,
      projectId: input.projectId,
      primaryUnitId: input.unit.id,
      assignedToId: input.agent.id,
      createdById: input.director.id,
      status: input.status,
      source: input.lead.source,
      currency: "UZS",
      displayCurrency: "UZS",
      paymentCurrency: "UZS",
      listPrice,
      discountPercent,
      discountAmount: listPrice - salePrice,
      salePrice,
      discountFlaggedAt: discountPercent > 5 ? daysAgo(4) : null,
      discountApprovedById: discountPercent > 5 ? input.director.id : null,
      discountApprovedAt: discountPercent > 5 ? daysAgo(3) : null,
      initialPaymentAmount,
      initialPaymentPercent: initialPercent,
      remainingAmount,
      paymentTermMonths: termMonths,
      monthlyPaymentAmount: termMonths ? money(remainingAmount / termMonths) : 0,
      expectedCloseAt: daysFromNow(10 + input.index),
      reservedAt: isReservedLike || isSoldLike ? daysAgo(5 + input.index) : null,
      reservationExpiresAt: isReservedLike ? daysFromNow(1 + (input.index % 3)) : null,
      contractedAt: ["contract_preparation", "payment_active", "sold"].includes(input.status) ? daysAgo(3 + input.index) : null,
      soldAt: isSoldLike ? daysAgo(2 + input.index) : null,
      lostAt: input.status === "cancelled" ? daysAgo(1) : null,
      lostReason: input.status === "cancelled" ? "Client postponed purchase after reservation" : null,
      notes: "Fake demo deal for sales walkthrough.",
      createdAt: daysAgo(8 + input.index),
    },
  });
  await prisma.dealUnit.create({ data: { dealId: deal.id, unitId: input.unit.id, priceAtDeal: salePrice, isPrimary: true } });
  await prisma.unit.update({
    where: { id: input.unit.id },
    data: {
      status: isSoldLike ? "sold" : isReservedLike ? "reserved" : "available",
      currentDealId: isSoldLike || isReservedLike ? deal.id : null,
      reservedByClientId: isSoldLike || isReservedLike ? input.client.id : null,
      soldToClientId: isSoldLike ? input.client.id : null,
      reservedAt: deal.reservedAt,
      reservationExpiresAt: deal.reservationExpiresAt,
      soldAt: deal.soldAt,
      statusChangedAt: daysAgo(2),
    },
  });

  if (input.status !== "reserved" && input.status !== "contract_preparation" && input.status !== "cancelled") {
    const plan = await prisma.paymentPlan.create({
      data: {
        dealId: deal.id,
        name: termMonths === 0 ? "Cash purchase" : termMonths === 12 ? "12 month installment" : "24 month installment",
        type: termMonths === 0 ? "cash" : "installment",
        totalAmount: salePrice,
        initialPaymentAmount,
        remainingAmount,
        termMonths,
        startsAt: daysAgo(2),
        scheduleJson: { demo: true, termMonths, initialPercent },
        status: "active",
        createdById: input.backOffice.id,
        createdAt: daysAgo(2),
      },
    });
    const monthly = termMonths ? money(remainingAmount / termMonths) : 0;
    const payments = termMonths === 0
      ? [{ sequence: 1, label: "Full payment", dueDate: daysAgo(2), expectedAmount: salePrice, paidAmount: salePrice, status: "paid", paidAt: daysAgo(1) }]
      : [
          { sequence: 1, label: "Initial payment", dueDate: daysAgo(2), expectedAmount: initialPaymentAmount, paidAmount: initialPaymentAmount, status: "paid", paidAt: daysAgo(1) },
          { sequence: 2, label: "Installment 1", dueDate: daysAgo(8), expectedAmount: monthly, paidAmount: input.index % 2 === 0 ? money(monthly * 0.4) : 0, status: input.index % 2 === 0 ? "partial" : "overdue", paidAt: input.index % 2 === 0 ? daysAgo(5) : null },
          { sequence: 3, label: "Installment 2", dueDate: daysFromNow(22), expectedAmount: monthly, paidAmount: 0, status: "scheduled", paidAt: null },
          { sequence: 4, label: "Installment 3", dueDate: daysFromNow(52), expectedAmount: monthly, paidAmount: 0, status: "scheduled", paidAt: null },
        ];
    for (const payment of payments) {
      await prisma.payment.create({ data: { ...payment, paymentPlanId: plan.id, dealId: deal.id, clientId: input.client.id, method: payment.status === "paid" ? "bank_transfer" : null, notes: "Fake demo payment." } });
    }
  }

  const documents = [
    { type: "passport", title: "Passport copy", status: "approved", reviewedById: input.backOffice.id, rejectionReason: null },
    { type: "reservation_agreement", title: "Reservation agreement", status: "approved", reviewedById: input.director.id, rejectionReason: null },
    { type: "contract", title: "Draft contract", status: input.status === "contract_preparation" ? "uploaded" : "approved", reviewedById: input.status === "contract_preparation" ? null : input.backOffice.id, rejectionReason: null },
    { type: "payment_receipt", title: "Payment receipt", status: input.index % 4 === 0 ? "rejected" : "uploaded", reviewedById: input.index % 4 === 0 ? input.backOffice.id : null, rejectionReason: input.index % 4 === 0 ? "Amount is not visible on the demo receipt." : null },
  ];
  await prisma.document.createMany({
    data: documents.map((document, docIndex) => ({
      ...document,
      clientId: input.client.id,
      leadId: input.lead.id,
      dealId: deal.id,
      unitId: input.unit.id,
      uploadedById: docIndex === 0 ? input.agent.id : input.backOffice.id,
      fileUrl: `https://example.com/demo-documents/${deal.dealNumber}-${docIndex + 1}.pdf`,
      fileName: `${deal.dealNumber}-${document.type}.pdf`,
      fileSize: 128000 + docIndex * 24000,
      mimeType: "application/pdf",
      createdAt: daysAgo(2 + docIndex),
    })),
  });

  await prisma.activity.createMany({
    data: [
      { type: "deal", title: `Deal moved to ${input.status}`, clientId: input.client.id, leadId: input.lead.id, dealId: deal.id, unitId: input.unit.id, actorId: input.director.id, channel: "crm", metadata: { dealNumber: deal.dealNumber }, occurredAt: daysAgo(2), createdAt: daysAgo(2) },
      { type: "document", title: "Demo documents uploaded", clientId: input.client.id, leadId: input.lead.id, dealId: deal.id, unitId: input.unit.id, actorId: input.backOffice.id, channel: "crm", occurredAt: daysAgo(1), createdAt: daysAgo(1) },
    ],
  });
  return deal;
}

async function main() {
  assertDemoSafety();
  await clearDemoDatabase();
  await seedFoundation();
  const users = await createUsers();
  const project = await createProject();
  const units = await createInventory(project.id);
  const leadStatuses = [
    ...Array(8).fill("new"),
    ...Array(10).fill("contacted"),
    ...Array(8).fill("meeting"),
    ...Array(7).fill("negotiation"),
    ...Array(6).fill("reserved"),
    ...Array(6).fill("sold"),
    ...Array(5).fill("lost"),
  ];
  const sources = ["public_page", "apartment_page", "visual_explorer", "telegram", "instagram", "campaign", "manual"];
  const campaigns = ["demo_launch", "family_homes", "mirabad_view", "telegram_fast", "instagram_may"];
  const created: Array<{ client: Client; lead: Lead; agent: User; unit: Unit }> = [];

  for (let index = 0; index < leadStatuses.length; index += 1) {
    const agent = users.agents[index % users.agents.length];
    const result = await createLeadWithHistory({
      index,
      name: names[index],
      status: leadStatuses[index],
      source: sources[index % sources.length],
      campaign: campaigns[index % campaigns.length],
      agent: index % 9 === 0 ? null : agent,
      owner: users.owner,
      director: users.director,
      projectId: project.id,
      projectName: project.name,
      unit: units[(index + 7) % units.length],
      daysAgo: 1 + (index % 24),
    });
    created.push({ ...result, agent, unit: units[(index + 7) % units.length] });
  }

  const dealStatuses = ["reserved", "reserved", "reserved", "reserved", "contract_preparation", "contract_preparation", "payment_active", "payment_active", "sold", "sold", "sold", "sold", "cancelled"];
  const dealLeadPools = {
    reserved: created.filter((item) => item.lead.status === "reserved"),
    sold: created.filter((item) => item.lead.status === "sold"),
    lost: created.filter((item) => item.lead.status === "lost"),
  };
  const dealLeadCursor = { reserved: 0, sold: 0, lost: 0 };
  const pickDealLead = (status: string) => {
    if (status === "payment_active" || status === "sold") {
      return dealLeadPools.sold[dealLeadCursor.sold++];
    }
    if (status === "cancelled") {
      return dealLeadPools.lost[dealLeadCursor.lost++];
    }
    return dealLeadPools.reserved[dealLeadCursor.reserved++];
  };
  const dealRecords: Deal[] = [];
  for (let index = 0; index < dealStatuses.length; index += 1) {
    const leadBundle = pickDealLead(dealStatuses[index]);
    if (!leadBundle) throw new Error(`Not enough matching demo leads for deal status ${dealStatuses[index]}`);
    dealRecords.push(
      await createDemoDeal({
        index,
        status: dealStatuses[index],
        projectId: project.id,
        unit: leadBundle.unit,
        client: leadBundle.client,
        lead: leadBundle.lead,
        agent: leadBundle.agent,
        director: users.director,
        backOffice: users.backOffice,
      })
    );
  }

  await prisma.task.createMany({
    data: created.slice(0, 28).map((item, index) => ({
      title: index % 5 === 0 ? "Overdue follow-up before client meeting" : index % 4 === 0 ? "Request missing document" : "Call client and update CRM",
      description: "Fake demo task for mobile/desktop walkthrough.",
      type: index % 4 === 0 ? "document" : index % 3 === 0 ? "meeting" : "call",
      status: index % 7 === 0 ? "completed" : "open",
      priority: index % 5 === 0 ? "urgent" : "normal",
      clientId: item.client.id,
      leadId: item.lead.id,
      unitId: item.unit.id,
      assignedToId: item.agent.id,
      createdById: users.director.id,
      dueAt: index % 5 === 0 ? daysAgo(1) : daysFromNow((index % 4) + 1),
      completedAt: index % 7 === 0 ? daysAgo(1) : null,
      createdAt: daysAgo(index % 14),
    })),
  });

  await prisma.adSpend.createMany({
    data: [
      { source: "instagram", campaign: "instagram_may", periodStart: daysAgo(30), periodEnd: new Date(), amount: 6200000, currency: "UZS", notes: "Fake demo Meta campaign", createdById: users.marketing.id },
      { source: "campaign", campaign: "demo_launch", periodStart: daysAgo(30), periodEnd: new Date(), amount: 3800000, currency: "UZS", notes: "Fake launch campaign", createdById: users.marketing.id },
      { source: "telegram", campaign: "telegram_fast", periodStart: daysAgo(30), periodEnd: new Date(), amount: 1500000, currency: "UZS", notes: "Fake Telegram boost", createdById: users.marketing.id },
    ],
  });

  console.log("Demo reset complete.");
  console.log(`Brand: ${DEMO_BRAND} / ${DEMO_BRAND_CYRILLIC}`);
  console.log(`Project: ${project.name}`);
  console.log(`Users: owner, director, 3 agents, back_office, marketing`);
  console.log(`Leads: ${created.length}; deals: ${dealRecords.length}; units: ${units.length}`);
  console.log("Demo login credentials:");
  console.log(`  owner@mirabad-demo.uz / ${DEMO_PASSWORD}`);
  console.log(`  director@mirabad-demo.uz / ${DEMO_PASSWORD}`);
  console.log(`  jasur@mirabad-demo.uz / ${DEMO_PASSWORD}`);
  console.log(`  backoffice@mirabad-demo.uz / ${DEMO_PASSWORD}`);
  if (process.env.DEMO_SEND_TELEGRAM !== "true") {
    console.log("Telegram sending skipped. Set DEMO_SEND_TELEGRAM=true only for a muted/private demo channel.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
