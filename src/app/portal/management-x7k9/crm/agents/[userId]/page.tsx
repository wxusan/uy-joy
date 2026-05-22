import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

  const { userId } = await params;
  const [user, leadCounts, openTasks, recentActivity] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { salesAgentProfile: true } }),
    prisma.lead.groupBy({ by: ["status"], where: { assignedToId: userId }, _count: { _all: true } }),
    prisma.task.findMany({ where: { assignedToId: userId, status: "open" }, orderBy: { dueAt: "asc" }, take: 10 }),
    prisma.activity.findMany({ where: { OR: [{ actorId: userId }, { assignedToId: userId }] }, orderBy: { occurredAt: "desc" }, take: 10 }),
  ]);
  if (!user) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{user.salesAgentProfile?.displayName || user.name || user.email}</h1>
          <p className="a-page-sub">{user.role} · {user.email}</p>
        </div>
        <Link href="/portal/management-x7k9/users" className="a-btn">Users</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Pipeline</h2>
          <div className="flex flex-col gap-2 text-[13px]">
            {leadCounts.map((row) => (
              <div key={row.status} className="flex justify-between"><span>{row.status}</span><span>{row._count._all}</span></div>
            ))}
          </div>
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Open tasks</h2>
          <div className="flex flex-col gap-3 text-[13px]">
            {openTasks.map((task) => <div key={task.id}>{task.title}<div style={{ color: "var(--a-text-tertiary)" }}>{task.dueAt?.toLocaleString() || "No due date"}</div></div>)}
          </div>
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Recent activity</h2>
          <div className="flex flex-col gap-3 text-[13px]">
            {recentActivity.map((activity) => <div key={activity.id}>{activity.title}<div style={{ color: "var(--a-text-tertiary)" }}>{activity.occurredAt.toLocaleString()}</div></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
