import { PrismaClient, type User, type Unit } from "@prisma/client";
import { createActivity, ensureDefaultPipelineStages, initializeLeadStageHistory } from "../src/lib/crm";
import { ensureDefaultLeadSources } from "../src/lib/lead-sources";
import { normalizePhone } from "../src/lib/phone";
import { calculateDealFinancials, generatePaymentSchedule } from "../src/lib/real-estate";

const prisma = new PrismaClient();
const MARKER = "sales_sandbox_v1";
const EXCHANGE_RATE = 12_650;

const sourceCatalog = [
  { key: "youtube_taqdimot", label: { uz: "YouTube taqdimot", ru: "YouTube презентация", en: "YouTube presentation" } },
  { key: "blogger_influencer", label: { uz: "Bloger tavsiyasi", ru: "Блогер", en: "Blogger influencer" } },
  { key: "telegram_ads", label: { uz: "Telegram reklama", ru: "Telegram реклама", en: "Telegram ads" } },
  { key: "instagram_reels", label: { uz: "Instagram Reels", ru: "Instagram Reels", en: "Instagram Reels" } },
  { key: "site_embed", label: { uz: "Sayt formasi", ru: "Форма сайта", en: "Website embed" } },
  { key: "walk_in", label: { uz: "Savdo ofisiga keldi", ru: "Визит в офис", en: "Walk-in" } },
  { key: "referral", label: { uz: "Tavsiya", ru: "Рекомендация", en: "Referral" } },
  { key: "olx", label: { uz: "OLX", ru: "OLX", en: "OLX" } },
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
];

