import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";
import { normalizePlatformRole } from "@/lib/platform-plans";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const settings = getPlatformSettings();
  if (!settings.allowAgentClaim) return NextResponse.json({ error: "Lead claiming is disabled" }, { status: 403 });
  if (!auth.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const role = normalizePlatformRole(auth.user.role);
  if (role !== "sales_agent" && role !== "external_agent") {
    return NextResponse.json({ error: "Only sales agents can claim leads" }, { status: 403 });
  }

  const { id } = await params;
  const result = await prisma.lead.updateMany({
    where: { id, assignedToId: null },
    data: {
      assignedToId: auth.user.id,
      assignedTo: null,
      lastActivityAt: new Date(),
    },
  });

  if (result.count === 0) {
    const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true, assignedToId: true } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Lead is already assigned" }, { status: 409 });
  }

  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
    },
  });

  await createActivity({
    type: "assigned",
    title: "Lead claimed",
    clientId: lead.clientId,
    leadId: lead.id,
    actorId: auth.user.id,
    assignedToId: auth.user.id,
    channel: "manual",
  });

  return NextResponse.json(lead);
}
