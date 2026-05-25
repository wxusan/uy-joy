import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "./prisma";
import { createActivity } from "./crm";
import { canViewAllLeads, clientVisibilityWhere, type CrmUser } from "./crm-access";
import { normalizePlatformRole, roleHasPlatformPermission } from "./platform-plans";

const NullableString = z.string().trim().max(500).nullable().optional();
const NullableNumber = z.coerce.number().finite().nullable().optional();
const NullableInt = z.coerce.number().int().nullable().optional();

export const QualificationPatchSchema = z.object({
  cityRegion: NullableString,
  familySize: NullableInt,
  roomCounts: z.array(z.coerce.number().int().min(1).max(8)).max(8).nullable().optional(),
  preferredBuilding: NullableString,
  preferredFloorMin: NullableInt,
  preferredFloorMax: NullableInt,
  preferredView: NullableString,
  preferredAreaMin: NullableNumber,
  preferredAreaMax: NullableNumber,
  budgetMin: NullableNumber,
  budgetMax: NullableNumber,
  paymentPreference: z.enum(["cash", "installment", "mortgage", "subsidy", "unknown"]).nullable().optional(),
  initialPaymentAmount: NullableNumber,
  monthlyPaymentComfort: NullableNumber,
  installmentMonths: NullableInt,
  mortgageInterest: z.boolean().nullable().optional(),
  subsidyInterest: z.boolean().nullable().optional(),
  buyingPurpose: z.enum(["self", "investment", "child", "rent", "family"]).nullable().optional(),
  temperature: z.enum(["hot", "warm", "cold", "info_only"]).nullable().optional(),
  urgency: z.enum(["today", "week", "month", "later", "unknown"]).nullable().optional(),
  seriousnessLevel: z.enum(["high", "medium", "low", "unknown"]).nullable().optional(),
  decisionMaker: NullableString,
  objection: NullableString,
  competitorProjects: NullableString,
  bestCallTime: NullableString,
  preferredChannel: z.enum(["phone", "telegram", "sms", "instagram", "any"]).nullable().optional(),
});

export const InterestedUnitCreateSchema = z.object({
  unitId: z.string().trim().min(1).max(120),
  leadId: z.string().trim().min(1).max(120).nullable().optional(),
  interestLevel: z.enum(["interested", "favorite", "alternative", "rejected"]).default("interested"),
  note: z.string().trim().max(1000).nullable().optional(),
});

export type ClientQualification = {
  id: string;
  clientId: string;
  cityRegion: string | null;
  familySize: number | null;
  roomCounts: number[] | null;
  preferredBuilding: string | null;
  preferredFloorMin: number | null;
  preferredFloorMax: number | null;
  preferredView: string | null;
  preferredAreaMin: number | null;
  preferredAreaMax: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  paymentPreference: string | null;
  initialPaymentAmount: number | null;
  monthlyPaymentComfort: number | null;
  installmentMonths: number | null;
  mortgageInterest: boolean | null;
  subsidyInterest: boolean | null;
  buyingPurpose: string | null;
  temperature: string | null;
  urgency: string | null;
  seriousnessLevel: string | null;
  decisionMaker: string | null;
  objection: string | null;
  competitorProjects: string | null;
  bestCallTime: string | null;
  preferredChannel: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InterestedUnit = {
  id: string;
  clientId: string;
  unitId: string;
  leadId: string | null;
  interestLevel: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  totalPrice: number | null;
  floorNumber: number;
  buildingName: string;
};

export type UnitRecommendation = {
  unitId: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  totalPrice: number | null;
  floorNumber: number;
  buildingName: string;
  score: number;
  reason: string;
};

const columns = [
  "cityRegion",
  "familySize",
  "roomCounts",
  "preferredBuilding",
  "preferredFloorMin",
  "preferredFloorMax",
  "preferredView",
  "preferredAreaMin",
  "preferredAreaMax",
  "budgetMin",
  "budgetMax",
  "paymentPreference",
  "initialPaymentAmount",
  "monthlyPaymentComfort",
  "installmentMonths",
  "mortgageInterest",
  "subsidyInterest",
  "buyingPurpose",
  "temperature",
  "urgency",
  "seriousnessLevel",
  "decisionMaker",
  "objection",
  "competitorProjects",
  "bestCallTime",
  "preferredChannel",
] as const;

const fieldLabels: Record<(typeof columns)[number], string> = {
  cityRegion: "Hudud",
  familySize: "Oila soni",
  roomCounts: "Xona soni",
  preferredBuilding: "Blok",
  preferredFloorMin: "Qavat min",
  preferredFloorMax: "Qavat max",
  preferredView: "Tomon/manzara",
  preferredAreaMin: "Maydon min",
  preferredAreaMax: "Maydon max",
  budgetMin: "Budget min",
  budgetMax: "Budget max",
  paymentPreference: "To'lov turi",
  initialPaymentAmount: "Boshlang'ich to'lov",
  monthlyPaymentComfort: "Oylik to'lov qulayligi",
  installmentMonths: "Muddat",
  mortgageInterest: "Ipoteka",
  subsidyInterest: "Subsidiya",
  buyingPurpose: "Maqsad",
  temperature: "Klient harorati",
  urgency: "Muddat",
  seriousnessLevel: "Jiddiylik",
  decisionMaker: "Qaror qiluvchi",
  objection: "E'tiroz",
  competitorProjects: "Raqobatchi loyiha",
  bestCallTime: "Qulay vaqt",
  preferredChannel: "Aloqa kanali",
};

function normalizeRow(row: ClientQualification | null) {
  if (!row) return null;
  return {
    ...row,
    roomCounts: Array.isArray(row.roomCounts) ? row.roomCounts : null,
  };
}

function displayValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "ha" : "yo'q";
  return String(value);
}

