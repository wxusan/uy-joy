import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { activityVisibilityWhere, clientVisibilityWhere, leadVisibilityWhere, taskVisibilityWhere } from "@/lib/crm-access";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;
  const t = await getTranslations("admin");

  const user = session.user as { id?: string; role?: string };
  const canManageLeads = roleHasPlatformPermission(user.role, "manageLeads");
  const leadWhere = leadVisibilityWhere(user, settings.allowAgentClaim);
  const clientWhere = clientVisibilityWhere(user, settings.allowAgentClaim);
  const taskWhere = taskVisibilityWhere(user, settings.allowAgentClaim);
  const activityWhere = activityVisibilityWhere(user, settings.allowAgentClaim);
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [leadCount, clientCount, openTasks, overdueTasks, recentLeads, recentActivities, byStatus] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.client.count({ where: clientWhere }),
    prisma.task.count({ where: { AND: [taskWhere, { status: "open" }] } }),
    prisma.task.count({ where: { AND: [taskWhere, { status: "open", dueAt: { lt: today } }] } }),
    prisma.lead.findMany({
      where: leadWhere,
      include: { client: { select: { fullName: true, phone: true } }, assignedToUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.activity.findMany({
      where: activityWhere,
      orderBy: { occurredAt: "desc" },
      include: { client: { select: { fullName: true } }, lead: { select: { name: true } } },
      take: 8,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { AND: [leadWhere, { createdAt: { gte: sevenDaysAgo } }] },
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{t("crm")}</h1>
          <p className="a-page-sub">{t("crmSubtitle")}</p>
        </div>
        {canManageLeads ? (
          <div className="flex gap-2">
            <Link href="/portal/management-x7k9/crm/pipeline" className="a-btn">{t("pipeline")}</Link>
            <Link href="/portal/management-x7k9/crm/tasks" className="a-btn">{t("tasksNav")}</Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          [t("leads"), leadCount],
          [t("clients"), clientCount],
          [t("openTasks"), openTasks],
          [t("overdue"), overdueTasks],
        ].map(([label, value]) => (
          <div key={label} className="a-card p-4">
            <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{label}</div>
            <div className="text-[26px] font-semibold" style={{ color: "var(--a-text)" }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="a-card overflow-x-auto">
          <div className="p-4 border-b" style={{ borderColor: "var(--a-border)" }}>
            <h2 className="text-[15px] font-semibold">{t("recentLeads")}</h2>
          </div>
          <table className="a-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("phone")}</th>
                <th>{t("status")}</th>
                <th>{t("assigned")}</th>
                <th style={{ textAlign: "right" }}>{t("created")}</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link className="hover:underline" href={`/portal/management-x7k9/crm/leads/${lead.id}`}>
                      {lead.client?.fullName || lead.name}
                    </Link>
                  </td>
                  <td>{lead.client?.phone || lead.phone}</td>
                  <td>{lead.status}</td>
                  <td>{lead.assignedToUser?.name || t("unassigned")}</td>
                  <td style={{ textAlign: "right" }}>{lead.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4">
          <div className="a-card p-4">
            <h2 className="text-[15px] font-semibold mb-3">{t("last7DaysByStage")}</h2>
            <div className="flex flex-col gap-2">
              {byStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between text-[13px]">
                  <span>{row.status}</span>
                  <span className="font-semibold">{row._count._all}</span>
                </div>
              ))}
              {byStatus.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("noRecentMovement")}</p> : null}
            </div>
          </div>

          <div className="a-card p-4">
            <h2 className="text-[15px] font-semibold mb-3">{t("activity")}</h2>
            <div className="flex flex-col gap-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="text-[13px]">
                  <div className="font-medium">{activity.title}</div>
                  <div style={{ color: "var(--a-text-tertiary)" }}>
                    {activity.client?.fullName || activity.lead?.name || t("crm")} · {activity.occurredAt.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
