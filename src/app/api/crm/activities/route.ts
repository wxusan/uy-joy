import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { canViewAllLeads, leadVisibilityWhere } from "@/lib/crm-access";
import { ActivityCreateSchema } from "@/lib/schemas/crm";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
  const clientId = searchParams.get("clientId");
  const leadId = searchParams.get("leadId");
  const dealId = searchParams.get("dealId");
  const unitId = searchParams.get("unitId");
  const type = searchParams.get("type");
  const channel = searchParams.get("channel");
  const visibility: Prisma.ActivityWhereInput = canViewAllLeads(auth.user)
    ? {}
    : {
        OR: [
          { lead: { is: leadVisibilityWhere(auth.user, true) } },
          { actorId: auth.user?.id },
          { assignedToId: auth.user?.id },
        ],
      };
  const where: Prisma.ActivityWhereInput = {
    AND: [
      visibility,
      clientId ? { clientId } : {},
      leadId ? { leadId } : {},
      dealId ? { dealId } : {},
      unitId ? { unitId } : {},
      type ? { type } : {},
      channel ? { channel } : {},
    ],
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        client: { select: { id: true, fullName: true, phone: true } },
        lead: { select: { id: true, name: true, status: true } },
        actor: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return NextResponse.json({ data: activities, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const body = await request.json();
  const parsed = ActivityCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const activity = await createActivity({
    ...input,
    metadata: input.metadata as Prisma.InputJsonValue | undefined,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
    actorId: auth.user?.id ?? null,
  });

  return NextResponse.json(activity, { status: 201 });
}
