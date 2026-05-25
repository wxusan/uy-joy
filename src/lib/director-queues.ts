/**
 * Director Control Panel — data-fetching helpers.
 * All queries are team-wide (directors/owners only).
 * Finance data is returned without amounts or client identifying info
 * so callers can gate the section per role before rendering.
 */
import prisma from "./prisma";
import {
  ACTIVE_LEAD_STATUS_WHERE,
  activeDealWhere,
  expiringReservationWhere,
  overduePaymentWhere,
  overdueTaskWhere,
  tashkentDayBounds,
  unansweredLeadWhere,
} from "./operational-counts";

const SELLING_ROLES = ["sales_agent", "external_agent", "sales_director"] as const;
export type DirectorQueues = Awaited<ReturnType<typeof fetchDirectorQueues>>;

export async function fetchDirectorQueues(now = new Date()) {
  const { start: todayStart, end: tomorrowStart } = tashkentDayBounds(now);
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Load agents first so we can use their IDs in groupBy queries.
  const agentUsers = await prisma.user.findMany({
    where: { role: { in: [...SELLING_ROLES] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { assignedLeads: { where: ACTIVE_LEAD_STATUS_WHERE } } },
    },
    orderBy: { name: "asc" },
  });
  const agentIds = agentUsers.map((a) => a.id);

  const [
    unansweredLeads,
    unansweredLeadCount,
    overdueFollowups,
    overdueFollowupCount,
    expiringReservations,
    expiringReservationCount,
    overduePaymentCount,
    overduePayments,
    weakSources,
    recentAlerts,
    newTodayCounts,
    contactedWeekCounts,
    overdueTaskCounts,
    activeDealCounts,
    latestContactPerAgent,
  ] = await Promise.all([
    // Unanswered: active leads with no first response, oldest first.
    prisma.lead.findMany({
      where: unansweredLeadWhere(),
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        createdAt: true,
        assignedToUser: { select: { name: true } },
        client: { select: { fullName: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 15,
    }),

    prisma.lead.count({
      where: unansweredLeadWhere(),
    }),

    // Overdue follow-ups: open tasks past due date.
    prisma.task.findMany({
      where: overdueTaskWhere(now),
      select: {
        id: true,
        title: true,
        dueAt: true,
        leadId: true,
        clientId: true,
        lead: { select: { name: true } },
        client: { select: { fullName: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),

    prisma.task.count({
      where: overdueTaskWhere(now),
    }),

    // Bron expiring within 24h.
    prisma.deal.findMany({
      where: expiringReservationWhere(now),
      select: {
        id: true,
        dealNumber: true,
        reservationExpiresAt: true,
        assignedTo: { select: { name: true } },
        client: { select: { fullName: true } },
      },
      orderBy: { reservationExpiresAt: "asc" },
      take: 20,
    }),

    prisma.deal.count({
      where: expiringReservationWhere(now),
    }),

    // Overdue payment count (finance-safe: no amounts).
    prisma.payment.count({
      where: overduePaymentWhere(now),
    }),

    // Overdue payments list — NO amounts, NO client name.
    prisma.payment.findMany({
      where: overduePaymentWhere(now),
      select: {
        id: true,
        dealId: true,
        label: true,
        dueDate: true,
        sequence: true,
        deal: { select: { dealNumber: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),

    // Weak sources: sources with unanswered active leads.
    prisma.lead.groupBy({
      by: ["source"],
      where: unansweredLeadWhere(),
      _count: { _all: true },
    }),

    prisma.telegramNotificationLog.findMany({
      where: { status: { in: ["pending", "failed", "sent"] } },
      select: {
        id: true,
        leadId: true,
        status: true,
        messageText: true,
        errorMessage: true,
        createdAt: true,
        sentAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Per-agent: new leads today.
    agentIds.length > 0
      ? prisma.lead.groupBy({
          by: ["assignedToId"],
          where: { assignedToId: { in: agentIds }, createdAt: { gte: todayStart, lt: tomorrowStart } },
          _count: { _all: true },
        })
      : Promise.resolve([]),

    // Per-agent: leads contacted in the last 7 days.
    agentIds.length > 0
      ? prisma.lead.groupBy({
          by: ["assignedToId"],
          where: { assignedToId: { in: agentIds }, lastContactedAt: { gte: cutoff7d } },
          _count: { _all: true },
        })
      : Promise.resolve([]),

    // Per-agent: open overdue tasks.
    agentIds.length > 0
      ? prisma.task.groupBy({
          by: ["assignedToId"],
          where: overdueTaskWhere(now, { assignedToId: { in: agentIds } }),
          _count: { _all: true },
        })
      : Promise.resolve([]),

    // Per-agent: active deals (reserved / in progress).
    agentIds.length > 0
      ? prisma.deal.groupBy({
          by: ["assignedToId"],
          where: {
            assignedToId: { in: agentIds },
            ...activeDealWhere(),
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),

    // Per-agent: most recent lastContactedAt across their active leads.
    agentIds.length > 0
      ? prisma.lead.groupBy({
          by: ["assignedToId"],
          where: { assignedToId: { in: agentIds }, ...ACTIVE_LEAD_STATUS_WHERE },
          _max: { lastContactedAt: true },
        })
      : Promise.resolve([]),
  ]);

  type CountGroup = { assignedToId?: string | null; _count: { _all: number } };
  type ContactGroup = { assignedToId: string | null; _max: { lastContactedAt: Date | null } };

  function countFor(groups: CountGroup[], agentId: string) {
    return groups.find((g) => g.assignedToId === agentId)?._count._all ?? 0;
  }

  // Inactive managers: agents with active leads but no contact in 48h.
  const contactGroups = latestContactPerAgent as ContactGroup[];
  const inactiveManagers = agentUsers
    .filter((agent) => agent._count.assignedLeads > 0)
    .filter((agent) => {
      const row = contactGroups.find((r) => r.assignedToId === agent.id);
      const lastContact = row?._max?.lastContactedAt ?? null;
      return !lastContact || lastContact < cutoff48h;
    })
    .map((agent) => {
      const row = contactGroups.find((r) => r.assignedToId === agent.id);
      return {
        id: agent.id,
        name: agent.name || agent.email || agent.id,
        role: agent.role,
        activeLeads: agent._count.assignedLeads,
        lastActivityDate: row?._max?.lastContactedAt ?? null,
      };
    });

  // Manager comparison snapshot — sorted by active deals desc, then total leads desc.
  const managerSnapshots = agentUsers
    .map((agent) => ({
      id: agent.id,
      name: agent.name || agent.email || agent.id,
      role: agent.role,
      totalLeads: agent._count.assignedLeads,
      newToday: countFor(newTodayCounts as CountGroup[], agent.id),
      contactedThisWeek: countFor(contactedWeekCounts as CountGroup[], agent.id),
      overdueTasksCount: countFor(overdueTaskCounts as CountGroup[], agent.id),
      activeDealsCount: countFor(activeDealCounts as CountGroup[], agent.id),
    }))
    .sort((a, b) => b.activeDealsCount - a.activeDealsCount || b.totalLeads - a.totalLeads);

  return {
    unansweredLeads: unansweredLeads.map((l) => ({
      id: l.id,
      name: l.client?.fullName || l.name,
      phone: l.client?.phone || l.phone,
      source: l.source,
      createdAt: l.createdAt,
      assignedToName: l.assignedToUser?.name ?? null,
    })),
    overdueFollowups: overdueFollowups.map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt,
      leadId: t.leadId,
      leadName: t.lead?.name ?? null,
      clientId: t.clientId,
      clientName: t.client?.fullName ?? null,
      assignedToName: t.assignedTo?.name ?? null,
    })),
    expiringReservations: expiringReservations.map((d) => ({
      id: d.id,
      dealNumber: d.dealNumber,
      clientName: d.client?.fullName ?? null,
      reservationExpiresAt: d.reservationExpiresAt,
      assignedToName: d.assignedTo?.name ?? null,
    })),
    overduePaymentCount,
    overduePayments: overduePayments.map((p) => ({
      id: p.id,
      dealId: p.dealId,
      dealNumber: p.deal.dealNumber,
      label: p.label,
      dueDate: p.dueDate,
      sequence: p.sequence,
    })),
    weakSources: (weakSources as Array<{ source: string | null; _count: { _all: number } }>)
      .map((row) => ({
        source: row.source || "unknown",
        unansweredCount: row._count._all,
      }))
      .sort((a, b) => b.unansweredCount - a.unansweredCount)
      .slice(0, 8),
    recentAlerts: recentAlerts.map((alert) => ({
      id: alert.id,
      leadId: alert.leadId,
      status: alert.status,
      messageText: alert.messageText,
      errorMessage: alert.errorMessage,
      createdAt: alert.createdAt,
      sentAt: alert.sentAt,
    })),
    inactiveManagers,
    managerSnapshots,
    counts: {
      unanswered: unansweredLeadCount,
      overdueFollowups: overdueFollowupCount,
      expiringReservations: expiringReservationCount,
      overduePayments: overduePaymentCount,
      inactiveManagers: inactiveManagers.length,
    },
  };
}
