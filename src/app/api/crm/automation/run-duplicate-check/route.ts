/**
 * POST /api/crm/automation/run-duplicate-check
 *
 * Finds active leads sharing the same phone number (after basic normalization).
 * For each duplicate:
 *  1. Creates a system activity on the NEWER lead flagging it as a potential duplicate.
 *  2. Creates an urgent review task assigned to that lead's manager (or unassigned).
 *
 * Idempotent: each (duplicateLeadId, primaryLeadId) pair is guarded by automationRef.
 * The oldest lead in a duplicate group is treated as the primary.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCronSecret } from "@/lib/platform-guards";
import { logger } from "@/lib/logger";
import { normalizePhone } from "@/lib/phone";
import { automationRefExists, createAutomationActivity } from "@/lib/automation-rules";
import { createTelegramAlertLog } from "@/lib/telegram";

export async function POST(request: Request) {
  const cron = requireCronSecret(request);
  if (cron) return cron;

  const now = new Date();

  // Load all active leads with phone and creation timestamp.
  const activeLeads = await prisma.lead.findMany({
    where: { status: { notIn: ["sold", "lost"] } },
    select: {
      id: true,
      name: true,
      phone: true,
      clientId: true,
      assignedToId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" }, // oldest first → first in group is primary
  });

  // Group by normalized phone. Skip leads with un-normalizable phones.
  const groups = new Map<string, typeof activeLeads>();
  for (const lead of activeLeads) {
    if (!lead.phone) continue;
    const { normalized } = normalizePhone(lead.phone);
    const key = normalized ?? lead.phone.replace(/[\s\-()]/g, "").toLowerCase();
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(lead);
    groups.set(key, group);
  }

  let created = 0;
  let skipped = 0;

  for (const group of Array.from(groups.values())) {
    if (group.length < 2) continue;

    const [primary, ...duplicates] = group; // oldest is primary

    for (const dup of duplicates) {
      const ref = `duplicate_flag_${dup.id}_${primary.id}`;
      const exists = await automationRefExists(ref);
      if (exists) { skipped++; continue; }

      // Log the duplicate flag as a system activity on the newer lead.
      await createAutomationActivity({
        ref,
        title: "Mumkin bo'lgan dublikat lid topildi",
        body: `Bu lid "${primary.name}" (${primary.phone}, ${primary.createdAt.toLocaleDateString()}) bilan bir xil telefon raqamiga ega. Ko'rib chiqing.`,
        leadId: dup.id,
        clientId: dup.clientId,
        assignedToId: dup.assignedToId,
        extraMetadata: { primaryLeadId: primary.id, primaryPhone: primary.phone },
      });

      // Create an urgent review task for the manager (required assignedToId).
      if (dup.assignedToId) {
        await prisma.task.create({
          data: {
            title: "Dublikat lidni ko'rib chiqing",
            description: `"${dup.name}" va "${primary.name}" bir xil telefon raqamiga ega. Eski lid: ${primary.id}`,
            type: "other",
            priority: "high",
            leadId: dup.id,
            clientId: dup.clientId,
            assignedToId: dup.assignedToId,
            dueAt: now,
          },
        });
      }

      await createTelegramAlertLog({
        type: "lead_duplicate_detected",
        leadId: dup.id,
        clientId: dup.clientId,
        clientName: dup.name,
        clientPhone: dup.phone,
        taskTitle: `Bir xil raqam: ${primary.name}`,
        crmPath: `/portal/management-x7k9/crm/leads/${dup.id}`,
        ref,
      }, { crmBaseUrl: process.env.NEXTAUTH_URL || null }).catch((error) => {
        console.error("Failed to queue Telegram duplicate alert:", error);
      });

      created++;
    }
  }

  logger.info("duplicate_check_processed", { created, skipped, groups: groups.size });
  return NextResponse.json({ created, skipped, duplicateGroups: groups.size });
}

export const GET = POST;