const statuses = [
  "new",
  "new",
  "new",
  "contacted",
  "contacted",
  "contacted",
  "contacted",
  "meeting",
  "meeting",
  "meeting",
  "negotiation",
  "negotiation",
  "negotiation",
  "reserved",
  "reserved",
  "reserved",
  "sold",
  "sold",
  "lost",
  "lost",
];

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysAgo(days: number) {
  return daysFromNow(-days);
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function requiredUser(users: User[], role: string) {
  const user = users.find((item) => item.role === role && item.isActive);
  if (!user) throw new Error(`No active ${role} user found. Run npm run users:create-role-test first.`);
  return user;
}

async function resetSandbox() {
  await prisma.adSpend.deleteMany({ where: { notes: { contains: MARKER } } });

  const clients = await prisma.client.findMany({ where: { notes: { contains: MARKER } }, select: { id: true } });
  const clientIds = clients.map((client) => client.id);
  if (clientIds.length === 0) return;

  const deals = await prisma.deal.findMany({ where: { clientId: { in: clientIds } }, select: { id: true, primaryUnitId: true } });
  const dealIds = deals.map((deal) => deal.id);
  const unitIds = deals.map((deal) => deal.primaryUnitId).filter((id): id is string => Boolean(id));
  const leads = await prisma.lead.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
  const leadIds = leads.map((lead) => lead.id);

  await prisma.analyticsEvent.deleteMany({ where: { OR: [{ clientId: { in: clientIds } }, { leadId: { in: leadIds } }] } });
  await prisma.telegramNotificationLog.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.activity.deleteMany({ where: { OR: [{ clientId: { in: clientIds } }, { leadId: { in: leadIds } }, { dealId: { in: dealIds } }] } });
  await prisma.task.deleteMany({ where: { OR: [{ clientId: { in: clientIds } }, { leadId: { in: leadIds } }, { dealId: { in: dealIds } }] } });
  await prisma.refund.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.payment.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.paymentPlan.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.document.deleteMany({ where: { OR: [{ clientId: { in: clientIds } }, { leadId: { in: leadIds } }, { dealId: { in: dealIds } }] } });
  await prisma.dealUnit.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
  await prisma.leadStageHistory.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  if (unitIds.length > 0) {
    await prisma.unit.updateMany({
      where: { id: { in: unitIds } },
      data: {
        status: "available",
        currentDealId: null,
        reservedByClientId: null,
        soldToClientId: null,
        reservedAt: null,
        soldAt: null,
        reservationExpiresAt: null,
      },
    });
  }
}

async function ensureSources(marketing: User) {
  await ensureDefaultLeadSources();
  await Promise.all(
    sourceCatalog.map((source) =>
      prisma.leadSource.upsert({
        where: { key: source.key },
        create: { key: source.key, labelJson: source.label, isSystem: false, isActive: true },
        update: { labelJson: source.label, isActive: true },
      })
    )
  );

  await prisma.adSpend.createMany({
    data: sourceCatalog.slice(0, 5).map((source, index) => ({
      source: source.key,
      campaign: `${source.key}_may_2026`,
      periodStart: daysAgo(30),
      periodEnd: new Date(),
      amount: [6_500_000, 4_200_000, 3_100_000, 5_800_000, 1_200_000][index],
      currency: "UZS",
      notes: `${MARKER}: fake spend for CRM/report testing`,
      createdById: marketing.id,
    })),
  });
}

async function createDeal(input: {
  index: number;
  status: string;
  clientId: string;
  leadId: string;
  projectId: string;
  unit: Unit;
  assignedToId: string;
  createdById: string;
  source: string;
}) {
  const listPrice = input.unit.totalPrice || input.unit.area * (input.unit.pricePerM2 || 1050);
  const financials = calculateDealFinancials({
    listPrice,
    discountPercent: input.status === "sold" ? 3 : input.status === "payment_active" ? 6 : 0,
    initialPaymentPercent: input.status === "sold" ? 45 : 30,
    termMonths: input.status === "sold" ? 0 : input.status === "payment_active" ? 18 : 12,
  });
  const { discountRequiresApproval: _discountRequiresApproval, ...dealFinancials } = financials;
  const now = new Date();
  const deal = await prisma.deal.create({
    data: {
      dealNumber: `SBX-${String(input.index + 1).padStart(4, "0")}`,
      clientId: input.clientId,
      leadId: input.leadId,
      projectId: input.projectId,
      primaryUnitId: input.unit.id,
      assignedToId: input.assignedToId,
      createdById: input.createdById,
      status: input.status,
      source: input.source,
      exchangeRateToPaymentCurrency: EXCHANGE_RATE,
      exchangeRateLockedAt: now,
      ...dealFinancials,
      reservedAt: ["reserved", "contract_preparation", "payment_active", "sold"].includes(input.status) ? daysAgo(4) : null,
      reservationExpiresAt: input.status === "reserved" ? daysFromNow(2) : null,
      contractedAt: ["payment_active", "sold"].includes(input.status) ? daysAgo(2) : null,
      soldAt: input.status === "sold" ? daysAgo(1) : null,
      lostAt: input.status === "cancelled" ? daysAgo(2) : null,
      lostReason: input.status === "cancelled" ? "Client chose a cheaper project after negotiation." : null,
      notes: `${MARKER}: realistic fake deal`,
    },
  });

  await prisma.dealUnit.create({ data: { dealId: deal.id, unitId: input.unit.id, priceAtDeal: financials.salePrice, isPrimary: true } });
  await prisma.unit.update({
    where: { id: input.unit.id },
    data: {
      status: input.status === "sold" ? "sold" : "reserved",
      currentDealId: deal.id,
      reservedByClientId: input.clientId,
      soldToClientId: input.status === "sold" ? input.clientId : null,
      reservedAt: deal.reservedAt,
      soldAt: deal.soldAt,
      reservationExpiresAt: deal.reservationExpiresAt,
      statusChangedAt: now,
    },
  });

  if (input.status === "payment_active" || input.status === "sold") {
    const rows = generatePaymentSchedule({
      salePrice: financials.salePrice,
      initialPaymentAmount: financials.initialPaymentAmount,
      remainingAmount: financials.remainingAmount,
      termMonths: Math.max(financials.paymentTermMonths, 1),
      startsAt: daysAgo(2),
    });
    const plan = await prisma.paymentPlan.create({
      data: {
        dealId: deal.id,
        name: "Sandbox installment plan",
        type: financials.paymentTermMonths > 0 ? "installment" : "cash",
        totalAmount: financials.salePrice,
        initialPaymentAmount: financials.initialPaymentAmount,
        remainingAmount: financials.remainingAmount,
        termMonths: financials.paymentTermMonths,
        startsAt: daysAgo(2),
        scheduleJson: rows,
        status: "active",
        createdById: input.createdById,
        notes: `${MARKER}: fake payment schedule`,
      },
    });
    await prisma.payment.createMany({
      data: rows.slice(0, 6).map((row, index) => ({
        paymentPlanId: plan.id,
        dealId: deal.id,
        clientId: input.clientId,
        sequence: row.sequence,
        label: row.label,
        dueDate: row.dueDate,
        expectedAmount: row.expectedAmount,
        expectedAmountPaymentCurrency: Math.round(row.expectedAmount * EXCHANGE_RATE),
        exchangeRate: EXCHANGE_RATE,
        paidAmount: index === 0 || input.status === "sold" ? row.expectedAmount : 0,
        paidAmountPaymentCurrency: index === 0 || input.status === "sold" ? Math.round(row.expectedAmount * EXCHANGE_RATE) : null,
        status: index === 0 || input.status === "sold" ? "paid" : index === 1 ? "overdue" : "scheduled",
        paidAt: index === 0 || input.status === "sold" ? daysAgo(1) : null,
        method: index === 0 || input.status === "sold" ? "bank_transfer" : null,
        notes: `${MARKER}: fake payment`,
      })),
    });
  }

  await prisma.document.createMany({
    data: [
      { type: "passport", title: "Passport copy", status: "approved" },
      { type: "reservation_agreement", title: "Reservation agreement", status: input.status === "reserved" ? "needs_review" : "approved" },
      { type: "payment_receipt", title: "Initial payment receipt", status: input.status === "payment_active" ? "needs_review" : "uploaded" },
    ].map((doc, index) => ({
      clientId: input.clientId,
      leadId: input.leadId,
      dealId: deal.id,
      unitId: input.unit.id,
      uploadedById: input.assignedToId,
      reviewedById: doc.status === "approved" ? input.createdById : null,
      type: doc.type,
      title: doc.title,
      fileUrl: `https://example.com/sandbox/${deal.id}/${index + 1}.pdf`,
      fileName: `${doc.type}.pdf`,
      fileSize: 180_000 + index * 20_000,
      mimeType: "application/pdf",
      status: doc.status,
    })),
  });

  await createActivity({
    type: "deal",
    title: `Sandbox deal ${input.status.replace(/_/g, " ")}`,
    clientId: input.clientId,
    leadId: input.leadId,
    dealId: deal.id,
    unitId: input.unit.id,
    actorId: input.createdById,
    assignedToId: input.assignedToId,
    channel: "manual",
    metadata: { marker: MARKER, source: input.source },
  });
}

async function main() {
  if (process.env.SALES_SANDBOX_CONFIRM !== "seed") {
    throw new Error("Set SALES_SANDBOX_CONFIRM=seed to add realistic sandbox CRM data.");
  }

  if (process.env.SALES_SANDBOX_RESET === "1") await resetSandbox();
  const existing = await prisma.client.count({ where: { notes: { contains: MARKER } } });
  if (existing > 0) {
    console.log(`Sandbox data already exists (${existing} clients). Set SALES_SANDBOX_RESET=1 to rebuild it.`);
    return;
  }

  await ensureDefaultPipelineStages();
  const users = await prisma.user.findMany({ where: { isActive: true } });
  const owner = requiredUser(users, "owner");
  const director = requiredUser(users, "sales_director");
  const marketing = users.find((user) => user.role === "marketing" && user.isActive) || owner;
  const finance = users.find((user) => user.role === "finance" && user.isActive) || owner;
  const agents = users.filter((user) => ["sales_agent", "external_agent"].includes(user.role) && user.isActive);
  if (agents.length === 0) throw new Error("No active sales_agent or external_agent found.");

  await ensureSources(marketing);
  const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) throw new Error("No project found. Create or seed a project first.");
  const units = await prisma.unit.findMany({
    where: { status: { in: ["available", "reserved", "sold"] } },
    include: { floor: { include: { building: true } } },
    orderBy: [{ floorId: "asc" }, { unitNumber: "asc" }],
    take: names.length,
  });
  if (units.length < 20) throw new Error("Need at least 20 units to seed a useful sales sandbox.");

  const created = [];
  for (let index = 0; index < names.length; index += 1) {
    const agent = pick(agents, index);
    const source = pick(sourceCatalog, index);
    const unit = units[index];
    const status = pick(statuses, index);
    const phone = `+998 9${index % 8} ${String(120 + index).padStart(3, "0")} ${String(40 + index).padStart(2, "0")} ${String(10 + index).padStart(2, "0")}`;
    const normalized = normalizePhone(phone);
    const client = await prisma.client.create({
      data: {
        fullName: names[index],
        phone: normalized.display || phone,
        phoneNormalized: normalized.normalized,
        email: `sandbox.client.${index + 1}@example.com`,
        telegramUsername: `sandbox_client_${index + 1}`,
        instagramUsername: index % 3 === 0 ? `sandbox_insta_${index + 1}` : null,
        preferredLanguage: pick(["uz", "ru", "uz", "en"], index),
        source: source.key,
        notes: `${MARKER}: realistic fake client from ${source.key}`,
        assignedToId: agent.id,
        createdById: director.id,
      },
    });
    const createdAt = daysAgo(42 - index);
    const lead = await prisma.lead.create({
      data: {
        name: client.fullName,
        phone: client.phone,
        clientId: client.id,
        projectId: project.id,
        projectName: project.name,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        unitNumberSnapshot: unit.unitNumber,
        unitAreaSnapshot: unit.area,
        unitRoomsSnapshot: unit.rooms,
        unitPriceSnapshot: unit.totalPrice,
        buildingNameSnapshot: unit.floor.building.name,
        floorNumberSnapshot: unit.floor.number,
        status,
        notes: `${MARKER}: ${status} lead. Interested in ${unit.rooms}-room unit. Budget and urgency captured for demo.`,
        source: source.key,
        sourceDetail: source.label.en,
        campaign: `${source.key}_may_2026`,
        utmSource: source.key.includes("youtube") ? "youtube" : source.key.includes("instagram") ? "instagram" : source.key,
        utmMedium: source.key.includes("walk") || source.key === "referral" ? "offline" : "paid",
        utmCampaign: `${source.key}_may_2026`,
        utmContent: index % 2 === 0 ? "video_walkthrough" : "price_offer",
        referrer: source.key.includes("youtube") ? "https://youtube.com/@demo-taqdimot" : null,
        landingPath: index % 2 === 0 ? "/apartments" : "/embed/lead-form",
        preferredLanguage: client.preferredLanguage,
        assignedToId: agent.id,
        assignedTo: agent.name,
        lostReason: status === "lost" ? pick(["Price too high", "Needs mortgage", "Bought from competitor"], index) : null,
        createdAt,
        stageEnteredAt: daysAgo(Math.max(1, 20 - index)),
        nextActionAt: ["sold", "lost"].includes(status) ? null : daysFromNow((index % 6) - 2),
        nextFollowUp: ["sold", "lost"].includes(status) ? null : daysFromNow((index % 6) - 2),
        lastActivityAt: daysAgo(index % 8),
        lastContactedAt: index % 4 === 0 ? null : daysAgo(index % 7),
        convertedAt: status === "sold" ? daysAgo(index % 5) : null,
        closedAt: status === "sold" || status === "lost" ? daysAgo(index % 5) : null,
      },
    });
    await initializeLeadStageHistory(lead.id, status, director.id, lead.stageEnteredAt);

    await prisma.analyticsEvent.createMany({
      data: ["lead_form_view", "lead_form_start", "lead_form_submit"].map((eventName, step) => ({
        eventName,
        source: source.key,
        campaign: `${source.key}_may_2026`,
        utmSource: source.key,
        utmMedium: source.key.includes("walk") ? "offline" : "paid",
        utmCampaign: `${source.key}_may_2026`,
        projectId: project.id,
        unitId: unit.id,
        leadId: lead.id,
        clientId: client.id,
        distinctId: `sandbox-${index + 1}`,
        sessionId: `sandbox-session-${index + 1}`,
        landingPath: lead.landingPath,
        locale: lead.preferredLanguage,
        properties: { marker: MARKER, step },
        occurredAt: daysAgo(42 - index),
      })),
    });

    await createActivity({
      type: "communication",
      title: index % 3 === 0 ? "Inbound Telegram message" : "Outbound call logged",
      body: "Sandbox conversation: budget, preferred floor, payment plan, and next meeting noted.",
      clientId: client.id,
      leadId: lead.id,
      actorId: index % 3 === 0 ? null : agent.id,
      assignedToId: agent.id,
      direction: index % 3 === 0 ? "inbound" : "outbound",
      channel: index % 3 === 0 ? "telegram" : index % 3 === 1 ? "phone" : "sms",
      metadata: { marker: MARKER, source: source.key },
      occurredAt: daysAgo(index % 8),
    });

    await prisma.task.createMany({
      data: [
        {
          title: index % 4 === 0 ? "Send payment plan on Telegram" : "Call and qualify budget",
          description: `${MARKER}: fake sales task`,
          type: index % 4 === 0 ? "sms" : "call",
          priority: index % 5 === 0 ? "urgent" : "normal",
          clientId: client.id,
          leadId: lead.id,
          unitId: unit.id,
          assignedToId: agent.id,
          createdById: director.id,
          dueAt: ["sold", "lost"].includes(status) ? daysAgo(1) : daysFromNow((index % 7) - 3),
          status: ["sold", "lost"].includes(status) ? "completed" : "open",
          completedAt: ["sold", "lost"].includes(status) ? daysAgo(1) : null,
        },
        {
          title: "Prepare objection answer",
          description: `${MARKER}: fake negotiation task`,
          type: "follow_up",
          priority: "normal",
          clientId: client.id,
          leadId: lead.id,
          unitId: unit.id,
          assignedToId: agent.id,
          createdById: director.id,
          dueAt: daysFromNow((index % 5) + 1),
          status: status === "new" ? "open" : "completed",
          completedAt: status === "new" ? null : daysAgo(2),
        },
      ],
    });

    created.push({ client, lead, unit, agent, source: source.key, status });
  }

  const reservedPool = created.filter((row) => row.status === "reserved");
  const soldPool = created.filter((row) => row.status === "sold");
  const lostPool = created.filter((row) => row.status === "lost");
  const negotiationPool = created.filter((row) => row.status === "negotiation");
  const takeFrom = <T>(pool: T[], label: string) => {
    const item = pool.shift();
    if (!item) throw new Error(`Not enough ${label} sandbox leads to create deals.`);
    return item;
  };

  const dealPlan = [
    ...Array.from({ length: 4 }, () => ({ status: "reserved", item: takeFrom(reservedPool, "reserved") })),
    ...Array.from({ length: 2 }, () => ({ status: "contract_preparation", item: takeFrom(reservedPool, "reserved") })),
    ...Array.from({ length: 2 }, () => ({ status: "payment_active", item: takeFrom(negotiationPool, "negotiation") })),
    ...Array.from({ length: 4 }, () => ({ status: "sold", item: takeFrom(soldPool, "sold") })),
    { status: "cancelled", item: takeFrom(lostPool, "lost") },
  ];

  const leadStatusByDealStatus: Record<string, string> = {
    reserved: "reserved",
    contract_preparation: "reserved",
    payment_active: "sold",
    sold: "sold",
    cancelled: "lost",
  };

  for (let index = 0; index < dealPlan.length; index += 1) {
    const { status, item } = dealPlan[index];
    await prisma.lead.update({
      where: { id: item.lead.id },
      data: {
        status: leadStatusByDealStatus[status],
        convertedAt: ["payment_active", "sold"].includes(status) ? daysAgo(1) : item.lead.convertedAt,
        closedAt: ["payment_active", "sold", "cancelled"].includes(status) ? daysAgo(1) : item.lead.closedAt,
        unitId: item.unit.id,
        unitNumber: item.unit.unitNumber,
      },
    });
    await createDeal({
      index,
      status,
      clientId: item.client.id,
      leadId: item.lead.id,
      projectId: project.id,
      unit: item.unit,
      assignedToId: item.agent.id,
      createdById: index % 2 === 0 ? director.id : owner.id,
      source: item.source,
    });
  }

  await prisma.task.createMany({
    data: [
      {
        title: "Finance: confirm overdue installment",
        description: `${MARKER}: finance user should see this task`,
        type: "payment",
        priority: "urgent",
        assignedToId: finance.id,
        createdById: owner.id,
        dueAt: daysAgo(1),
      },
      {
        title: "Marketing: compare YouTube taqdimot vs blogger leads",
        description: `${MARKER}: marketing user should see source reporting context`,
        type: "report",
        priority: "normal",
        assignedToId: marketing.id,
        createdById: owner.id,
        dueAt: daysFromNow(2),
      },
    ],
  });

  console.log(`Seeded ${created.length} clients/leads, ${dealPlan.length} deals, tasks, activities, documents, analytics, and ad spend.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
