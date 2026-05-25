import { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { leadVisibilityWhere, taskVisibilityWhere } from "./crm-access";
import { dealVisibilityWhere } from "./real-estate";
import { leadSourceLabel } from "./lead-sources";
import { getPlatformSettings } from "./platform-settings";
import { normalizePlatformRole, roleHasPlatformPermission } from "./platform-plans";
import { CSV_BOM, csvRow, previousPeriod } from "./report-utils";
import { ACTIVE_LEAD_STATUS_WHERE, overdueTaskWhere, tashkentDayBounds } from "./operational-counts";

export type ReportUser = { id?: string; role?: string };
export type ReportFilters = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  projectId?: string;
  buildingId?: string;
  agentId?: string;
  source?: string;
  status?: string;
  warnings: string[];
};

const DEFAULT_DAYS = 30;
const MAX_RANGE_DAYS = 370;
const ACTIVE_LEAD_CLOSED_STATUSES = ["sold", "lost", "closed"];
const OPEN_DEAL_STATUSES = ["draft", "reserved", "contract_preparation", "contract_signed", "payment_active"];
const MANAGER_ROLES = ["developer", "owner", "sales_director"];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | null | undefined, fallback: Date, endOfDay = false) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    else parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
}

export function parseReportFilters(input: URLSearchParams | Record<string, string | string[] | undefined>) {
  const get = (key: string) => (input instanceof URLSearchParams ? input.get(key) : firstValue(input[key]) ?? null);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - DEFAULT_DAYS);
  let from = parseDate(get("from"), defaultFrom);
  let to = parseDate(get("to"), now, true);
  const warnings: string[] = [];

  if (from > to) {
    const swappedFrom = to;
    to = from;
    from = swappedFrom;
  }

  const maxMs = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxMs) {
    from = new Date(to.getTime() - maxMs);
    warnings.push(`Date range was capped to ${MAX_RANGE_DAYS} days.`);
  }

  const previous = previousPeriod(from, to);
  return {
    from,
    to,
    previousFrom: previous.from,
    previousTo: previous.to,
    projectId: get("projectId") || undefined,
    buildingId: get("buildingId") || undefined,
    agentId: get("agentId") || undefined,
    source: get("source") || undefined,
    status: get("status") || undefined,
    warnings,
  } satisfies ReportFilters;
}

export function serializeFilters(filters: ReportFilters) {
  return {
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    projectId: filters.projectId ?? null,
    buildingId: filters.buildingId ?? null,
    agentId: filters.agentId ?? null,
    source: filters.source ?? null,
    status: filters.status ?? null,
    warnings: filters.warnings,
  };
}

export function reportQueryString(filters: ReportFilters) {
  const params = new URLSearchParams();
  params.set("from", filters.from.toISOString());
  params.set("to", filters.to.toISOString());
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.buildingId) params.set("buildingId", filters.buildingId);
  if (filters.agentId) params.set("agentId", filters.agentId);
  if (filters.source) params.set("source", filters.source);
  if (filters.status) params.set("status", filters.status);
  return params.toString();
}

export function formatMoney(value: number | null | undefined, currency = "USD") {
  const amount = Math.round(value || 0);
  return `${amount.toLocaleString("en-US")} ${currency}`;
}

function dateFilter(from: Date, to: Date): Prisma.DateTimeFilter {
  return { gte: from, lte: to };
}

function compactAnd<T>(items: T[]) {
  return items.filter(Boolean) as NonNullable<T>[];
}

async function unitIdsForBuilding(buildingId?: string) {
  if (!buildingId) return undefined;
  const units = await prisma.unit.findMany({ where: { floor: { buildingId } }, select: { id: true } });
  return units.map((unit) => unit.id);
}

async function leadWhere(
  filters: ReportFilters,
  user: ReportUser | null | undefined,
  period: { from: Date; to: Date } = filters
) {
  const settings = getPlatformSettings();
  const unitIds = await unitIdsForBuilding(filters.buildingId);
  return {
    AND: compactAnd<Prisma.LeadWhereInput>([
      leadVisibilityWhere(user, settings.allowAgentClaim),
      { createdAt: dateFilter(period.from, period.to) },
      filters.projectId ? { projectId: filters.projectId } : {},
      filters.agentId ? { assignedToId: filters.agentId } : {},
      filters.source ? { source: filters.source } : {},
      filters.status ? { status: filters.status } : {},
      unitIds ? { unitId: { in: unitIds } } : {},
    ]),
  } satisfies Prisma.LeadWhereInput;
}