export function qualificationCompleteness(qualification: ClientQualification | null) {
  if (!qualification) return 0;
  const important: Array<keyof ClientQualification> = [
    "roomCounts",
    "budgetMax",
    "paymentPreference",
    "buyingPurpose",
    "temperature",
    "urgency",
    "preferredChannel",
    "bestCallTime",
  ];
  const filled = important.filter((key) => {
    const value = qualification[key];
    return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== "";
  }).length;
  return Math.round((filled / important.length) * 100);
}

export function canEditClientQualification(user: CrmUser | null | undefined, client: { assignedToId?: string | null; leads?: { assignedToId?: string | null }[] }) {
  if (!user?.id) return false;
  if (canViewAllLeads(user)) return true;
  const role = normalizePlatformRole(user.role);
  if (role !== "sales_agent" && role !== "external_agent") return false;
  return client.assignedToId === user.id || Boolean(client.leads?.some((lead) => lead.assignedToId === user.id));
}

export function canViewQualification(user: CrmUser | null | undefined) {
  const role = normalizePlatformRole(user?.role);
  return role !== "marketing" && roleHasPlatformPermission(user?.role, "viewLeads");
}

export async function getClientQualification(clientId: string) {
  const rows = await prisma.$queryRaw<ClientQualification[]>`
    SELECT * FROM "ClientQualification" WHERE "clientId" = ${clientId} LIMIT 1
  `;
  return normalizeRow(rows[0] ?? null);
}

