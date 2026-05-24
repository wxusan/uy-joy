/**
 * POST /api/crm/automation/run-followup-reminders
 *
 * For every open task that is past its due date and linked to a lead:
 *  1. Creates a system activity on the lead (idempotent — one per task per calendar day).
 *  2. Resets lead.nextActionAt to now if it is already in the past, keeping the lead
 *     visible in the "Needs action" dashboard queue.
 *
 * Safe to run multiple times per day — duplicate actions are guarded by automationRef.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCronSecret } from "@/lib/platform-guards";
import { logger } from "@/lib/logger";
import {
  automationRefExists,
  createAutomationActivity,
  tashkentDateString,
} from "@/lib/automation-rules";

export async function POST(request: Request) {
  const cron = requireCronSecret(request);
  if (cron) return cron;

  const now = new Date();
  const today = tashkentDateString(now);

  const overdueTasks = await prisma.task.findMany({
    where: {
      status: "open",
      dueAt: { lt: now },
      leadId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueAt: true,
      leadId: true,
      clientId: true,
      assignedToId: true,
      lead: { select: { nextActionAt: true, clientId: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 100,
  });

  let created = 0;
  let skipped = 0;

  for (const task of overdueTasks) {
    if (!task.leadId) continue;

    const ref = `followup_reminder_${task.id}_${today}`;
    const exists = await automationRefExists(ref);
    if (exists) { skipped++; continue; }

    await createAutomationActivity({
      ref,
      title: `Avtomatik eslatma: "${task.title}" — muddat o'tdi`,
      body: task.dueAt
        ? `Vazifa muddati ${task.dueAt.toLocaleDateString()} da tugagan. Qayta aloqa kerak.`
        : "Vazifa muddati tugagan.",
      leadId: task.leadId,
      clientId: task.lead?.clientId ?? task.clientId ?? null,
      taskId: task.id,
      assignedToId: task.assignedToId,
      extraMetadata: { taskId: task.id, dueAt: task.dueAt?.toISOString() },
    });

    // Keep lead surfaced in the "Needs action" dashboard queue.
    if (!task.lead?.nextActionAt || task.lead.nextActionAt < now) {
      await prisma.lead.update({
        where: { id: task.leadId },
        data: { nextActionAt: now },
      });
    }

    created++;
  }

  logger.info("followup_reminders_processed", { created, skipped, total: overdueTasks.length });
  return NextResponse.json({ created, skipped, total: overdueTasks.length });
}

export const GET = POST;
