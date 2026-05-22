import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const unitTemplates = [
  { rooms: 1, area: 35, position: 0 },
  { rooms: 2, area: 54, position: 1 },
  { rooms: 3, area: 78, position: 2 },
  { rooms: 2, area: 58, position: 3 },
  { rooms: 3, area: 82, position: 4 },
  { rooms: 1, area: 38, position: 5 },
];

const statuses = ["available", "available", "available", "available", "reserved", "reserved", "sold"];

const pipelineStages = [
  { key: "new", name: "New", sortOrder: 10, color: "#2563eb", isDefault: true, isWon: false, isLost: false },
  { key: "contacted", name: "Contacted", sortOrder: 20, color: "#0891b2", isDefault: true, isWon: false, isLost: false },
  { key: "meeting", name: "Meeting", sortOrder: 30, color: "#7c3aed", isDefault: true, isWon: false, isLost: false },
  { key: "negotiation", name: "Negotiation", sortOrder: 40, color: "#ca8a04", isDefault: true, isWon: false, isLost: false },
  { key: "reserved", name: "Reserved", sortOrder: 50, color: "#ea580c", isDefault: true, isWon: false, isLost: false },
  { key: "sold", name: "Sold", sortOrder: 60, color: "#16a34a", isDefault: true, isWon: true, isLost: false },
  { key: "lost", name: "Lost", sortOrder: 70, color: "#64748b", isDefault: true, isWon: false, isLost: true },
];

const defaultLeadSources = [
  { key: "public_page", labelJson: { uz: "Ommaviy sahifa", ru: "Публичная страница", en: "Public page" } },
  { key: "contact_form", labelJson: { uz: "Aloqa formasi", ru: "Форма контакта", en: "Contact form" } },
  { key: "apartment_page", labelJson: { uz: "Xonadon sahifasi", ru: "Страница квартиры", en: "Apartment page" } },
  { key: "visual_explorer", labelJson: { uz: "Vizual tanlov", ru: "Визуальный выбор", en: "Visual explorer" } },
  { key: "floating_contact", labelJson: { uz: "Tez aloqa", ru: "Быстрый контакт", en: "Floating contact" } },
  { key: "waitlist", labelJson: { uz: "Kutish ro'yxati", ru: "Лист ожидания", en: "Waitlist" } },
  { key: "telegram", labelJson: { uz: "Telegram", ru: "Telegram", en: "Telegram" } },
  { key: "instagram", labelJson: { uz: "Instagram", ru: "Instagram", en: "Instagram" } },
  { key: "campaign", labelJson: { uz: "Kampaniya", ru: "Кампания", en: "Campaign" } },
  { key: "manual", labelJson: { uz: "Qo'lda", ru: "Вручную", en: "Manual" } },
];

const defaultFaqs = [
  {
    questionUz: "Ipoteka kredit bormi?",
    answerUz:
      "Ha, biz bir nechta banklar bilan hamkorlik qilamiz, ular qulay shartlarda ipoteka kreditlarini taklif qiladi. Menejerlarimiz sizga eng yaxshi variantni tanlashda yordam beradi.",
    questionEn: "Is mortgage credit available?",
    answerEn:
      "Yes, we work with several banks that offer mortgage loans with favorable terms. Our managers will help you choose the best option.",
    questionRu: "Есть ли ипотечный кредит?",
    answerRu:
      "Да, мы сотрудничаем с несколькими банками, которые предлагают ипотечные кредиты на выгодных условиях. Наши менеджеры помогут подобрать лучший вариант.",
  },
  {
    questionUz: "Xonadon ta'mirlangan holda topshiriladimi?",
    answerUz:
      "Xonadonlar tayyor ta'mir bilan, lekin mebelsiz topshiriladi. Kerak bo'lsa, ichki dizayn bo'yicha hamkorlarimizni tavsiya qilishimiz mumkin.",
    questionEn: "Are apartments delivered furnished?",
    answerEn:
      "Apartments are delivered with finished repairs but without furniture. We can recommend interior design partners if needed.",
    questionRu: "Квартиры сдаются с ремонтом?",
    answerRu:
      "Квартиры сдаются с чистовой отделкой, но без мебели. При необходимости мы можем порекомендовать партнеров по дизайну интерьера.",
  },
  {
    questionUz: "To'lash muddatini uzaytirish mumkinmi?",
    answerUz:
      "Ha, biz moslashuvchan to'lov rejalarini taklif qilamiz. Siz bo'lib to'lash variantlarini savdo bo'limimiz bilan muhokama qilishingiz mumkin.",
    questionEn: "Is it possible to extend the payment period?",
    answerEn:
      "Yes, we offer flexible payment plans. You can discuss installment options with our sales team.",
    questionRu: "Можно ли продлить срок оплаты?",
    answerRu:
      "Да, мы предлагаем гибкие планы оплаты. Вы можете обсудить варианты рассрочки с нашим отделом продаж.",
  },
  {
    questionUz: "Sizning savdo ofisingiz qayerda?",
    answerUz:
      "Savdo ofisimiz qurilish maydonchasida joylashgan. Har kuni soat 9:00 dan 18:00 gacha tashrif buyurishingiz mumkin.",
    questionEn: "Where is your sales office located?",
    answerEn:
      "Our sales office is located at the construction site. You can visit us any day from 9:00 to 18:00.",
    questionRu: "Где находится ваш офис продаж?",
    answerRu:
      "Наш офис продаж расположен на строительной площадке. Вы можете посетить нас в любой день с 9:00 до 18:00.",
  },
];

