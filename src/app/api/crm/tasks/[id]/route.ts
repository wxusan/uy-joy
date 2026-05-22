import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { canViewAllLeads, taskVisibilityWhere } from "@/lib/crm-access";
import { TaskUpdateSchema } from "@/lib/schemas/crm";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

function includeTask() {
  return {
    client: { select: { id: true, fullName: true, phone: true } },
    lead: { select: { id: true, name: true, status: true } },
    assignedTo: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;

  const { id } = await params;
  const settings = getPlatformSettings();
  const task = await prisma.task.findFirst({
    where: { AND: [{ id }, taskVisibilityWhere(auth.user, settings.allowAgentClaim)] },
    include: includeTask(),
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(task);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = TaskUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);

  const input = parsed.data;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canManageTask = canViewAllLeads(auth.user) || existing.assignedToId === auth.user?.id || existing.createdById === auth.user?.id;
  if (!canManageTask) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canViewAllLeads(auth.user) && input.assignedToId !== undefined && input.assignedToId !== existing.assignedToId) {
    return NextResponse.json({ error: "Only directors/admins can reassign tasks" }, { status: 403 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && {
        status: input.status,
        completedAt:
          input.status === "completed"
            ? input.completedAt
              ? new Date(input.completedAt)
              : new Date()
            : input.completedAt === null
              ? null
              : undefined,
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
      ...(input.dueAt !== undefined && { dueAt: input.dueAt ? new Date(input.dueAt) : null }),
      ...(input.completedAt !== undefined && input.status === undefined && {
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
      }),
    },
    include: includeTask(),
  });

  await createActivity({
    type: "task",
    title: input.status === "completed" ? `Task completed: ${task.title}` : `Task updated: ${task.title}`,
    clientId: task.clientId,
    leadId: task.leadId,
    unitId: task.unitId,
    taskId: task.id,
    actorId: auth.user?.id ?? null,
    assignedToId: task.assignedToId,
    channel: "manual",
    metadata: { previousStatus: existing.status, nextStatus: task.status },
  });

  return NextResponse.json(task);
}

export const PATCH = PUT;

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;
  if (!canViewAllLeads(auth.user)) return NextResponse.json({ error: "Only directors/admins can delete tasks" }, { status: 403 });

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
