import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { taskVisibilityWhere } from "@/lib/crm-access";
import { TaskCreateSchema } from "@/lib/schemas/crm";
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

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
  const status = searchParams.get("status");
  const assignedToId = searchParams.get("assignedToId");
  const clientId = searchParams.get("clientId");
  const leadId = searchParams.get("leadId");
  const settings = getPlatformSettings();
  const visibility: Prisma.TaskWhereInput = taskVisibilityWhere(auth.user, settings.allowAgentClaim);
  const dueBefore = searchParams.get("dueBefore");
  const where: Prisma.TaskWhereInput = {
    AND: [
      visibility,
      status ? { status } : {},
      assignedToId ? { assignedToId } : {},
      clientId ? { clientId } : {},
      leadId ? { leadId } : {},
      searchParams.get("overdue") === "true" ? { status: "open", dueAt: { lt: new Date() } } : {},
      dueBefore ? { dueAt: { lte: new Date(dueBefore) } } : {},
    ],
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: includeTask(),
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({ data: tasks, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;

  const body = await request.json();
  const parsed = TaskCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description || null,
      type: input.type,
      priority: input.priority,
      clientId: input.clientId || null,
      leadId: input.leadId || null,
      unitId: input.unitId || null,
      assignedToId: input.assignedToId,
      createdById: auth.user?.id ?? null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
    include: includeTask(),
  });

  if (task.leadId && task.dueAt) {
    await prisma.lead.update({
      where: { id: task.leadId },
      data: { nextActionAt: task.dueAt },
    });
  }

  await createActivity({
    type: "task",
    title: input.activityTitle || task.title,
    body: input.activityBody || null,
    clientId: task.clientId,
    leadId: task.leadId,
    unitId: task.unitId,
    taskId: task.id,
    actorId: auth.user?.id ?? null,
    assignedToId: task.assignedToId,
    channel: "manual",
  });

  return NextResponse.json(task, { status: 201 });
}
