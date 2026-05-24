import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { canViewAllLeads, clientVisibilityWhere } from "@/lib/crm-access";
import { normalizePhone } from "@/lib/phone";
import { ClientUpdateSchema } from "@/lib/schemas/crm";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

function clientInclude() {
  return {
    assignedTo: { select: { id: true, name: true, email: true, role: true } },
    leads: { orderBy: { createdAt: "desc" as const }, include: { assignedToUser: { select: { id: true, name: true } } } },
    activities: { orderBy: { occurredAt: "desc" as const }, take: 50 },
    tasks: { orderBy: [{ status: "asc" as const }, { dueAt: "asc" as const }] },
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;

  const { id } = await params;
  const settings = getPlatformSettings();
  const client = await prisma.client.findFirst({
    where: { AND: [{ id }, clientVisibilityWhere(auth.user, settings.allowAgentClaim)] },
    include: clientInclude(),
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(client);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = ClientUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);

  const input = parsed.data;
  const existing = await prisma.client.findUnique({ where: { id }, select: { assignedToId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewAllLeads(auth.user) && existing.assignedToId !== auth.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const phone = input.phone ? normalizePhone(input.phone) : null;
  if (phone?.normalized) {
    const duplicate = await prisma.client.findFirst({
      where: { phoneNormalized: phone.normalized, NOT: { id } },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: "A client with this normalized phone already exists" }, { status: 409 });
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined && { fullName: input.fullName }),
      ...(input.phone !== undefined && { phone: phone?.display || input.phone, phoneNormalized: phone?.normalized ?? null }),
      ...(input.secondaryPhone !== undefined && { secondaryPhone: input.secondaryPhone || null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.telegramUsername !== undefined && { telegramUsername: input.telegramUsername || null }),
      ...(input.instagramUsername !== undefined && { instagramUsername: input.instagramUsername || null }),
      ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage || null }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.companyName !== undefined && { companyName: input.companyName || null }),
      ...(input.source !== undefined && { source: input.source || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId || null }),
    },
    include: clientInclude(),
  });

  await createActivity({
    type: "note",
    title: "Klient yangilandi",
    clientId: client.id,
    actorId: auth.user?.id ?? null,
    channel: "manual",
  });

  return NextResponse.json(client);
}

export const PATCH = PUT;

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
