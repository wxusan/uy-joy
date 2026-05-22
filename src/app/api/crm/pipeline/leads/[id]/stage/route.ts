import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity, statusTimestampPatch, transitionLeadStage } from "@/lib/crm";
import { canEditLead } from "@/lib/crm-access";
import { normalizeLeadStatus } from "@/lib/lead-status";
import { PipelineStageUpdateSchema } from "@/lib/schemas/crm";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = PipelineStageUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditLead(auth.user, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const previousUpdatedAt = input.updatedAt ? new Date(input.updatedAt) : null;
  if (previousUpdatedAt && existing.updatedAt.getTime() !== previousUpdatedAt.getTime()) {
    const latest = await prisma.lead.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, fullName: true, phone: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        tasks: { where: { status: "open" }, orderBy: { dueAt: "asc" }, take: 1 },
      },
    });
    return NextResponse.json({ error: "Lead has changed. Refresh before moving it.", lead: latest }, { status: 409 });
  }

  const nextStatus = normalizeLeadStatus(input.status);
  if (nextStatus === "lost" && !input.lostReason && !existing.lostReason) {
    return NextResponse.json({ error: "lostReason is required when moving a lead to lost" }, { status: 400 });
  }

  const lead = await prisma.$transaction(async (tx) => {
    if (nextStatus !== normalizeLeadStatus(existing.status)) {
      await transitionLeadStage(existing, nextStatus, auth.user?.id ?? null, tx);
    }

    const updated = await tx.lead.update({
      where: { id },
      data: {
        status: nextStatus,
        stageEnteredAt: nextStatus !== normalizeLeadStatus(existing.status) ? new Date() : existing.stageEnteredAt,
        lostReason: nextStatus === "lost" ? input.lostReason || existing.lostReason : null,
        ...statusTimestampPatch(nextStatus),
        ...(existing.firstResponseAt ? { firstResponseAt: existing.firstResponseAt } : {}),
      },
      include: {
        client: { select: { id: true, fullName: true, phone: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
    });

    await createActivity(
      {
        type: "status_changed",
        title: `Pipeline stage changed to ${nextStatus}`,
        clientId: updated.clientId,
        leadId: updated.id,
        actorId: auth.user?.id ?? null,
        metadata: { fromStatus: normalizeLeadStatus(existing.status), toStatus: nextStatus },
      },
      tx
    );

    return updated;
  });

  return NextResponse.json(lead);
}

export const PATCH = PUT;
