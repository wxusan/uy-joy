import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "./prisma";
import { type LeadStatus, normalizeLeadStatus } from "./lead-status";

type Db = PrismaClient | Prisma.TransactionClient;

export const DEFAULT_PIPELINE_STAGES = [
  { key: "new", name: "New", sortOrder: 10, color: "#2563eb", isDefault: true, isWon: false, isLost: false },
  { key: "contacted", name: "Contacted", sortOrder: 20, color: "#0891b2", isDefault: true, isWon: false, isLost: false },
  { key: "meeting", name: "Meeting", sortOrder: 30, color: "#7c3aed", isDefault: true, isWon: false, isLost: false },
  { key: "negotiation", name: "Negotiation", sortOrder: 40, color: "#ca8a04", isDefault: true, isWon: false, isLost: false },
  { key: "reserved", name: "Reserved", sortOrder: 50, color: "#ea580c", isDefault: true, isWon: false, isLost: false },
  { key: "sold", name: "Sold", sortOrder: 60, color: "#16a34a", isDefault: true, isWon: true, isLost: false },
  { key: "lost", name: "Lost", sortOrder: 70, color: "#64748b", isDefault: true, isWon: false, isLost: true },
] as const satisfies readonly Prisma.PipelineStageCreateInput[];

export function taskIsOverdue(task: { status: string; dueAt: Date | string | null }, now = new Date()) {
  return task.status === "open" && Boolean(task.dueAt) && new Date(task.dueAt as Date | string).getTime() < now.getTime();
}

export async function ensureDefaultPipelineStages(db: Db = prisma) {
  await Promise.all(
    DEFAULT_PIPELINE_STAGES.map((stage) =>
      db.pipelineStage.upsert({
        where: { key: stage.key },
        create: stage,
        update: {
          name: stage.name,
          sortOrder: stage.sortOrder,
          color: stage.color,
          isDefault: stage.isDefault,
          isWon: stage.isWon,
          isLost: stage.isLost,
          isActive: true,
        },
      })
    )
  );
}

export async function createActivity(
  input: {
    type: string;
    title: string;
    body?: string | null;
    clientId?: string | null;
    leadId?: string | null;
    unitId?: string | null;
    dealId?: string | null;
    taskId?: string | null;
    actorId?: string | null;
    assignedToId?: string | null;
    direction?: string | null;
    channel?: string | null;
    metadata?: Prisma.InputJsonValue | null;
    occurredAt?: Date;
  },
  db: Db = prisma
) {
  const occurredAt = input.occurredAt ?? new Date();
  const activity = await db.activity.create({
    data: {
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      clientId: input.clientId ?? null,
      leadId: input.leadId ?? null,
      unitId: input.unitId ?? null,
      dealId: input.dealId ?? null,
      taskId: input.taskId ?? null,
      actorId: input.actorId ?? null,
      assignedToId: input.assignedToId ?? null,
      direction: input.direction ?? null,
      channel: input.channel ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
      occurredAt,
    },
  });

  const updateData = { lastActivityAt: occurredAt };
  if (input.leadId) {
    await db.lead.update({ where: { id: input.leadId }, data: updateData });
    if (
      input.direction === "outbound" ||
      input.type === "communication" ||
      input.type === "meeting" ||
      input.type === "visit"
    ) {
      await db.lead.update({
        where: { id: input.leadId },
        data: { lastContactedAt: occurredAt },
      });
      await db.lead.updateMany({
        where: { id: input.leadId, firstResponseAt: null },
        data: { firstResponseAt: occurredAt },
      });
    }
  }
  if (input.clientId) {
    await db.client.update({ where: { id: input.clientId }, data: { updatedAt: occurredAt } });
  }

  return activity;
}

export async function initializeLeadStageHistory(
  leadId: string,
  status: string,
  changedById: string | null = null,
  enteredAt = new Date(),
  db: Db = prisma
) {
  return db.leadStageHistory.create({
    data: {
      leadId,
      fromStatus: null,
      toStatus: normalizeLeadStatus(status),
      changedById,
      enteredAt,
    },
  });
}

export async function transitionLeadStage(
  lead: { id: string; status: string; stageEnteredAt: Date },
  toStatusInput: string,
  changedById: string | null,
  db: Db = prisma
) {
  const fromStatus = normalizeLeadStatus(lead.status);
  const toStatus = normalizeLeadStatus(toStatusInput);
  const now = new Date();

  if (fromStatus === toStatus) return null;

  const openHistory = await db.leadStageHistory.findFirst({
    where: { leadId: lead.id, leftAt: null },
    orderBy: { enteredAt: "desc" },
  });

  if (openHistory) {
    const durationSeconds = Math.max(0, Math.floor((now.getTime() - openHistory.enteredAt.getTime()) / 1000));
    await db.leadStageHistory.update({
      where: { id: openHistory.id },
      data: { leftAt: now, durationSeconds },
    });
  }

  return db.leadStageHistory.create({
    data: {
      leadId: lead.id,
      fromStatus,
      toStatus,
      changedById,
      enteredAt: now,
    },
  });
}

export function statusTimestampPatch(status: LeadStatus) {
  const now = new Date();
  return {
    ...(status !== "new" ? { firstResponseAt: now, lastContactedAt: now } : {}),
    ...(status === "sold" ? { convertedAt: now, closedAt: now } : {}),
    ...(status === "lost" ? { closedAt: now } : {}),
  };
}
