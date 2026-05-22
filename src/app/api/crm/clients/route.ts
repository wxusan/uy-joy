import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { clientVisibilityWhere } from "@/lib/crm-access";
import { normalizePhone } from "@/lib/phone";
import { ClientCreateSchema } from "@/lib/schemas/crm";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

function clientInclude() {
  return {
    assignedTo: { select: { id: true, name: true, email: true, role: true } },
    leads: {
      orderBy: { createdAt: "desc" as const },
      take: 5,
      select: { id: true, name: true, status: true, projectName: true, unitNumber: true, createdAt: true },
    },
    _count: { select: { leads: true, activities: true, tasks: true } },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const q = searchParams.get("q")?.trim();
  const phone = q ? normalizePhone(q).normalized : null;
  const status = searchParams.get("status");
  const assignedToId = searchParams.get("assignedToId");
  const source = searchParams.get("source");
  const createdFrom = searchParams.get("createdFrom");
  const createdTo = searchParams.get("createdTo");
  const createdAt: Prisma.DateTimeFilter = {};
  if (createdFrom) createdAt.gte = new Date(createdFrom);
  if (createdTo) createdAt.lte = new Date(createdTo);
  const settings = getPlatformSettings();
  const visibility = clientVisibilityWhere(auth.user, settings.allowAgentClaim);
  const where: Prisma.ClientWhereInput = {
    AND: [
      visibility,
      status ? { status } : {},
      assignedToId ? { assignedToId } : {},
      source ? { source } : {},
      Object.keys(createdAt).length > 0 ? { createdAt } : {},
      q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { phoneNormalized: phone ? { contains: phone, mode: "insensitive" } : undefined },
              { email: { contains: q, mode: "insensitive" } },
              { telegramUsername: { contains: q, mode: "insensitive" } },
              { instagramUsername: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: clientInclude(),
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({ data: clients, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const body = await request.json();
  const parsed = ClientCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);

  const input = parsed.data;
  const phone = normalizePhone(input.phone);
  const duplicate = phone.normalized
    ? await prisma.client.findFirst({ where: { phoneNormalized: phone.normalized } })
    : null;
  if (duplicate) {
    return NextResponse.json({ error: "A client with this normalized phone already exists", clientId: duplicate.id }, { status: 409 });
  }

  const client = await prisma.client.create({
    data: {
      ...input,
      phone: phone.display || input.phone,
      phoneNormalized: phone.normalized,
      secondaryPhone: input.secondaryPhone || null,
      email: input.email || null,
      telegramUsername: input.telegramUsername || null,
      instagramUsername: input.instagramUsername || null,
      preferredLanguage: input.preferredLanguage || null,
      companyName: input.companyName || null,
      source: input.source || null,
      notes: input.notes || null,
      assignedToId: input.assignedToId || null,
      createdById: auth.user?.id ?? null,
    },
    include: clientInclude(),
  });

  await createActivity({
    type: "created",
    title: "Client created",
    clientId: client.id,
    actorId: auth.user?.id ?? null,
    channel: "manual",
  });

  return NextResponse.json(client, { status: 201 });
}
