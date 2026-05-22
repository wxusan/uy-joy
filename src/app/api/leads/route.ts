import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createActivity, initializeLeadStageHistory } from "@/lib/crm";
import { leadVisibilityWhere } from "@/lib/crm-access";
import { normalizeLeadStatus } from "@/lib/lead-status";
import { normalizePhone } from "@/lib/phone";
import { LeadCreateSchema } from "@/lib/schemas/lead";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiAccess, requirePlatformFeature } from "@/lib/platform-guards";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { normalizeLeadSource } from "@/lib/lead-sources";
import { createTelegramNotificationLog } from "@/lib/telegram";
import { recordAnalyticsEvent } from "@/lib/analytics-events";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const leadAttempts = new Map<string, { count: number; resetAt: number }>();

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  for (const [ip, entry] of Array.from(leadAttempts.entries())) {
    if (entry.resetAt <= now) leadAttempts.delete(ip);
  }

  const entry = leadAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    leadAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function dateRangeFilter(from: string | null, to: string | null) {
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return Object.keys(range).length > 0 ? range : undefined;
}

function leadInclude() {
  return {
    client: { select: { id: true, fullName: true, phone: true, phoneNormalized: true, status: true } },
    assignedToUser: { select: { id: true, name: true, email: true, role: true } },
    tasks: {
      where: { status: "open" },
      orderBy: { dueAt: "asc" as const },
      take: 1,
      select: { id: true, title: true, dueAt: true, priority: true, status: true },
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiAccess("viewLeads");
  if (auth.response) return auth.response;

  const featureResponse = requirePlatformFeature("crm");
  if (featureResponse) return featureResponse;

  const settings = getPlatformSettings();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;
  const q = cleanText(searchParams.get("q"), 120);
  const createdAt = dateRangeFilter(searchParams.get("from"), searchParams.get("to"));
  const nextActionAt = dateRangeFilter(searchParams.get("nextActionFrom"), searchParams.get("nextActionTo"));

  const where: Prisma.LeadWhereInput = {
    AND: [
      leadVisibilityWhere(auth.user, settings.allowAgentClaim),
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { projectName: { contains: q, mode: "insensitive" } },
              { unitNumber: { contains: q, mode: "insensitive" } },
              { unitNumberSnapshot: { contains: q, mode: "insensitive" } },
              { client: { fullName: { contains: q, mode: "insensitive" } } },
              { client: { phoneNormalized: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
      searchParams.get("status") ? { status: normalizeLeadStatus(searchParams.get("status")) } : {},
      searchParams.get("assignedToId") ? { assignedToId: searchParams.get("assignedToId") } : {},
      searchParams.get("clientId") ? { clientId: searchParams.get("clientId") } : {},
      searchParams.get("projectId") ? { projectId: searchParams.get("projectId") } : {},
      searchParams.get("unitId") ? { unitId: searchParams.get("unitId") } : {},
      searchParams.get("source") ? { source: searchParams.get("source") } : {},
      searchParams.get("campaign") ? { campaign: searchParams.get("campaign") } : {},
      createdAt ? { createdAt } : {},
      nextActionAt ? { nextActionAt } : {},
      searchParams.get("overdue") === "true" ? { nextActionAt: { lt: new Date() }, status: { notIn: ["sold", "lost"] } } : {},
    ],
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: leadInclude(),
      orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    data: leads,
    total,
    page,
    pages: Math.ceil(total / limit),
    filters: Object.fromEntries(searchParams.entries()),
  });
}

export async function POST(request: NextRequest) {
  try {
    const featureResponse = requirePlatformFeature("publicPage");
    if (featureResponse) return featureResponse;

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = LeadCreateSchema.safeParse(body);
    if (!parsed.success) return invalidInput(parsed.error);
    const input = parsed.data;
    const name = cleanText(input.name, 100);
    const phoneInput = cleanText(input.phone, 32);
    const phone = normalizePhone(phoneInput);
    const projectId = cleanText(input.projectId, 64);
    const projectName = cleanText(input.projectName, 140);
    const unitId = cleanText(input.unitId, 64);
    const unitNumber = cleanText(input.unitNumber, 40);
    const source = normalizeLeadSource(cleanText(input.source, 80)) || "contact_form";
    const preferredLanguage = input.preferredLanguage || request.cookies.get("locale")?.value || "uz";
    const referrer = cleanText(input.referrer || request.headers.get("referer"), 400);
    const landingPath = cleanText(input.landingPath || new URL(request.url).pathname, 400);
    const honeypot = cleanText(input.website || input.company || input.url, 200);
    const settings = getPlatformSettings();
    const crmEnabled = platformSettingsHasFeature(settings, "crm");
    const leadBotEnabled = platformSettingsHasFeature(settings, "leadBot");
    const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;

    if (honeypot) return NextResponse.json({ ok: true }, { status: 202 });
    if (!name || !phoneInput) return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    if (!phone.isValid) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    let unitNumberSnapshot: string | null = null;
    let unitAreaSnapshot: number | null = null;
    let unitRoomsSnapshot: number | null = null;
    let unitPriceSnapshot: number | null = null;
    let buildingNameSnapshot: string | null = null;
    let floorNumberSnapshot: number | null = null;

    if (unitId) {
      const unitRecord = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { floor: { include: { building: true } } },
      });
      if (unitRecord) {
        unitNumberSnapshot = unitRecord.unitNumber;
        unitAreaSnapshot = unitRecord.area;
        unitRoomsSnapshot = unitRecord.rooms;
        unitPriceSnapshot =
          unitRecord.totalPrice ?? (unitRecord.pricePerM2 != null ? unitRecord.pricePerM2 * unitRecord.area : null);
        buildingNameSnapshot = unitRecord.floor?.building?.name ?? null;
        floorNumberSnapshot = unitRecord.floor?.number ?? null;
      }
    }

    const lead = await prisma.$transaction(async (tx) => {
      const existingClient = phone.normalized
        ? await tx.client.findFirst({ where: { phoneNormalized: phone.normalized } })
        : null;
      const client = existingClient
        ? await tx.client.update({
            where: { id: existingClient.id },
            data: {
              fullName: name,
              phone: phone.display || phoneInput,
              ...(source ? { source } : {}),
            },
          })
        : await tx.client.create({
            data: {
              fullName: name,
              phone: phone.display || phoneInput,
              phoneNormalized: phone.normalized,
              source: source || null,
              notes: phone.normalized ? null : "Phone could not be confidently normalized; review manually.",
            },
          });

      const createdLead = await tx.lead.create({
        data: {
          name,
          phone: phone.display || phoneInput,
          clientId: client.id,
          projectId: projectId || null,
          projectName: projectName || null,
          unitId: unitId || null,
          unitNumber: unitNumber || null,
          status: "new",
          source,
          sourceDetail: input.sourceDetail || null,
          campaign: input.campaign || null,
          utmSource: input.utmSource || null,
          utmMedium: input.utmMedium || null,
          utmCampaign: input.utmCampaign || null,
          utmContent: input.utmContent || null,
          utmTerm: input.utmTerm || null,
          referrer: referrer || null,
          landingPath: landingPath || null,
          preferredLanguage,
          unitNumberSnapshot,
          unitAreaSnapshot,
          unitRoomsSnapshot,
          unitPriceSnapshot,
          buildingNameSnapshot,
          floorNumberSnapshot,
          lastActivityAt: new Date(),
        },
      });

      await initializeLeadStageHistory(createdLead.id, "new", null, createdLead.stageEnteredAt, tx);
      if (crmEnabled) {
        await createActivity(
          {
            type: "created",
            title: "Lead created",
            clientId: client.id,
            leadId: createdLead.id,
            unitId: unitId || null,
            channel: "website",
            direction: "inbound",
            metadata: {
              source,
              projectId: projectId || null,
              referrer: referrer || null,
              landingPath: landingPath || null,
              utmSource: input.utmSource || null,
              utmMedium: input.utmMedium || null,
              utmCampaign: input.utmCampaign || null,
              phoneNormalized: phone.normalized,
            },
          },
          tx
        );
      }

      if (leadBotEnabled) {
        await createTelegramNotificationLog(
          {
            id: createdLead.id,
            clientId: client.id,
            name: createdLead.name,
            phone: createdLead.phone,
            source,
            projectName: createdLead.projectName,
            unitLabel:
              buildingNameSnapshot || unitNumberSnapshot
                ? [buildingNameSnapshot, floorNumberSnapshot ? `Floor ${floorNumberSnapshot}` : null, unitNumberSnapshot].filter(Boolean).join(" / ")
                : createdLead.unitNumber,
            preferredLanguage,
            utmCampaign: createdLead.utmCampaign,
            createdAt: createdLead.createdAt,
          },
          { crmEnabled, crmBaseUrl: baseUrl, locale: preferredLanguage },
          tx
        );
      }

      return tx.lead.findUniqueOrThrow({ where: { id: createdLead.id }, include: leadInclude() });
    });

    recordAnalyticsEvent({
      eventName: "lead_form_success",
      leadId: lead.id,
      clientId: lead.clientId,
      properties: {
        source,
        projectId: projectId || null,
        unitId: unitId || null,
        campaign: input.campaign || null,
        utmSource: input.utmSource || null,
        utmMedium: input.utmMedium || null,
        utmCampaign: input.utmCampaign || null,
        utmContent: input.utmContent || null,
        utmTerm: input.utmTerm || null,
        referrer: referrer || null,
        landingPath: landingPath || null,
        preferredLanguage,
        analyticsSessionId: input.analyticsSessionId || null,
      },
    }).catch(() => {
      // Reporting mirrors must never fail lead capture.
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
