import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function SalesAgentsPage() {
  await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

  const agents = await prisma.user.findMany({
    where: { role: { in: ["sales_agent", "sales_director"] } },
    include: {
      salesAgentProfile: true,
      _count: { select: { assignedLeads: true, tasksAssigned: true, activitiesAssigned: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Sales agents</h1>
        <p className="a-page-sub">Team ownership, targets, and activity snapshots.</p>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[760px]">
          <thead>
            <tr><th>Agent</th><th>Role</th><th>Assigned leads</th><th>Open tasks</th><th>Assigned activity</th><th>Target deals</th></tr>
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