async function main() {
  // Clear existing data
  await prisma.analyticsEvent.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.telegramNotificationLog.deleteMany();
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
  await prisma.adSpend.deleteMany();
  await prisma.leadSource.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.user.deleteMany();

  // Create owner
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@navruz.uz",
      password: hashedPassword,
      name: "Super Admin",
      role: "owner",
    },
  });

  const director = await prisma.user.create({
    data: {
      email: "director@navruz.uz",
      password: hashedPassword,
      name: "Madina Karimova",
      role: "sales_director",
      salesAgentProfile: {
        create: {
          displayName: "Madina Karimova",
          phone: "+998 90 700 10 01",
          monthlyTargetDeals: 6,
          monthlyTargetRevenue: 480000,
        },
      },
    },
  });

  const agentA = await prisma.user.create({
    data: {
      email: "agent1@navruz.uz",
      password: hashedPassword,
      name: "Jasur Tursunov",
      role: "sales_agent",
      salesAgentProfile: {
        create: {
          displayName: "Jasur Tursunov",
          phone: "+998 90 700 10 02",
          monthlyTargetDeals: 4,
          monthlyTargetRevenue: 260000,
        },
      },
    },
  });

  const agentB = await prisma.user.create({
    data: {
      email: "agent2@navruz.uz",
      password: hashedPassword,
      name: "Nodira Abdullayeva",
      role: "sales_agent",
      salesAgentProfile: {
        create: {
          displayName: "Nodira Abdullayeva",
          phone: "+998 90 700 10 03",
          monthlyTargetDeals: 3,
          monthlyTargetRevenue: 210000,
        },
      },
    },
  });

  // Create project
  const project = await prisma.project.create({
    data: {
      name: "Yo Uy Joy",
      description:
        "Premium residential complex in the heart of Tashkent. Modern architecture, green areas, underground parking, children's playground, and 24/7 security. Located near Amir Temur Square with easy access to metro, schools, and shopping centers.",
      address: "Tashkent, Mirzo Ulugbek district, Buyuk Ipak Yuli 123",
      // Sample aerial view - admin can upload real image
      topViewImage: null,
    },
  });

  // Create building with position data (for clickable area on aerial view)
  // Position is percentage-based: x, y, width, height relative to image
  const building = await prisma.building.create({
    data: {
      name: "Block A",
      projectId: project.id,
      // Building facade images - admin can upload
      frontViewImage: null,
      backViewImage: null,
      leftViewImage: null,
      rightViewImage: null,
    },
  });

  // Create 9 floors with units
  for (let floorNum = 1; floorNum <= 9; floorNum++) {
    let basePricePerM2: number;
    if (floorNum <= 3) basePricePerM2 = 8_000_000;
    else if (floorNum <= 6) basePricePerM2 = 10_000_000;
    else basePricePerM2 = 12_000_000;

    // Calculate floor position on building facade (percentage from bottom)
    // 9 floors, so each floor takes about 10% of height, starting from 10%
    const yEnd = 90 - (floorNum - 1) * 9;
    const yStart = yEnd - 8;

    const floor = await prisma.floor.create({
      data: {
        number: floorNum,
        buildingId: building.id,
        basePricePerM2,
        // Position on building facade image (as percentage from top)
        positionData: JSON.stringify({ yStart, yEnd }),
        // Floor plan image - admin can upload
        floorPlanImage: null,
      },
    });

    // Create 6 units per floor
    for (const template of unitTemplates) {
      const unitNum = `${floorNum}0${template.position + 1}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Corner units (position 0 and 5) get 15% premium
      const isCorner = template.position === 0 || template.position === 5;
      const unitPricePerM2 = isCorner ? basePricePerM2 * 1.15 : basePricePerM2;

      await prisma.unit.create({
        data: {
          unitNumber: unitNum,
          floorId: floor.id,
          rooms: template.rooms,
          area: template.area,
          status,
          pricePerM2: unitPricePerM2,
          totalPrice: Math.round(unitPricePerM2 * template.area),
        },
      });
    }
  }

  await prisma.fAQ.createMany({
    data: defaultFaqs.map((faq, index) => ({
      ...faq,
      sortOrder: index,
      isActive: true,
    })),
  });

  await prisma.pipelineStage.createMany({
    data: pipelineStages,
  });

  await prisma.leadSource.createMany({
    data: defaultLeadSources.map((source) => ({
      ...source,
      isSystem: true,
      isActive: true,
    })),
  });

  const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  const reportUnits = await prisma.unit.findMany({
    include: { floor: { include: { building: true } } },
    orderBy: { unitNumber: "asc" },
    take: 8,
  });

  const demoLeadData = [
    {
      name: "Dilshod Akramov",
      phone: "+998 90 111 22 33",
      source: "public_page",
      campaign: "may_launch",
      status: "reserved",
      agent: agentA,
      unit: reportUnits[0],
      days: 4,
    },
    {
      name: "Malika Saidova",
      phone: "+998 91 222 33 44",
      source: "instagram",
      campaign: "family_homes",
      status: "sold",
      agent: agentA,
      unit: reportUnits[1],
      days: 12,
    },
    {
      name: "Azizbek Nurmatov",
      phone: "+998 93 333 44 55",
      source: "visual_explorer",
      campaign: "a_block_view",
      status: "meeting",
      agent: agentB,
      unit: reportUnits[2],
      days: 2,
    },
    {
      name: "Irina Petrova",
      phone: "+998 95 444 55 66",
      source: "apartment_page",
      campaign: "two_room",
      status: "contacted",
      agent: agentB,
      unit: reportUnits[3],
      days: 7,
    },
    {
      name: "Bekzod Hamidov",
      phone: "+998 97 555 66 77",
      source: "telegram",
      campaign: "telegram_may",
      status: "new",
      agent: null,
      unit: reportUnits[4],
      days: 1,
    },
    {
      name: "Gulnora Usmonova",
      phone: "+998 99 666 77 88",
      source: "public_page",
      campaign: "may_launch",
      status: "lost",
      agent: agentB,
      unit: reportUnits[5],
      days: 18,
    },
  ];

  for (let index = 0; index < demoLeadData.length; index += 1) {
    const item = demoLeadData[index];
    const client = await prisma.client.create({
      data: {
        fullName: item.name,
        phone: item.phone,
        phoneNormalized: item.phone.replace(/\s/g, ""),
        source: item.source,
        assignedToId: item.agent?.id || null,
        createdById: admin.id,
        createdAt: daysAgo(item.days),
      },
    });

    const lead = await prisma.lead.create({
      data: {
        name: item.name,
        phone: item.phone,
        clientId: client.id,
        projectId: project.id,
        projectName: project.name,
        unitId: item.unit?.id || null,
        unitNumber: item.unit?.unitNumber || null,
        status: item.status,
        source: item.source,
        campaign: item.campaign,
        utmSource: item.source === "instagram" ? "meta" : item.source,
        utmMedium: item.source === "instagram" ? "paid_social" : "organic",
        utmCampaign: item.campaign,
        assignedToId: item.agent?.id || null,
        unitNumberSnapshot: item.unit?.unitNumber || null,
        unitAreaSnapshot: item.unit?.area || null,
        unitRoomsSnapshot: item.unit?.rooms || null,
        unitPriceSnapshot: item.unit?.totalPrice || null,
        buildingNameSnapshot: item.unit?.floor.building.name || null,
        floorNumberSnapshot: item.unit?.floor.number || null,
        stageEnteredAt: daysAgo(Math.max(1, item.days - 1)),
        firstResponseAt: item.status === "new" ? null : daysAgo(Math.max(0, item.days - 1)),
        lastActivityAt: daysAgo(Math.max(0, item.days - 1)),
        createdAt: daysAgo(item.days),
      },
    });

    await prisma.leadStageHistory.create({
      data: {
        leadId: lead.id,
        toStatus: item.status,
        changedById: item.agent?.id || director.id,
        enteredAt: lead.stageEnteredAt,
        createdAt: lead.createdAt,
      },
    });

    await prisma.activity.create({
      data: {
        type: "communication",
        title: index % 2 === 0 ? "Call completed" : "Message sent",
        clientId: client.id,
        leadId: lead.id,
        unitId: item.unit?.id || null,
        actorId: item.agent?.id || director.id,
        assignedToId: item.agent?.id || null,
        channel: index % 2 === 0 ? "call" : "telegram",
        direction: "outbound",
        occurredAt: daysAgo(Math.max(0, item.days - 1)),
        createdAt: daysAgo(Math.max(0, item.days - 1)),
      },
    });

    await prisma.task.create({
      data: {
        title: item.status === "new" ? "First call" : "Follow up",
        type: item.status === "meeting" ? "meeting" : "call",
        status: item.status === "lost" ? "completed" : "open",
        clientId: client.id,
        leadId: lead.id,
        unitId: item.unit?.id || null,
        assignedToId: item.agent?.id || director.id,
        createdById: director.id,
        dueAt: item.status === "new" ? daysAgo(1) : daysAgo(-2),
        completedAt: item.status === "lost" ? daysAgo(12) : null,
        createdAt: daysAgo(item.days),
      },
    });

    await prisma.analyticsEvent.createMany({
      data: [
        {
          eventName: "lead_form_view",
          source: item.source,
          campaign: item.campaign,
          utmCampaign: item.campaign,
          projectId: project.id,
          unitId: item.unit?.id || null,
          sessionId: `demo-${index}`,
          occurredAt: daysAgo(item.days),
          landingPath: item.unit ? `/apartments?unit=${item.unit.unitNumber}` : "/",
        },
        {
          eventName: "lead_form_start",
          source: item.source,
          campaign: item.campaign,
          utmCampaign: item.campaign,
          projectId: project.id,
          unitId: item.unit?.id || null,
          sessionId: `demo-${index}`,
          occurredAt: daysAgo(item.days),
        },
        {
          eventName: "lead_form_submit",
          source: item.source,
          campaign: item.campaign,
          utmCampaign: item.campaign,
          projectId: project.id,
          unitId: item.unit?.id || null,
          sessionId: `demo-${index}`,
          occurredAt: daysAgo(item.days),
        },
        {
          eventName: "lead_form_success",
          source: item.source,
          campaign: item.campaign,
          utmCampaign: item.campaign,
          projectId: project.id,
          unitId: item.unit?.id || null,
          leadId: lead.id,
          clientId: client.id,
          sessionId: `demo-${index}`,
          occurredAt: daysAgo(item.days),
        },
      ],
    });

    if (item.status === "reserved" || item.status === "sold") {
      const listPrice = item.unit?.totalPrice || 0;
      const salePrice = Math.round(listPrice * (item.status === "sold" ? 0.97 : 0.99));
      const deal = await prisma.deal.create({
        data: {
          dealNumber: `DEMO-${String(index + 1).padStart(3, "0")}`,
          clientId: client.id,
          leadId: lead.id,
          projectId: project.id,
          primaryUnitId: item.unit?.id || null,
          assignedToId: item.agent?.id || null,
          createdById: director.id,
          status: item.status,
          source: item.source,
          currency: "UZS",
          displayCurrency: "UZS",
          paymentCurrency: "UZS",
          listPrice,
          discountPercent: item.status === "sold" ? 3 : 1,
          discountAmount: listPrice - salePrice,
          salePrice,
          initialPaymentAmount: Math.round(salePrice * 0.25),
          initialPaymentPercent: 25,
          remainingAmount: Math.round(salePrice * 0.75),
          paymentTermMonths: item.status === "sold" ? 12 : 6,
          monthlyPaymentAmount: Math.round((salePrice * 0.75) / (item.status === "sold" ? 12 : 6)),
          reservedAt: item.status === "reserved" ? daysAgo(item.days - 1) : daysAgo(item.days - 5),
          soldAt: item.status === "sold" ? daysAgo(item.days - 2) : null,
          createdAt: daysAgo(item.days),
        },
      });

      if (item.unit) {
        await prisma.dealUnit.create({
          data: { dealId: deal.id, unitId: item.unit.id, priceAtDeal: salePrice, isPrimary: true },
        });
        await prisma.unit.update({
          where: { id: item.unit.id },
          data: {
            status: item.status,
            currentDealId: deal.id,
            reservedByClientId: client.id,
            soldToClientId: item.status === "sold" ? client.id : null,
            reservedAt: deal.reservedAt,
            soldAt: deal.soldAt,
            statusChangedAt: daysAgo(item.days - 1),
          },
        });
      }

      if (item.status === "sold") {
        const plan = await prisma.paymentPlan.create({
          data: {
            dealId: deal.id,
            name: "12 month demo plan",
            type: "installment",
            totalAmount: salePrice,
            initialPaymentAmount: Math.round(salePrice * 0.25),
            remainingAmount: Math.round(salePrice * 0.75),
            termMonths: 12,
            status: "active",
            createdById: director.id,
            createdAt: daysAgo(item.days - 2),
          },
        });

        await prisma.payment.createMany({
          data: [
            {
              paymentPlanId: plan.id,
              dealId: deal.id,
              clientId: client.id,
              sequence: 1,
              label: "Initial payment",
              dueDate: daysAgo(item.days - 2),
              expectedAmount: Math.round(salePrice * 0.25),
              paidAmount: Math.round(salePrice * 0.25),
              status: "paid",
              paidAt: daysAgo(item.days - 1),
            },
            {
              paymentPlanId: plan.id,
              dealId: deal.id,
              clientId: client.id,
              sequence: 2,
              label: "Installment 1",
              dueDate: daysAgo(3),
              expectedAmount: Math.round((salePrice * 0.75) / 12),
              paidAmount: 0,
              status: "overdue",
            },
            {
              paymentPlanId: plan.id,
              dealId: deal.id,
              clientId: client.id,
              sequence: 3,
              label: "Installment 2",
              dueDate: daysAgo(-27),
              expectedAmount: Math.round((salePrice * 0.75) / 12),
              paidAmount: 0,
              status: "scheduled",
            },
          ],
        });
      }
    }
  }

  await prisma.analyticsEvent.createMany({
    data: Array.from({ length: 18 }).map((_, index) => ({
      eventName: "public_page_view",
      source: index % 3 === 0 ? "instagram" : "public_page",
      campaign: index % 3 === 0 ? "family_homes" : "may_launch",
      utmCampaign: index % 3 === 0 ? "family_homes" : "may_launch",
      projectId: project.id,
      sessionId: `demo-view-${index}`,
      landingPath: "/",
      occurredAt: daysAgo(index % 14),
    })),
  });

  await prisma.adSpend.createMany({
    data: [
      {
        source: "instagram",
        campaign: "family_homes",
        periodStart: daysAgo(30),
        periodEnd: new Date(),
        amount: 4500000,
        currency: "UZS",
        notes: "Demo Meta campaign spend",
        createdById: admin.id,
      },
      {
        source: "public_page",
        campaign: "may_launch",
        periodStart: daysAgo(30),
        periodEnd: new Date(),
        amount: 1200000,
        currency: "UZS",
        notes: "Demo landing page promotion",
        createdById: admin.id,
      },
    ],
  });

  console.log("✅ Seed completed: demo project, inventory, CRM leads, deals, payments, analytics, ad spend, and report-ready agents");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