export async function upsertClientQualification(clientId: string, patch: z.infer<typeof QualificationPatchSchema>, actorId: string | null) {
  const before = await getClientQualification(clientId);
  const values = Object.fromEntries(columns.map((key) => [key, patch[key] === undefined ? before?.[key] ?? null : patch[key] ?? null]));
  const id = before?.id ?? randomUUID();
  const row = await prisma.$queryRawUnsafe<ClientQualification[]>(
    `
      INSERT INTO "ClientQualification" (
        "id", "clientId", "cityRegion", "familySize", "roomCounts", "preferredBuilding", "preferredFloorMin", "preferredFloorMax",
        "preferredView", "preferredAreaMin", "preferredAreaMax", "budgetMin", "budgetMax", "paymentPreference", "initialPaymentAmount",
        "monthlyPaymentComfort", "installmentMonths", "mortgageInterest", "subsidyInterest", "buyingPurpose", "temperature", "urgency",
        "seriousnessLevel", "decisionMaker", "objection", "competitorProjects", "bestCallTime", "preferredChannel", "updatedById", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("clientId") DO UPDATE SET
        "cityRegion" = EXCLUDED."cityRegion",
        "familySize" = EXCLUDED."familySize",
        "roomCounts" = EXCLUDED."roomCounts",
        "preferredBuilding" = EXCLUDED."preferredBuilding",
        "preferredFloorMin" = EXCLUDED."preferredFloorMin",
        "preferredFloorMax" = EXCLUDED."preferredFloorMax",
        "preferredView" = EXCLUDED."preferredView",
        "preferredAreaMin" = EXCLUDED."preferredAreaMin",
        "preferredAreaMax" = EXCLUDED."preferredAreaMax",
        "budgetMin" = EXCLUDED."budgetMin",
        "budgetMax" = EXCLUDED."budgetMax",
        "paymentPreference" = EXCLUDED."paymentPreference",
        "initialPaymentAmount" = EXCLUDED."initialPaymentAmount",
        "monthlyPaymentComfort" = EXCLUDED."monthlyPaymentComfort",
        "installmentMonths" = EXCLUDED."installmentMonths",
        "mortgageInterest" = EXCLUDED."mortgageInterest",
        "subsidyInterest" = EXCLUDED."subsidyInterest",
        "buyingPurpose" = EXCLUDED."buyingPurpose",
        "temperature" = EXCLUDED."temperature",
        "urgency" = EXCLUDED."urgency",
        "seriousnessLevel" = EXCLUDED."seriousnessLevel",
        "decisionMaker" = EXCLUDED."decisionMaker",
        "objection" = EXCLUDED."objection",
        "competitorProjects" = EXCLUDED."competitorProjects",
        "bestCallTime" = EXCLUDED."bestCallTime",
        "preferredChannel" = EXCLUDED."preferredChannel",
        "updatedById" = EXCLUDED."updatedById",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `,
    id,
    clientId,
    values.cityRegion,
    values.familySize,
    values.roomCounts ? JSON.stringify(values.roomCounts) : null,
    values.preferredBuilding,
    values.preferredFloorMin,
    values.preferredFloorMax,
    values.preferredView,
    values.preferredAreaMin,
    values.preferredAreaMax,
    values.budgetMin,
    values.budgetMax,
    values.paymentPreference,
    values.initialPaymentAmount,
    values.monthlyPaymentComfort,
    values.installmentMonths,
    values.mortgageInterest,
    values.subsidyInterest,
    values.buyingPurpose,
    values.temperature,
    values.urgency,
    values.seriousnessLevel,
    values.decisionMaker,
    values.objection,
    values.competitorProjects,
    values.bestCallTime,
    values.preferredChannel,
    actorId
  );
  const after = normalizeRow(row[0]);
  const changes = columns
    .filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null))
    .map((key) => `${fieldLabels[key]}: ${displayValue(before?.[key])} → ${displayValue(after?.[key])}`);

  if (changes.length) {
    await createActivity({
      type: "note",
      title: "Klient profili yangilandi",
      body: changes.slice(0, 8).join("\n"),
      clientId,
      actorId,
      channel: "manual",
      metadata: { changedFields: changes.length, qualificationCompleteness: qualificationCompleteness(after) },
    });
  }

  return after;
}

export async function getInterestedUnits(clientId: string) {
  return prisma.$queryRaw<InterestedUnit[]>`
    SELECT
      iu.*,
      u."unitNumber",
      u."rooms",
      u."area",
      u."status",
      u."totalPrice",
      f."number" AS "floorNumber",
      b."name" AS "buildingName"
    FROM "ClientInterestedUnit" iu
    JOIN "Unit" u ON u."id" = iu."unitId"
    JOIN "Floor" f ON f."id" = u."floorId"
    JOIN "Building" b ON b."id" = f."buildingId"
    WHERE iu."clientId" = ${clientId}
    ORDER BY iu."createdAt" DESC
  `;
}

export async function addInterestedUnit(clientId: string, input: z.infer<typeof InterestedUnitCreateSchema>, actorId: string | null) {
  const id = randomUUID();
  const rows = await prisma.$queryRawUnsafe<InterestedUnit[]>(
    `
      INSERT INTO "ClientInterestedUnit" ("id", "clientId", "unitId", "leadId", "interestLevel", "note", "addedById", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT ("clientId", "unitId") DO UPDATE SET
        "leadId" = COALESCE(EXCLUDED."leadId", "ClientInterestedUnit"."leadId"),
        "interestLevel" = EXCLUDED."interestLevel",
        "note" = EXCLUDED."note",
        "addedById" = EXCLUDED."addedById",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `,
    id,
    clientId,
    input.unitId,
    input.leadId ?? null,
    input.interestLevel,
    input.note ?? null,
    actorId
  );
  await createActivity({
    type: "note",
    title: "Qiziqqan xonadon qo'shildi",
    body: input.note || null,
    clientId,
    unitId: input.unitId,
    leadId: input.leadId ?? null,
    actorId,
    channel: "manual",
    metadata: { interestLevel: input.interestLevel },
  });
  return rows[0];
}

