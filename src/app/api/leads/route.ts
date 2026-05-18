import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { LeadCreateSchema } from "@/lib/schemas/lead";
import { invalidInput } from "@/lib/schemas/common";

const phonePattern = /^\+998\d{9}$/;
const validSources = new Set([
  "kvartiralar",
  "vizual",
  "bosh-sahifa",
  "floating_matchmaker",
  "intent_popup",
  "interactive-floor",
  "apartment-card",
  "waitlist",
]);
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

function normalizeUzPhone(value: string) {
  const compact = value.replace(/[\s\-()]/g, "");
  const withPlus = compact.startsWith("+") ? compact : `+${compact}`;
  return phonePattern.test(withPlus) ? withPlus : "";
}

// GET - List leads with pagination
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.lead.count(),
  ]);

  return NextResponse.json({
    data: leads,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// POST - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = LeadCreateSchema.safeParse(body);
    if (!parsed.success) return invalidInput(parsed.error);
    const input = parsed.data;
    const name = cleanText(input.name, 100);
    const phoneInput = cleanText(input.phone, 32);
    const phone = normalizeUzPhone(phoneInput);
    const projectId = cleanText(input.projectId, 64);
    const projectName = cleanText(input.projectName, 140);
    const unitId = cleanText(input.unitId, 64);
    const unitNumber = cleanText(input.unitNumber, 40);
    const source = cleanText(input.source, 40);
    const honeypot = cleanText(input.website || input.company || input.url, 200);

    if (honeypot) {
      return NextResponse.json({ ok: true }, { status: 202 });
    }

    if (!name || !phoneInput) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    if (source && !validSources.has(source)) {
      return NextResponse.json(
        { error: "Invalid lead source" },
        { status: 400 }
      );
    }

    // If a unitId is provided, snapshot the unit/floor/building details so the
    // lead is still useful in reports even if the unit is later deleted.
    let unitNumberSnapshot: string | null = null;
    let unitAreaSnapshot: number | null = null;
    let unitRoomsSnapshot: number | null = null;
    let unitPriceSnapshot: number | null = null;
    let buildingNameSnapshot: string | null = null;
    let floorNumberSnapshot: number | null = null;

    if (unitId) {
      try {
        const unitRecord = await prisma.unit.findUnique({
          where: { id: unitId },
          include: {
            floor: {
              include: { building: true },
            },
          },
        });
        if (unitRecord) {
          unitNumberSnapshot = unitRecord.unitNumber;
          unitAreaSnapshot = unitRecord.area;
          unitRoomsSnapshot = unitRecord.rooms;
          unitPriceSnapshot =
            unitRecord.totalPrice ??
            (unitRecord.pricePerM2 != null
              ? unitRecord.pricePerM2 * unitRecord.area
              : null);
          buildingNameSnapshot = unitRecord.floor?.building?.name ?? null;
          floorNumberSnapshot = unitRecord.floor?.number ?? null;
        }
      } catch (snapshotError) {
        console.warn("Failed to snapshot unit for lead:", snapshotError);
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        projectId: projectId || null,
        projectName: projectName || null,
        unitId: unitId || null,
        unitNumber: unitNumber || null,
        source: source || null,
        unitNumberSnapshot,
        unitAreaSnapshot,
        unitRoomsSnapshot,
        unitPriceSnapshot,
        buildingNameSnapshot,
        floorNumberSnapshot,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
