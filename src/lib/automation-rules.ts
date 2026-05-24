/**
 * Automation rules — shared helpers for all CRM automation cron jobs.
 *
 * Design principles:
 * - Every automated action is idempotent: guarded by an automationRef stored in
 *   the activity's metadata so re-running the cron never duplicates work.
 * - All automated actions are logged as system activities on the affected lead
 *   so managers can see what the system did and when.
 * - No high-risk mutations (status changes, deletions) are performed silently.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Returns today's date in Tashkent timezone as "YYYY-MM-DD". Used for daily idempotency refs. */
export function tashkentDateString(now = new Date()): string {
  const shifted = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Checks whether a system activity with this automationRef already exists.
 * Call this before creating any automated activity or task to keep crons idempotent.
 */
export async function automationRefExists(ref: string, db: Db = prisma): Promise<boolean> {
  const existing = await db.activity.findFirst({
    where: {
      type: "system",
      metadata: { path: ["automationRef"], equals: ref },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * Creates a system activity tagged with an automationRef for audit and idempotency.
 * The automationRef is stored inside metadata so it can be queried without a schema change.
 */
export async function createAutomationActivity(
  input: {
    ref: string;
    title: string;
    body?: string | null;
    leadId?: string | null;
    clientId?: string | null;
    dealId?: string | null;
    unitId?: string | null;
    taskId?: string | null;
    assignedToId?: string | null;
    extraMetadata?: Record<string, unknown>;
  },
  db: Db = prisma
) {
  return db.activity.create({
    data: {
      type: "system",
      channel: "system",
      title: input.title,
      body: input.body ?? null,
      leadId: input.leadId ?? null,
      clientId: input.clientId ?? null,
      dealId: input.dealId ?? null,
      unitId: input.unitId ?? null,
      taskId: input.taskId ?? null,
      assignedToId: input.assignedToId ?? null,
      metadata: {
        automationRef: input.ref,
        ...input.extraMetadata,
      } as Prisma.InputJsonValue,
      occurredAt: new Date(),
    },
  });
}

export const AUTOMATION_INACTIVITY_CUTOFF_HOURS = 48;