async function dealWhere(
  filters: ReportFilters,
  user: ReportUser | null | undefined,
  period?: { from: Date; to: Date },
  dateField: "createdAt" | "reservedAt" | "soldAt" = "createdAt"
) {
  const unitIds = await unitIdsForBuilding(filters.buildingId);
  return {
    AND: compactAnd<Prisma.DealWhereInput>([
      dealVisibilityWhere(user),
      period ? { [dateField]: dateFilter(period.from, period.to) } : {},
      filters.projectId ? { projectId: filters.projectId } : {},
      filters.agentId ? { assignedToId: filters.agentId } : {},
      filters.source ? { source: filters.source } : {},
      filters.status ? { status: filters.status } : {},
      unitIds ? { OR: [{ primaryUnitId: { in: unitIds } }, { dealUnits: { some: { unitId: { in: unitIds } } } }] } : {},
    ]),
  } satisfies Prisma.DealWhereInput;
}

async function paymentWhere(filters: ReportFilters, user: ReportUser | null | undefined, period?: { from: Date; to: Date }) {
  const deals = await dealWhere(filters, user);
  return {
    AND: compactAnd<Prisma.PaymentWhereInput>([
      { deal: { is: deals } },
      period ? { dueDate: dateFilter(period.from, period.to) } : {},
    ]),
  } satisfies Prisma.PaymentWhereInput;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function comparison(current: number, previous: number) {
  return {
    current,
    previous,
    delta: current - previous,
    deltaPercent: previous > 0 ? percent(current - previous, previous) : current > 0 ? 100 : 0,
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function sumBy<T>(rows: T[], value: (row: T) => number | null | undefined) {
  return rows.reduce((total, row) => total + (value(row) || 0), 0);
}

export async function getReportFilterOptions() {
  const [projects, buildings, agents, sources] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.building.findMany({
      select: { id: true, name: true, projectId: true },
      orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: { in: ["sales_agent", "external_agent", "sales_director"] }, isActive: true },
      select: { id: true, name: true, email: true, role: true, salesAgentProfile: { select: { displayName: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.leadSource.findMany({
      where: { isActive: true },
      select: { key: true, labelJson: true },
      orderBy: { key: "asc" },
    }),
  ]);

  return {
    projects,
    buildings,
    agents: agents.map((agent) => ({
      id: agent.id,
      label: agent.salesAgentProfile?.displayName || agent.name || agent.email,
      role: agent.role,
    })),
    sources: sources.map((source) => ({
      key: source.key,
      label: leadSourceLabel(source.key, "en"),
    })),
  };
}

export async function getOverviewReport(filters: ReportFilters, user: ReportUser | null | undefined) {
  const currentLeadWhere = await leadWhere(filters, user);
  const previousLeadWhere = await leadWhere(filters, user, { from: filters.previousFrom, to: filters.previousTo });
  const currentDealWhere = await dealWhere(filters, user);
  const reservedWhere = await dealWhere(filters, user, filters, "reservedAt");
  const soldWhere = await dealWhere(filters, user, filters, "soldAt");
  const previousSoldWhere = await dealWhere(filters, user, { from: filters.previousFrom, to: filters.previousTo }, "soldAt");
  const paymentDueWhere = await paymentWhere(filters, user, filters);

  const { start: todayStart } = tashkentDayBounds(new Date());
  const currentLeadsForSeries = await prisma.lead.findMany({
    where: currentLeadWhere,
    select: { createdAt: true, status: true, source: true, assignedToId: true, unitPriceSnapshot: true },
  });

  const [
    totalLeads,
    previousLeads,
    newToday,
    activeLeads,
    overdueFollowups,
    reservations,
    soldDeals,
    previousSoldDeals,
    openDeals,
    expectedPayment,
    inventoryMix,
    users,
  ] = await Promise.all([
    prisma.lead.count({ where: currentLeadWhere }),
    prisma.lead.count({ where: previousLeadWhere }),
    prisma.lead.count({ where: { AND: [currentLeadWhere, { createdAt: { gte: todayStart } }] } }),
    prisma.lead.count({ where: { AND: [currentLeadWhere, ACTIVE_LEAD_STATUS_WHERE] } }),
    prisma.task.count({ where: overdueTaskWhere(new Date(), taskVisibilityWhere(user, getPlatformSettings().allowAgentClaim)) }),
    prisma.deal.count({ where: reservedWhere }),
    prisma.deal.count({ where: soldWhere }),
    prisma.deal.count({ where: previousSoldWhere }),
    prisma.deal.findMany({
      where: { AND: [currentDealWhere, { status: { in: OPEN_DEAL_STATUSES } }] },
      select: { salePrice: true, listPrice: true, status: true, assignedToId: true },
    }),
    prisma.payment.aggregate({ where: paymentDueWhere, _sum: { expectedAmount: true } }),
    prisma.unit.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  const leadByDay = new Map<string, number>();
  for (const lead of currentLeadsForSeries) leadByDay.set(dayKey(lead.createdAt), (leadByDay.get(dayKey(lead.createdAt)) || 0) + 1);
  const leadSeries = Array.from(leadByDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, leads]) => ({ date, leads }));

  const statusOrder = ["new", "contacted", "meeting", "reserved", "sold", "lost"];
  const funnel = statusOrder.map((status) => ({
    status,
    count: currentLeadsForSeries.filter((lead) => lead.status === status).length,
  }));

  const agentLookup = new Map(users.map((u) => [u.id, u.name || u.email]));
  const topAgents = Array.from(
    currentLeadsForSeries.reduce<Map<string, number>>((map, lead) => {
      if (!lead.assignedToId) return map;
      map.set(lead.assignedToId, (map.get(lead.assignedToId) || 0) + 1);
      return map;
    }, new Map())
  )
    .map(([agentId, leads]) => ({ agentId, agent: agentLookup.get(agentId) || "Inactive agent", leads }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);

  const topSources = Array.from(
    currentLeadsForSeries.reduce<Map<string, number>>((map, lead) => {
      const source = lead.source || "unknown";
      map.set(source, (map.get(source) || 0) + 1);
      return map;
    }, new Map())
  )
    .map(([source, leads]) => ({ source, label: leadSourceLabel(source, "en"), leads }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);

  const dealBackedPipeline = sumBy(openDeals, (deal) => deal.salePrice || deal.listPrice);
  const estimatedPipeline = sumBy(
    currentLeadsForSeries.filter((lead) => !ACTIVE_LEAD_CLOSED_STATUSES.includes(lead.status)),
    (lead) => lead.unitPriceSnapshot
  );

  return {
    summary: {
      totalLeads,
      newToday,
      activeLeads,
      overdueFollowups,
      reservations,
      soldDeals,
      pipelineValue: dealBackedPipeline,
      estimatedPipelineValue: estimatedPipeline,
      expectedPaymentValue: expectedPayment._sum.expectedAmount || 0,
    },
    comparison: {
      totalLeads: comparison(totalLeads, previousLeads),
      soldDeals: comparison(soldDeals, previousSoldDeals),
      pipelineValue: comparison(dealBackedPipeline, 0),
    },
    series: {
      leadsByDay: leadSeries,
      funnel,
      inventoryMix: inventoryMix.map((row) => ({ status: row.status, count: row._count._all })),
    },
    tables: { topAgents, topSources },
    filters: serializeFilters(filters),
    drilldowns: {
      totalLeads: `/portal/management-x7k9/crm/leads?from=${filters.from.toISOString()}&to=${filters.to.toISOString()}`,
      overdueFollowups: "/portal/management-x7k9/crm/tasks?view=overdue",
      soldDeals: `/portal/management-x7k9/crm/deals?status=sold&from=${filters.from.toISOString()}&to=${filters.to.toISOString()}`,
    },
  };
}

export async function getSalesReport(filters: ReportFilters, user: ReportUser | null | undefined) {
  const currentLeadWhere = await leadWhere(filters, user);
  const currentDealWhere = await dealWhere(filters, user);
  const taskWhere = taskVisibilityWhere(user, getPlatformSettings().allowAgentClaim);
  const [unassignedLeads, overdueTasks, statusCounts, stageAging, activities, reservations, soldDeals, lostDeals, responseLeads] =
    await Promise.all([
      prisma.lead.count({ where: { AND: [currentLeadWhere, { assignedToId: null }] } }),
      prisma.task.findMany({
        where: overdueTaskWhere(new Date(), taskWhere),
        select: { assignedToId: true, assignedTo: { select: { name: true, email: true } } },
      }),
      prisma.lead.groupBy({ by: ["status"], where: currentLeadWhere, _count: { _all: true } }),
      prisma.lead.findMany({
        where: { AND: [currentLeadWhere, { status: { notIn: ACTIVE_LEAD_CLOSED_STATUSES } }] },
        select: { status: true, stageEnteredAt: true },
      }),
      prisma.activity.findMany({
        where: { occurredAt: dateFilter(filters.from, filters.to) },
        select: { actorId: true, type: true, channel: true, metadata: true, actor: { select: { name: true, email: true } } },
      }),
      prisma.deal.count({ where: { AND: [currentDealWhere, { reservedAt: dateFilter(filters.from, filters.to) }] } }),
      prisma.deal.count({ where: { AND: [currentDealWhere, { soldAt: dateFilter(filters.from, filters.to) }] } }),
      prisma.deal.groupBy({ by: ["lostReason"], where: { AND: [currentDealWhere, { status: { in: ["lost", "cancelled"] } }] }, _count: { _all: true } }),
      prisma.lead.findMany({ where: currentLeadWhere, select: { createdAt: true, firstResponseAt: true, status: true } }),
    ]);

  const overdueByAgent = Array.from(
    overdueTasks.reduce<Map<string, { agent: string; count: number }>>((map, task) => {
      const key = task.assignedToId || "unassigned";
      const row = map.get(key) || { agent: task.assignedTo?.name || task.assignedTo?.email || "Unassigned", count: 0 };
      row.count += 1;
      map.set(key, row);
      return map;
    }, new Map())
  ).map(([agentId, row]) => ({ agentId, ...row }));

  const now = Date.now();
  const stageAgingRows = Array.from(
    stageAging.reduce<Map<string, { status: string; count: number; totalHours: number }>>((map, lead) => {
      const row = map.get(lead.status) || { status: lead.status, count: 0, totalHours: 0 };
      row.count += 1;
      row.totalHours += Math.max(0, now - lead.stageEnteredAt.getTime()) / 36e5;
      map.set(lead.status, row);
      return map;
    }, new Map())
  ).map(([, row]) => ({ ...row, avgHours: Math.round(row.totalHours / Math.max(1, row.count)) }));

  const firstResponseBreaches = responseLeads.filter((lead) => {
    if (lead.status === "new") return false;
    if (!lead.firstResponseAt) return true;
    return lead.firstResponseAt.getTime() - lead.createdAt.getTime() > 2 * 60 * 60 * 1000;
  }).length;

  const actionCount = activities.length;
  const callsLogged = activities.filter((activity) => activity.channel === "call").length;
  const meetingsScheduled = await prisma.task.count({
    where: { AND: [taskWhere, { type: "meeting", createdAt: dateFilter(filters.from, filters.to) }] },
  });
  const visitsCompleted = activities.filter((activity) => activity.type === "visit").length;

  return {
    summary: { unassignedLeads, actionCount, callsLogged, meetingsScheduled, visitsCompleted, reservations, soldDeals, firstResponseBreaches },
    series: {
      leadsByStatus: statusCounts.map((row) => ({ status: row.status, count: row._count._all })),
      stageAging: stageAgingRows,
      overdueByAgent,
      lostReasons: lostDeals.map((row) => ({ reason: row.lostReason || "Unknown", count: row._count._all })),
    },
    tables: { overdueByAgent },
    filters: serializeFilters(filters),
  };
}

export async function getAgentReport(filters: ReportFilters, user: ReportUser | null | undefined, personal = false) {
  const role = normalizePlatformRole(user?.role);
  const agentFilter = personal && user?.id ? user.id : filters.agentId;
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ["sales_agent", "external_agent", "sales_director"] },
      ...(agentFilter ? { id: agentFilter } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      salesAgentProfile: true,
    },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    agents.map(async (agent) => {
      const leadBase = await leadWhere({ ...filters, agentId: agent.id }, user);
      const dealBase = await dealWhere({ ...filters, agentId: agent.id }, user);
      const [assignedLeads, periodAssignedLeads, overdueTasks, actions, calls, meetings, reservations, soldDeals] = await Promise.all([
        prisma.lead.count({ where: { AND: [leadBase, ACTIVE_LEAD_STATUS_WHERE] } }),
        prisma.lead.count({ where: { AND: [leadBase, { createdAt: dateFilter(filters.from, filters.to) }] } }),
        prisma.task.count({ where: overdueTaskWhere(new Date(), { assignedToId: agent.id }) }),
        prisma.activity.count({ where: { actorId: agent.id, occurredAt: dateFilter(filters.from, filters.to) } }),
        prisma.activity.count({ where: { actorId: agent.id, channel: "call", occurredAt: dateFilter(filters.from, filters.to) } }),
        prisma.task.count({ where: { assignedToId: agent.id, type: "meeting", createdAt: dateFilter(filters.from, filters.to) } }),
        prisma.deal.count({ where: { AND: [dealBase, { reservedAt: dateFilter(filters.from, filters.to) }] } }),
        prisma.deal.aggregate({
          where: { AND: [dealBase, { soldAt: dateFilter(filters.from, filters.to) }] },
          _count: { _all: true },
          _sum: { salePrice: true },
        }),
      ]);

      const targetDeals = agent.salesAgentProfile?.monthlyTargetDeals || null;
      const targetRevenue = agent.salesAgentProfile?.monthlyTargetRevenue || null;
      return {
        agentId: agent.id,
        agent: agent.salesAgentProfile?.displayName || agent.name || agent.email,
        role: agent.role,
        assignedLeads,
        periodAssignedLeads,
        overdueTasks,
        actions,
        calls,
        meetings,
        reservations,
        soldDeals: soldDeals._count._all,
        soldRevenue: soldDeals._sum.salePrice || 0,
        conversionRate: percent(soldDeals._count._all, Math.max(periodAssignedLeads, 1)),
        targetDeals,
        targetRevenue,
        targetDealProgress: targetDeals ? percent(soldDeals._count._all, targetDeals) : null,
        targetRevenueProgress: targetRevenue ? percent(soldDeals._sum.salePrice || 0, targetRevenue) : null,
      };
    })
  );

  return {
    summary: {
      agents: rows.length,
      assignedLeads: sumBy(rows, (row) => row.assignedLeads),
      overdueTasks: sumBy(rows, (row) => row.overdueTasks),
      soldDeals: sumBy(rows, (row) => row.soldDeals),
      soldRevenue: sumBy(rows, (row) => row.soldRevenue),
      role,
    },
    tables: { agents: rows },
    series: { soldByAgent: rows.map((row) => ({ agent: row.agent, soldDeals: row.soldDeals, revenue: row.soldRevenue })) },
    filters: serializeFilters(filters),
  };
}

export async function getInventoryReport(filters: ReportFilters, user: ReportUser | null | undefined) {
  const unitFilter: Prisma.UnitWhereInput = {
    AND: compactAnd<Prisma.UnitWhereInput>([
      filters.projectId ? { floor: { building: { projectId: filters.projectId } } } : {},
      filters.buildingId ? { floor: { buildingId: filters.buildingId } } : {},
      filters.status ? { status: filters.status } : {},
    ]),
  };
  const leadBase = await leadWhere(filters, user);
  const [statusCounts, roomCounts, units, leadInterests, soldByBuilding] = await Promise.all([
    prisma.unit.groupBy({ by: ["status"], where: unitFilter, _count: { _all: true }, _sum: { totalPrice: true } }),
    prisma.unit.groupBy({ by: ["rooms"], where: unitFilter, _count: { _all: true } }),
    prisma.unit.findMany({
      where: unitFilter,
      select: {
        id: true,
        unitNumber: true,
        status: true,
        rooms: true,
        area: true,
        totalPrice: true,
        createdAt: true,
        statusChangedAt: true,
        floor: { select: { number: true, building: { select: { id: true, name: true } } } },
      },
    }),
    prisma.lead.findMany({ where: { AND: [leadBase, { unitId: { not: null } }] }, select: { unitId: true } }),
    prisma.unit.findMany({
      where: { AND: [unitFilter, { status: "sold" }] },
      select: { totalPrice: true, floor: { select: { building: { select: { name: true } } } } },
    }),
  ]);

  const interestByUnit = leadInterests.reduce<Map<string, number>>((map, lead) => {
    if (!lead.unitId) return map;
    map.set(lead.unitId, (map.get(lead.unitId) || 0) + 1);
    return map;
  }, new Map());

  const topRequestedUnits = units
    .map((unit) => ({
      unitId: unit.id,
      unit: unit.unitNumber,
      building: unit.floor.building.name,
      floor: unit.floor.number,
      status: unit.status,
      leadInterest: interestByUnit.get(unit.id) || 0,
    }))
    .sort((a, b) => b.leadInterest - a.leadInterest)
    .slice(0, 10);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const slowUnits = units
    .filter((unit) => unit.status === "available" && (interestByUnit.get(unit.id) || 0) === 0)
    .map((unit) => {
      const since = unit.statusChangedAt || unit.createdAt;
      return {
        unitId: unit.id,
        unit: unit.unitNumber,
        building: unit.floor.building.name,
        floor: unit.floor.number,
        rooms: unit.rooms,
        price: unit.totalPrice || 0,
        daysOpen: Math.max(0, Math.round((Date.now() - since.getTime()) / 86400000)),
      };
    })
    .filter((unit) => unit.daysOpen >= 30 || thirtyDaysAgo > 0)
    .sort((a, b) => b.daysOpen - a.daysOpen)
    .slice(0, 10);

  const soldValueByBuilding = Array.from(
    soldByBuilding.reduce<Map<string, number>>((map, unit) => {
      const building = unit.floor.building.name;
      map.set(building, (map.get(building) || 0) + (unit.totalPrice || 0));
      return map;
    }, new Map())
  ).map(([building, value]) => ({ building, value }));

  const buildingMatrix = Array.from(
    units.reduce<Map<string, { building: string; available: number; reserved: number; sold: number; other: number }>>((map, unit) => {
      const building = unit.floor.building.name;
      const row = map.get(building) || { building, available: 0, reserved: 0, sold: 0, other: 0 };
      if (unit.status === "available") row.available += 1;
      else if (unit.status === "reserved") row.reserved += 1;
      else if (unit.status === "sold") row.sold += 1;
      else row.other += 1;
      map.set(building, row);
      return map;
    }, new Map())
  ).map(([, row]) => row);

  return {
    summary: {
      totalUnits: units.length,
      available: units.filter((unit) => unit.status === "available").length,
      reserved: units.filter((unit) => unit.status === "reserved").length,
      sold: units.filter((unit) => unit.status === "sold").length,
      inventoryValue: sumBy(units, (unit) => unit.totalPrice),
    },
    series: {
      statusMix: statusCounts.map((row) => ({ status: row.status, count: row._count._all, value: row._sum.totalPrice || 0 })),
      rooms: roomCounts.map((row) => ({ rooms: row.rooms, count: row._count._all })),
      buildingMatrix,
      soldValueByBuilding,
    },
    tables: { topRequestedUnits, slowUnits },
    filters: serializeFilters(filters),
  };
}

export async function getMarketingReport(filters: ReportFilters) {
  const unitIds = await unitIdsForBuilding(filters.buildingId);
  const leadBase = {
    AND: compactAnd<Prisma.LeadWhereInput>([
      { createdAt: dateFilter(filters.from, filters.to) },
      filters.projectId ? { projectId: filters.projectId } : {},
      filters.source ? { source: filters.source } : {},
      filters.status ? { status: filters.status } : {},
      unitIds ? { unitId: { in: unitIds } } : {},
    ]),
  } satisfies Prisma.LeadWhereInput;
  const analyticsWhere: Prisma.AnalyticsEventWhereInput = {
    occurredAt: dateFilter(filters.from, filters.to),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.source ? { source: filters.source } : {}),
  };
  const [leads, adSpend, formEvents] = await Promise.all([
    prisma.lead.findMany({
      where: leadBase,
      select: { source: true, status: true, campaign: true, utmSource: true, utmMedium: true, utmCampaign: true, utmContent: true, createdAt: true },
    }),
    prisma.adSpend.findMany({
      where: {
        periodStart: { lte: filters.to },
        periodEnd: { gte: filters.from },
        ...(filters.source ? { source: filters.source } : {}),
      },
      select: { source: true, campaign: true, amount: true, currency: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { AND: [analyticsWhere, { eventName: { in: ["public_page_view", "lead_form_view", "lead_form_start", "lead_form_submit", "lead_form_success"] } }] },
      select: { eventName: true, source: true, campaign: true, utmCampaign: true, leadId: true },
    }),
  ]);

  const sourceMap = new Map<string, { source: string; label: string; leads: number; meetings: number; reservations: number; sold: number; spend: number }>();
  for (const lead of leads) {
    const source = lead.source || "unknown";
    const row = sourceMap.get(source) || { source, label: leadSourceLabel(source, "en"), leads: 0, meetings: 0, reservations: 0, sold: 0, spend: 0 };
    row.leads += 1;
    if (["meeting", "negotiation", "reserved", "sold"].includes(lead.status)) row.meetings += 1;
    if (["reserved", "sold"].includes(lead.status)) row.reservations += 1;
    if (lead.status === "sold") row.sold += 1;
    sourceMap.set(source, row);
  }
  for (const spend of adSpend) {
    const source = spend.source || "unknown";
    const row = sourceMap.get(source) || { source, label: leadSourceLabel(source, "en"), leads: 0, meetings: 0, reservations: 0, sold: 0, spend: 0 };
    row.spend += spend.amount;
    sourceMap.set(source, row);
  }

  const sourceRows = Array.from(sourceMap.values()).map((row) => ({
    ...row,
    meetingRate: percent(row.meetings, row.leads),
    reservationRate: percent(row.reservations, row.leads),
    soldRate: percent(row.sold, row.leads),
    costPerLead: row.spend > 0 && row.leads > 0 ? row.spend / row.leads : null,
    costPerSale: row.spend > 0 && row.sold > 0 ? row.spend / row.sold : null,
  }));

  const campaignRows = Array.from(
    leads.reduce<Map<string, { campaign: string; leads: number; sold: number }>>((map, lead) => {
      const campaign = lead.campaign || lead.utmCampaign || "Unknown";
      const row = map.get(campaign) || { campaign, leads: 0, sold: 0 };
      row.leads += 1;
      if (lead.status === "sold") row.sold += 1;
      map.set(campaign, row);
      return map;
    }, new Map())
  ).map(([, row]) => ({ ...row, conversionRate: percent(row.sold, row.leads) }));

  const utmRows = Array.from(
    leads.reduce<Map<string, { utm: string; leads: number; sold: number }>>((map, lead) => {
      const utm = [lead.utmSource || "unknown", lead.utmMedium || "-", lead.utmCampaign || "-"].join(" / ");
      const row = map.get(utm) || { utm, leads: 0, sold: 0 };
      row.leads += 1;
      if (lead.status === "sold") row.sold += 1;
      map.set(utm, row);
      return map;
    }, new Map())
  ).map(([, row]) => row);

  const eventCounts = formEvents.reduce<Record<string, number>>((counts, event) => {
    const key = event.eventName === "lead_form_success" && !event.leadId ? "client_side_success" : event.eventName;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  return {
    summary: {
      leads: leads.length,
      sources: sourceRows.length,
      adSpend: sumBy(adSpend, (row) => row.amount),
      publicPageViews: eventCounts.public_page_view || 0,
      formViews: eventCounts.lead_form_view || 0,
      formStarts: eventCounts.lead_form_start || 0,
      formSubmits: eventCounts.lead_form_submit || 0,
      formSuccesses: formEvents.filter((event) => event.eventName === "lead_form_success" && event.leadId).length,
      costMetricsEnabled: adSpend.length > 0,
    },
    series: { sourcePerformance: sourceRows, formFunnel: [
      { stage: "Views", count: eventCounts.lead_form_view || 0 },
      { stage: "Starts", count: eventCounts.lead_form_start || 0 },
      { stage: "Submits", count: eventCounts.lead_form_submit || 0 },
      { stage: "Created leads", count: formEvents.filter((event) => event.eventName === "lead_form_success" && event.leadId).length },
    ] },
    tables: { sources: sourceRows, campaigns: campaignRows, utm: utmRows },
    filters: serializeFilters(filters),
  };
}

export async function getFinanceReport(filters: ReportFilters, user: ReportUser | null | undefined) {
  const paymentBase = await paymentWhere(filters, user);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const dealBase = await dealWhere(filters, user);
  const [soldValue, expectedThisMonth, paidThisMonth, unpaid, overdue, payments, planStatus] = await Promise.all([
    prisma.deal.aggregate({ where: { AND: [dealBase, { status: "sold" }] }, _sum: { salePrice: true } }),
    prisma.payment.aggregate({ where: { AND: [paymentBase, { dueDate: dateFilter(monthStart, monthEnd) }] }, _sum: { expectedAmount: true } }),
    prisma.payment.aggregate({ where: { AND: [paymentBase, { paidAt: dateFilter(monthStart, monthEnd) }] }, _sum: { paidAmount: true } }),
    prisma.payment.aggregate({ where: { AND: [paymentBase, { status: { in: ["scheduled", "partial"] } }] }, _sum: { expectedAmount: true, paidAmount: true } }),
    prisma.payment.findMany({
      where: { AND: [paymentBase, { status: { in: ["scheduled", "partial", "overdue"] }, dueDate: { lt: now } }] },
      select: {
        id: true,
        label: true,
        dueDate: true,
        expectedAmount: true,
        paidAmount: true,
        client: { select: { id: true, fullName: true, phone: true } },
        deal: { select: { id: true, dealNumber: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 25,
    }),
    prisma.payment.findMany({
      where: paymentBase,
      select: { dueDate: true, paidAt: true, expectedAmount: true, paidAmount: true },
    }),
    prisma.paymentPlan.groupBy({ by: ["status"], where: { deal: { is: dealBase } }, _count: { _all: true } }),
  ]);

  const cashflowMap = new Map<string, { month: string; expected: number; paid: number }>();
  for (const payment of payments) {
    const expectedKey = monthKey(payment.dueDate);
    const expectedRow = cashflowMap.get(expectedKey) || { month: expectedKey, expected: 0, paid: 0 };
    expectedRow.expected += payment.expectedAmount;
    cashflowMap.set(expectedKey, expectedRow);
    if (payment.paidAt) {
      const paidKey = monthKey(payment.paidAt);
      const paidRow = cashflowMap.get(paidKey) || { month: paidKey, expected: 0, paid: 0 };
      paidRow.paid += payment.paidAmount;
      cashflowMap.set(paidKey, paidRow);
    }
  }

  const overdueAmount = sumBy(overdue, (payment) => Math.max(0, payment.expectedAmount - payment.paidAmount));
  const overdueClientMap = new Map<string, { clientId: string; client: string; phone: string; overdueAmount: number; payments: number }>();
  for (const payment of overdue) {
    const row =
      overdueClientMap.get(payment.client.id) ||
      { clientId: payment.client.id, client: payment.client.fullName, phone: payment.client.phone, overdueAmount: 0, payments: 0 };
    row.overdueAmount += Math.max(0, payment.expectedAmount - payment.paidAmount);
    row.payments += 1;
    overdueClientMap.set(payment.client.id, row);
  }

  return {
    summary: {
      totalSoldValue: soldValue._sum.salePrice || 0,
      expectedThisMonth: expectedThisMonth._sum.expectedAmount || 0,
      paidThisMonth: paidThisMonth._sum.paidAmount || 0,
      unpaidScheduled: Math.max(0, (unpaid._sum.expectedAmount || 0) - (unpaid._sum.paidAmount || 0)),
      overdueAmount,
      overdueClients: overdueClientMap.size,
    },
    series: {
      cashflow: Array.from(cashflowMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      paymentPlanStatus: planStatus.map((row) => ({ status: row.status, count: row._count._all })),
    },
    tables: {
      overduePayments: overdue.map((payment) => ({
        paymentId: payment.id,
        dealId: payment.deal.id,
        dealNumber: payment.deal.dealNumber,
        client: payment.client.fullName,
        phone: payment.client.phone,
        label: payment.label,
        dueDate: payment.dueDate.toISOString(),
        amount: Math.max(0, payment.expectedAmount - payment.paidAmount),
      })),
      overdueClients: Array.from(overdueClientMap.values()).sort((a, b) => b.overdueAmount - a.overdueAmount),
    },
    filters: serializeFilters(filters),
  };
}

export async function makeLeadsCsv(filters: ReportFilters, user: ReportUser | null | undefined) {
  const where = await leadWhere(filters, user);
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, status: true, source: true, campaign: true, projectName: true, unitNumberSnapshot: true, assignedToUser: { select: { name: true, email: true } }, createdAt: true },
  });
  return (
    CSV_BOM +
    [
      csvRow(["id", "createdAt", "name", "phone", "status", "source", "campaign", "project", "unit", "assignedTo"]),
      ...leads.map((lead) =>
        csvRow([
          lead.id,
          lead.createdAt.toISOString(),
          lead.name,
          lead.phone,
          lead.status,
          lead.source || "",
          lead.campaign || "",
          lead.projectName || "",
          lead.unitNumberSnapshot || "",
          lead.assignedToUser?.name || lead.assignedToUser?.email || "",
        ])
      ),
    ].join("\n")
  );
}

export async function makeDealsCsv(filters: ReportFilters, user: ReportUser | null | undefined) {
  const where = await dealWhere(filters, user);
  const deals = await prisma.deal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      dealNumber: true,
      status: true,
      source: true,
      salePrice: true,
      currency: true,
      createdAt: true,
      soldAt: true,
      client: { select: { fullName: true, phone: true } },
      assignedTo: { select: { name: true, email: true } },
      primaryUnit: { select: { unitNumber: true } },
    },
  });
  return (
    CSV_BOM +
    [
      csvRow(["dealNumber", "createdAt", "soldAt", "client", "phone", "unit", "status", "source", "salePrice", "currency", "assignedTo"]),
      ...deals.map((deal) =>
        csvRow([
          deal.dealNumber,
          deal.createdAt.toISOString(),
          deal.soldAt?.toISOString() || "",
          deal.client.fullName,
          deal.client.phone,
          deal.primaryUnit?.unitNumber || "",
          deal.status,
          deal.source || "",
          deal.salePrice,
          deal.currency,
          deal.assignedTo?.name || deal.assignedTo?.email || "",
        ])
      ),
    ].join("\n")
  );
}

export async function makePaymentsCsv(filters: ReportFilters, user: ReportUser | null | undefined) {
  const where = await paymentWhere(filters, user);
  const payments = await prisma.payment.findMany({
    where,
    orderBy: { dueDate: "asc" },
    select: {
      label: true,
      dueDate: true,
      expectedAmount: true,
      paidAmount: true,
      status: true,
      paidAt: true,
      client: { select: { fullName: true, phone: true } },
      deal: { select: { dealNumber: true } },
    },
  });
  return (
    CSV_BOM +
    [
      csvRow(["dealNumber", "client", "phone", "label", "dueDate", "expectedAmount", "paidAmount", "status", "paidAt"]),
      ...payments.map((payment) =>
        csvRow([
          payment.deal.dealNumber,
          payment.client.fullName,
          payment.client.phone,
          payment.label,
          payment.dueDate.toISOString(),
          payment.expectedAmount,
          payment.paidAmount,
          payment.status,
          payment.paidAt?.toISOString() || "",
        ])
      ),
    ].join("\n")
  );
}

export async function makeAgentPerformanceCsv(filters: ReportFilters, user: ReportUser | null | undefined) {
  const report = await getAgentReport(filters, user);
  return (
    CSV_BOM +
    [
      csvRow(["agent", "role", "assignedLeads", "overdueTasks", "actions", "calls", "meetings", "reservations", "soldDeals", "soldRevenue", "conversionRate"]),
      ...report.tables.agents.map((row) =>
        csvRow([row.agent, row.role, row.assignedLeads, row.overdueTasks, row.actions, row.calls, row.meetings, row.reservations, row.soldDeals, row.soldRevenue, row.conversionRate])
      ),
    ].join("\n")
  );
}

export function canViewMarketingReports(user: ReportUser | null | undefined) {
  return roleHasPlatformPermission(user?.role, "viewMarketingReports");
}

export function canViewFinanceReports(user: ReportUser | null | undefined) {
  return roleHasPlatformPermission(user?.role, "viewFinance");
}

export function canViewExecutiveReports(user: ReportUser | null | undefined) {
  return roleHasPlatformPermission(user?.role, "viewReports");
}

export function isSalesAgentOnly(user: ReportUser | null | undefined) {
  const role = normalizePlatformRole(user?.role);
  return role === "sales_agent" || role === "external_agent";
}

export function canViewAgentReports(user: ReportUser | null | undefined) {
  return MANAGER_ROLES.includes(normalizePlatformRole(user?.role) || "");
}
