import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canViewAllLeads, leadVisibilityWhere, taskVisibilityWhere } from "@/lib/crm-access";
import { leadStatusLabel } from "@/lib/crm-labels";
import {
  ACTIVE_LEAD_STATUS_WHERE,
  activeReservationWhere,
  expiringReservationWhere,
  overdueTaskWhere,
  tashkentDayBounds,
  todayTaskWhere,
  todayVisitTaskWhere,
  unansweredLeadWhere,
} from "@/lib/operational-counts";
import { dealVisibilityWhere } from "@/lib/real-estate";
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
  const isTeamView = canViewAllLeads(user);
  const leadWhere = leadVisibilityWhere(user, settings.allowAgentClaim);
  const taskWhere = taskVisibilityWhere(user, settings.allowAgentClaim);
  const dealWhere = dealVisibilityWhere(user);
  const now = new Date();
  const { start: todayStart, end: tomorrowStart } = tashkentDayBounds(now);
  const newLeadHref = `/portal/management-x7k9/crm/leads?status=new&from=${todayStart.toISOString()}&to=${tomorrowStart.toISOString()}`;

  const [
    newLeadsToday,
    unansweredLeads,
    overdueFollowups,
    todayVisits,
    activeReservations,
    expiringReservations,
    urgentLeads,
    todaysFollowups,
    backupTasks,
  ] = await Promise.all([
    prisma.lead.count({ where: { AND: [leadWhere, { status: "new", createdAt: { gte: todayStart, lt: tomorrowStart } }] } }),
    prisma.lead.count({ where: unansweredLeadWhere(leadWhere) }),
    prisma.task.count({ where: overdueTaskWhere(now, taskWhere) }),
    prisma.task.count({ where: todayVisitTaskWhere(now, taskWhere) }),
    prisma.deal.count({ where: activeReservationWhere(dealWhere) }),
    prisma.deal.count({ where: expiringReservationWhere(now, dealWhere) }),
    prisma.lead.findMany({
      where: {
        AND: [
          leadWhere,
          ACTIVE_LEAD_STATUS_WHERE,
          { OR: [{ firstResponseAt: null }, { nextActionAt: { lt: now } }] },
        ],
      },
      include: { client: { select: { fullName: true, phone: true } }, assignedToUser: { select: { name: true } } },
      orderBy: [{ nextActionAt: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.task.findMany({
      where: todayTaskWhere(now, taskWhere),
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: {
        client: { select: { id: true, fullName: true } },
        lead: { select: { id: true, name: true, status: true } },
        assignedTo: { select: { name: true, email: true } },
      },
      take: 8,
    }),
    user.id
      ? prisma.task.count({
          where: {
            AND: [
              taskWhere,
              { status: "open", assignedToId: user.id },
              { lead: { is: { assignedToId: { not: null } } } },
              { NOT: { lead: { is: { assignedToId: user.id } } } },
            ],
          },
        })
      : Promise.resolve(0),
  ]);

  const queueCards: Array<{ label: string; value: number; href: string; accent: string }> = [
    { label: t("dashboardNewLeadsToday"), value: newLeadsToday, href: newLeadHref, accent: "var(--a-accent)" },
    { label: t("dashboardUnansweredLeads"), value: unansweredLeads, href: "/portal/management-x7k9/crm/leads?unanswered=true", accent: "var(--a-danger)" },
    { label: t("dashboardOverdueFollowups"), value: overdueFollowups, href: "/portal/management-x7k9/crm/tasks?view=overdue", accent: "var(--a-danger)" },
    { label: t("dashboardTodayVisits"), value: todayVisits, href: "/portal/management-x7k9/crm/tasks?view=today&type=office_visit", accent: "var(--a-warning)" },
    ...(isTeamView
      ? []
      : [{ label: t("backupTasks"), value: backupTasks, href: "/portal/management-x7k9/crm/tasks?view=backup", accent: "var(--a-warning)" }]),
    { label: t("dashboardActiveReservations"), value: activeReservations, href: "/portal/management-x7k9/crm/deals?status=reserved", accent: "var(--a-success)" },
    { label: t("dashboardExpiringReservations"), value: expiringReservations, href: "/portal/management-x7k9/crm/deals?status=reserved&expiring=true", accent: "var(--a-warning)" },
  ];

  const leadReason = (lead: { firstResponseAt: Date | null; nextActionAt: Date | null }) => {
    if (!lead.firstResponseAt) return t("dashboardLeadUnanswered");
    if (lead.nextActionAt && lead.nextActionAt < now) return t("dashboardLeadOverdue");
    return lead.nextActionAt ? `${t("dashboardDue")}: ${lead.nextActionAt.toLocaleString()}` : t("dashboardViewQueue");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{t("crmTodayTitle")}</h1>
          <p className="a-page-sub">{isTeamView ? t("crmTodaySubtitleDirector") : t("crmTodaySubtitleManager")}</p>
        </div>
        {canManageLeads ? (
          <div className="flex gap-2">
            <Link href="/portal/management-x7k9/crm/pipeline" className="a-btn">{t("pipeline")}</Link>
            <Link href="/portal/management-x7k9/crm/tasks" className="a-btn">{t("tasksNav")}</Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {queueCards.map((card) => (
          <Link key={card.label} href={card.href} className="a-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
              <span className="a-dot" style={{ color: card.accent }} />
              <span>{card.label}</span>
            </div>
            <div className="mt-2 text-[28px] font-semibold" style={{ color: "var(--a-text)" }}>{card.value}</div>
            <div className="mt-2 text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{t("dashboardViewQueue")}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="a-card overflow-x-auto">
          <div className="p-4 border-b" style={{ borderColor: "var(--a-border)" }}>
            <h2 className="text-[15px] font-semibold">{t("dashboardNeedsAction")}</h2>
          </div>
          <table className="a-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("phone")}</th>
                <th>{t("fieldNextAction")}</th>
                <th>{t("assigned")}</th>
                <th style={{ textAlign: "right" }}>{t("created")}</th>
              </tr>
            </thead>
            <tbody>
              {urgentLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link className="hover:underline" href={`/portal/management-x7k9/crm/leads/${lead.id}`}>
                      {lead.client?.fullName || lead.name}
                    </Link>
                  </td>
                  <td>{lead.client?.phone || lead.phone}</td>
                  <td>{leadReason(lead)}</td>
                  <td>{lead.assignedToUser?.name || t("dashboardNoManager")}</td>
                  <td style={{ textAlign: "right" }}>{lead.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
              {urgentLeads.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10" style={{ color: "var(--a-text-tertiary)" }}>{t("dashboardNoUrgentLeads")}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4">
          <div className="a-card p-4">
            <h2 className="text-[15px] font-semibold mb-3">{t("dashboardTodaysFollowups")}</h2>
            <div className="flex flex-col gap-3">
              {todaysFollowups.map((task) => (
                <div key={task.id} className="text-[13px]">
                  <div className="font-medium">{task.title}</div>
                  <div style={{ color: "var(--a-text-tertiary)" }}>
                    {task.lead ? (
                      <Link className="hover:underline" href={`/portal/management-x7k9/crm/leads/${task.lead.id}`}>
                        {task.lead.name} · {leadStatusLabel(t, task.lead.status)}
                      </Link>
                    ) : task.client ? (
                      <Link className="hover:underline" href={`/portal/management-x7k9/crm/clients/${task.client.id}`}>{task.client.fullName}</Link>
                    ) : t("crm")}
                  </div>
                  <div style={{ color: "var(--a-text-tertiary)" }}>
                    {task.assignedTo.name || task.assignedTo.email || t("dashboardNoManager")} · {task.dueAt?.toLocaleTimeString() || t("noDueDate")}
                  </div>
                </div>
              ))}
              {todaysFollowups.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("dashboardNoFollowupsToday")}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
