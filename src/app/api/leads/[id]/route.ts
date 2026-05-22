import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity, statusTimestampPatch, transitionLeadStage } from "@/lib/crm";
import { canEditLead, canViewAllLeads, leadVisibilityWhere } from "@/lib/crm-access";
import { normalizeLeadStatus } from "@/lib/lead-status";
import { LeadUpdateSchema } from "@/lib/schemas/lead";
import { requirePlatformApiAccess, requirePlatformFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

function includeLead() {
  return {
    client: true,
    assignedToUser: { select: { id: true, name: true, email: true, role: true } },
    activities: { orderBy: { occurredAt: "desc" as const }, take: 20 },
    tasks: { orderBy: [{ status: "asc" as const }, { dueAt: "asc" as const }] },
    stageHistory: { orderBy: { enteredAt: "desc" as const } },
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiAccess("viewLeads");
  if (auth.response) return auth.response;

  const featureResponse = requirePlatformFeature("crm");
  if (featureResponse) return featureResponse;

  const { id } = await params;
  const settings = getPlatformSettings();
  const lead = await prisma.lead.findFirst({
    where: { AND: [{ id }, leadVisibilityWhere(auth.user, settings.allowAgentClaim)] },
    include: includeLead(),
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(lead);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePlatformApiAccess("manageLeads");
    if (auth.response) return auth.response;

    const featureResponse = requirePlatformFeature("crm");
    if (featureResponse) return featureResponse;
    if (!canViewAllLeads(auth.user)) return NextResponse.json({ error: "Only directors/admins can delete leads" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const parsed = LeadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canEditLead(auth.user, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const input = parsed.data;
    const nextStatus = input.status ? normalizeLeadStatus(input.status) : null;
    if (
      auth.user?.role === "sales_agent" &&
      input.assignedToId !== undefined &&
      input.assignedToId !== auth.user.id
    ) {
      return NextResponse.json({ error: "Sales agents cannot reassign leads away from themselves" }, { status: 403 });
    }
    if (nextStatus === "lost" && !input.lostReason && !existing.lostReason) {
      return NextResponse.json({ error: "lostReason is required when moving a lead to lost" }, { status: 400 });
    }

    const actorId = auth.user?.id ?? null;
    const updated = await prisma.$transaction(async (tx) => {
      if (nextStatus && nextStatus !== normalizeLeadStatus(existing.status)) {
        await transitionLeadStage(existing, nextStatus, actorId, tx);
      }

      const data = {
        ...(nextStatus && {
          status: nextStatus,
          stageEnteredAt: new Date(),
          ...statusTimestampPatch(nextStatus),
          ...(existing.firstResponseAt ? { firstResponseAt: existing.firstResponseAt } : {}),
        }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo || null }),
        ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId || null }),
        ...(input.clientId !== undefined && { clientId: input.clientId || null }),
        ...(input.lostReason !== undefined && { lostReason: input.lostReason || null }),
        ...(input.nextFollowUp !== undefined && { nextFollowUp: input.nextFollowUp ? new Date(input.nextFollowUp) : null }),
        ...(input.nextActionAt !== undefined && { nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null }),
      };

      const lead = await tx.lead.update({ where: { id }, data });

      if (nextStatus && nextStatus !== normalizeLeadStatus(existing.status)) {
        await createActivity(
          {
            type: "status_changed",
            title: `Status changed to ${nextStatus}`,
            clientId: lead.clientId,
            leadId: lead.id,
            actorId,
            metadata: { fromStatus: normalizeLeadStatus(existing.status), toStatus: nextStatus },
          },
          tx
        );
      }

      if (input.assignedToId !== undefined && input.assignedToId !== existing.assignedToId) {
        await createActivity(
          {
            type: "assigned",
            title: input.assignedToId ? "Lead assigned" : "Lead unassigned",
            clientId: lead.clientId,
            leadId: lead.id,
            actorId,
            assignedToId: input.assignedToId || null,
            metadata: { fromAssignedToId: existing.assignedToId, toAssignedToId: input.assignedToId || null },
          },
          tx
        );
      }

      if (input.notes !== undefined && input.notes !== existing.notes) {
        await createActivity(
          {
            type: "note",
            title: "Note updated",
            body: input.notes || null,
            clientId: lead.clientId,
            leadId: lead.id,
            actorId,
            channel: "manual",
          },
          tx
        );
      }

      return tx.lead.findUniqueOrThrow({ where: { id }, include: includeLead() });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePlatformApiAccess("manageLeads");
    if (auth.response) return auth.response;

    const featureResponse = requirePlatformFeature("crm");
    if (featureResponse) return featureResponse;

    const { id } = await params;
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
