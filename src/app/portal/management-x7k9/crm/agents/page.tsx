import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function SalesAgentsPage() {
  await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;
  const t = await getTranslations("admin");

  const agents = await prisma.user.findMany({
    where: { role: { in: ["sales_agent", "external_agent", "sales_director"] } },
    include: {
      salesAgentProfile: true,
      _count: { select: { assignedLeads: true, tasksAssigned: true, activitiesAssigned: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("salesAgents")}</h1>
        <p className="a-page-sub">{t("agentsSubtitle")}</p>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[760px]">
          <thead>
            <tr><th>{t("agent")}</th><th>{t("role")}</th><th>{t("assignedLeads")}</th><th>{t("openTasksCol")}</th><th>{t("assignedActivity")}</th><th>{t("targetDeals")}</th></tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td>
                  <Link href={`/portal/management-x7k9/crm/agents/${agent.id}`} className="font-medium hover:underline">
                    {agent.salesAgentProfile?.displayName || agent.name || agent.email}
                  </Link>
                </td>
                <td>{agent.role}</td>
                <td>{agent._count.assignedLeads}</td>
                <td>{agent._count.tasksAssigned}</td>
                <td>{agent._count.activitiesAssigned}</td>
                <td>{agent.salesAgentProfile?.monthlyTargetDeals ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
