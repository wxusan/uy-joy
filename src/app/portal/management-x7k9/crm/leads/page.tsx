import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canViewAllLeads, leadVisibilityWhere } from "@/lib/crm-access";
import { getCrmScopeEmptyMessage } from "@/lib/crm-scope-copy";
import { normalizeLeadStatus } from "@/lib/lead-status";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import LeadsClient from "../../leads/LeadsClient";

export const dynamic = "force-dynamic";

const LIMIT = 20;

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CrmLeadsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

  const user = session.user as { id?: string; role?: string };
  const statusParam = paramValue(searchParams?.status);
  const fromParam = paramValue(searchParams?.from);
  const toParam = paramValue(searchParams?.to);
  const unansweredParam = paramValue(searchParams?.unanswered);
  const createdAt = {
    ...(fromParam ? { gte: new Date(fromParam) } : {}),
    ...(toParam ? { lt: new Date(toParam) } : {}),
  };
  const where = {
    AND: [
      leadVisibilityWhere(user, settings.allowAgentClaim),
      statusParam ? { status: normalizeLeadStatus(statusParam) } : {},
      unansweredParam === "true" ? { firstResponseAt: null, status: { notIn: ["sold", "lost"] } } : {},
      Object.keys(createdAt).length ? { createdAt } : {},
    ],
  };
  const canAssignLeads = canViewAllLeads(user);
  const [leads, total, managers] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        client: { select: { id: true, fullName: true, phone: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
      take: LIMIT,
    }),
    prisma.lead.count({ where }),
    canAssignLeads
      ? prisma.user.findMany({
          where: { isActive: true, role: { in: ["sales_director", "sales_agent", "external_agent"] } },
          select: { id: true, name: true, email: true },
          orderBy: [{ role: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const serialized = leads.map((lead) => ({
    ...lead,
    nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.toISOString() : null,
    nextActionAt: lead.nextActionAt ? lead.nextActionAt.toISOString() : null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    lastActivityAt: lead.lastActivityAt ? lead.lastActivityAt.toISOString() : null,
    lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.toISOString() : null,
    closedAt: lead.closedAt ? lead.closedAt.toISOString() : null,
    convertedAt: lead.convertedAt ? lead.convertedAt.toISOString() : null,
    stageEnteredAt: lead.stageEnteredAt.toISOString(),
    firstResponseAt: lead.firstResponseAt ? lead.firstResponseAt.toISOString() : null,
  }));

  return (
    <LeadsClient
      initialLeads={serialized}
      initialTotal={total}
      initialPages={Math.ceil(total / LIMIT)}
      emptyMessage={getCrmScopeEmptyMessage(user.role)}
      initialStatusFilter={statusParam ? normalizeLeadStatus(statusParam) : "all"}
      managers={managers}
      canAssignLeads={canAssignLeads}
      extraApiFilters={{
        ...(unansweredParam === "true" ? { unanswered: "true" } : {}),
        ...(fromParam ? { from: fromParam } : {}),
        ...(toParam ? { to: toParam } : {}),
      }}
    />
  );
}
