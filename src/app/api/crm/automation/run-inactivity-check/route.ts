/**
 * POST /api/crm/automation/run-inactivity-check
 *
 * Finds sales agents who have active leads but have not logged any contact
 * in the last 48 hours. For each inactive manager:
 *  1. Sends a Telegram alert to the director chat.
 *  2. Creates a system activity on their oldest unanswered lead as an audit log.
 *
 * Idempotent: one alert per manager per calendar day (Tashkent timezone).
 * Only fires when a director, sales, or default Telegram chat is configured.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCronSecret } from "@/lib/platform-guards";
import { logger } from "@/lib/logger";
import { createTelegramAlertLog } from "@/lib/telegram";
import {
  automationRefExists,
  createAutomationActivity,
  tashkentDateString,
  AUTOMATION_INACTIVITY_CUTOFF_HOURS,
} from "@/lib/automation-rules";

const SELLING_ROLES = ["sales_agent", "external_agent"] as const;
const ACTIVE_STATUSES = { notIn: ["sold", "lost"] };

function disabledInactivityAgentIds() {
  return new Set(
    (process.env.CRM_INACTIVITY_ALERTS_DISABLED_USER_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export async function POST(request: Request) {
  const cron = requireCronSecret(request);
  if (cron) return cron;

  const now = new Date();
  const today = tashkentDateString(now);
  const cutoff = new Date(now.getTime() - AUTOMATION_INACTIVITY_CUTOFF_HOURS * 60 * 60 * 1000);
  const crmBaseUrl = process.env.NEXTAUTH_URL || null;
  const disabledAgentIds = disabledInactivityAgentIds();

  // Load all selling agents with at least one active lead.
  const agents = await prisma.user.findMany({
    where: {
      role: { in: [...SELLING_ROLES] },
      assignedLeads: { some: { status: ACTIVE_STATUSES } },
    },
    select: { id: true, name: true, email: true },
  });

  if (agents.length === 0) {
    return NextResponse.json({ alerted: 0, skipped: 0 });
  }

  const agentIds = agents.map((a) => a.id);

  // Find the most recent lastContactedAt per agent across their active leads.
  const latestContactGroups = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: { assignedToId: { in: agentIds }, status: ACTIVE_STATUSES },
    _max: { lastContactedAt: true },
    _count: { _all: true },
  });

  type ContactGroup = { assignedToId: string | null; _max: { lastContactedAt: Date | null }; _count: { _all: number } };
  const contactMap = new Map<string, ContactGroup>();
  for (const row of latestContactGroups as ContactGroup[]) {
    if (row.assignedToId) contactMap.set(row.assignedToId, row);
  }

  let alerted = 0;
  let skipped = 0;

  for (const agent of agents) {
    if (disabledAgentIds.has(agent.id)) { skipped++; continue; }
    const row = contactMap.get(agent.id);
    const lastContact = row?._max?.lastContactedAt ?? null;
    const activeLeadsCount = row?._count._all ?? 0;

    // Only flag if: no contact ever, or last contact older than cutoff.
    if (lastContact && lastContact >= cutoff) { skipped++; continue; }

    const ref = `manager_inactive_${agent.id}_${today}`;
    const activityExists = await automationRefExists(ref);
    if (activityExists) { skipped++; continue; }

    // Find the oldest unanswered active lead for this agent (used as leadId for Telegram + activity).
    const oldestLead = await prisma.lead.findFirst({
      where: { assignedToId: agent.id, status: ACTIVE_STATUSES, firstResponseAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, clientId: true },
    }) ?? await prisma.lead.findFirst({
      where: { assignedToId: agent.id, status: ACTIVE_STATUSES },
      orderBy: { createdAt: "asc" },
      select: { id: true, clientId: true },
    });

    if (!oldestLead) { skipped++; continue; }

    const agentName = agent.name || agent.email || agent.id;

    // Telegram alert to director.
    await createTelegramAlertLog(
      {
        type: "manager_inactive",
        leadId: oldestLead.id,
        clientId: oldestLead.clientId,
        managerName: agentName,
        activeLeadsCount,
        dueAt: lastContact, // repurposed as "last contact" timestamp
        crmPath: `/portal/management-x7k9/crm/director`,
        ref,
      },
      { crmBaseUrl }
    ).catch((err) => {
      console.error("Failed to queue manager_inactive Telegram alert:", err);
    });

    // System activity on lead as audit log.
    await createAutomationActivity({
      ref,
      title: `Menejer faolsiz: ${agentName}`,
      body: lastContact
        ? `${agentName} oxirgi marta ${lastContact.toLocaleDateString()} da bog'langan. ${activeLeadsCount} ta faol lid kutmoqda.`
        : `${agentName} hech qachon bog'lanmagan. ${activeLeadsCount} ta faol lid kutmoqda.`,
      leadId: oldestLead.id,
      clientId: oldestLead.clientId,
      extraMetadata: { agentId: agent.id, lastContactedAt: lastContact?.toISOString() ?? null, activeLeadsCount },
    });

    alerted++;
  }

  logger.info("inactivity_check_processed", { alerted, skipped, agents: agents.length });
  return NextResponse.json({ alerted, skipped, agents: agents.length });
}

export const GET = POST;