export async function removeInterestedUnit(clientId: string, unitId: string, actorId: string | null) {
  await prisma.$executeRaw`
    DELETE FROM "ClientInterestedUnit" WHERE "clientId" = ${clientId} AND "unitId" = ${unitId}
  `;
  await createActivity({
    type: "note",
    title: "Qiziqqan xonadon olib tashlandi",
    clientId,
    unitId,
    actorId,
    channel: "manual",
  });
}

function scoreUnit(unit: Omit<UnitRecommendation, "score" | "reason">, qualification: ClientQualification | null, interestedUnitIds: Set<string>) {
  let score = 0;
  const reasons: string[] = [];
  if (unit.status === "available") {
    score += 25;
    reasons.push("bo'sh");
  }
  if (qualification?.roomCounts?.includes(unit.rooms)) {
    score += 25;
    reasons.push(`${unit.rooms} xona`);
  }
  if (qualification?.budgetMax && unit.totalPrice && unit.totalPrice <= qualification.budgetMax) {
    score += 25;
    reasons.push("budgetga mos");
  }
  if (qualification?.budgetMin && unit.totalPrice && unit.totalPrice >= qualification.budgetMin) score += 5;
  if (qualification?.preferredBuilding && unit.buildingName.toLowerCase().includes(qualification.preferredBuilding.toLowerCase())) {
    score += 15;
    reasons.push("blok mos");
  }
  if (qualification?.preferredFloorMin && unit.floorNumber >= qualification.preferredFloorMin) score += 5;
  if (qualification?.preferredFloorMax && unit.floorNumber <= qualification.preferredFloorMax) score += 5;
  if (qualification?.preferredAreaMin && unit.area >= qualification.preferredAreaMin) score += 5;
  if (qualification?.preferredAreaMax && unit.area <= qualification.preferredAreaMax) score += 5;
  if (interestedUnitIds.has(unit.unitId)) {
    score += 10;
    reasons.push("oldin qiziqqan");
  }
  if (unit.status !== "available") score -= 40;
  if (qualification?.budgetMax && unit.totalPrice && unit.totalPrice > qualification.budgetMax * 1.12) score -= 25;
  return { score, reason: reasons.length ? reasons.join(", ") : "o'xshash variant" };
}

export async function getUnitRecommendations(clientId: string) {
  const [qualification, interestedUnits] = await Promise.all([getClientQualification(clientId), getInterestedUnits(clientId)]);
  const interestedUnitIds = new Set(interestedUnits.map((unit) => unit.unitId));
  const units = await prisma.$queryRaw<Array<Omit<UnitRecommendation, "score" | "reason">>>`
    SELECT
      u."id" AS "unitId",
      u."unitNumber",
      u."rooms",
      u."area",
      u."status",
      u."totalPrice",
      f."number" AS "floorNumber",
      b."name" AS "buildingName"
    FROM "Unit" u
    JOIN "Floor" f ON f."id" = u."floorId"
    JOIN "Building" b ON b."id" = f."buildingId"
    WHERE u."status" IN ('available', 'reserved')
    ORDER BY u."status" ASC, u."totalPrice" ASC NULLS LAST
    LIMIT 80
  `;
  return units
    .map((unit) => ({ ...unit, ...scoreUnit(unit, qualification, interestedUnitIds) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export async function findVisibleClientForQualification(clientId: string, user: CrmUser | null | undefined, allowAgentClaim: boolean) {
  return prisma.client.findFirst({
    where: { AND: [{ id: clientId }, clientVisibilityWhere(user, allowAgentClaim)] },
    include: { leads: { select: { id: true, assignedToId: true } } },
  });
}

export function qualificationForRole(qualification: ClientQualification | null, user: CrmUser | null | undefined) {
  if (!qualification) return null;
  if (normalizePlatformRole(user?.role) !== "finance") return qualification;
  return {
    ...qualification,
    familySize: null,
    decisionMaker: null,
    objection: null,
    competitorProjects: null,
    bestCallTime: null,
  };
}
