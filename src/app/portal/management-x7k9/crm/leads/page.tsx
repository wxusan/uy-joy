import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { leadVisibilityWhere } from "@/lib/crm-access";
import { getCrmScopeEmptyMessage } from "@/lib/crm-scope-copy";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import LeadsClient from "../../leads/LeadsClient";

export const dynamic = "force-dynamic";

const LIMIT = 20;

export default async function CrmLeadsPage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

  const user = session.user as { id?: string; role?: string };
  const where = leadVisibilityWhere(user, settings.allowAgentClaim);
  const [leads, total] = await Promise.all([
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
    />
  );
}
