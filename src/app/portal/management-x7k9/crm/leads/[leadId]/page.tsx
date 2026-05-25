import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canEditLead, canViewAllLeads, leadVisibilityWhere } from "@/lib/crm-access";
import { leadSourceLabelUi, leadStatusLabel, taskStatusLabel } from "@/lib/crm-labels";
import {
  canEditClientQualification,
  getClientQualification,
  getInterestedUnits,
  getUnitRecommendations,
  qualificationCompleteness,
  qualificationForRole,
} from "@/lib/client-qualification";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import ClientQualificationPanel from "@/components/crm/ClientQualificationPanel";
import LeadOwnerSelect from "@/components/crm/LeadOwnerSelect";
import LeadQuickActions from "./LeadQuickActions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

  const t = await getTranslations("admin");
  const locale = await getLocale();
  const user = session.user as { id?: string; role?: string };
  const { leadId } = await params;
  const lead = await prisma.lead.findFirst({
    where: { AND: [{ id: leadId }, leadVisibilityWhere(user, settings.allowAgentClaim)] },
    include: {
      client: true,
      assignedToUser: { select: { id: true, name: true, email: true } },
      activities: { orderBy: { occurredAt: "desc" }, include: { actor: { select: { name: true } } } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], include: { assignedTo: { select: { name: true } } } },
      stageHistory: { orderBy: { enteredAt: "desc" }, include: { changedBy: { select: { name: true } } } },
    },
  });
  if (!lead) notFound();
  const canAssignLeads = canViewAllLeads(user);
  const [qualification, interestedUnits, recommendations, managers] = lead.clientId
    ? await Promise.all([
        getClientQualification(lead.clientId),
        getInterestedUnits(lead.clientId),
        getUnitRecommendations(lead.clientId),
        canAssignLeads
          ? prisma.user.findMany({
              where: { isActive: true, role: { in: ["sales_director", "sales_agent", "external_agent"] } },
              select: { id: true, name: true, email: true },
              orderBy: [{ role: "asc" }, { name: "asc" }],
            })
          : Promise.resolve([]),
      ])
    : await Promise.all([
        Promise.resolve(null),
        Promise.resolve([]),
        Promise.resolve([]),
        canAssignLeads
          ? prisma.user.findMany({
              where: { isActive: true, role: { in: ["sales_director", "sales_agent", "external_agent"] } },
              select: { id: true, name: true, email: true },
              orderBy: [{ role: "asc" }, { name: "asc" }],
            })
          : Promise.resolve([]),
      ]);
  const visibleQualification = qualificationForRole(qualification, user);
  const canEditQualification = Boolean(lead.client && canEditClientQualification(user, { ...lead.client, leads: [{ assignedToId: lead.assignedToId }] }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{lead.client?.fullName || lead.name}</h1>
          <p className="a-page-sub">{lead.phone} · {leadStatusLabel(t, lead.status, t("stageCreated"))} · {lead.assignedToUser?.name || t("unassigned")}</p>
        </div>
        <div className="flex gap-2">
          {lead.clientId ? <Link href={`/portal/management-x7k9/crm/clients/${lead.clientId}`} className="a-btn">{t("clientLink")}</Link> : null}
          <Link href="/portal/management-x7k9/crm/pipeline" className="a-btn">{t("pipelineLink")}</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("leadSectionTitle")}</h2>
          <dl className="grid gap-2 text-[13px]">
            <div className="flex justify-between gap-4"><dt>{t("fieldProject")}</dt><dd>{lead.projectName || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>{t("fieldUnit")}</dt><dd>{lead.unitNumberSnapshot || lead.unitNumber || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>{t("fieldSource")}</dt><dd>{leadSourceLabelUi(lead.source, locale)}</dd></div>
            <div className="flex justify-between gap-4"><dt>{t("fieldCampaign")}</dt><dd>{lead.campaign || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>{t("fieldNextAction")}</dt><dd>{lead.nextActionAt?.toLocaleString() || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>{t("fieldEditable")}</dt><dd>{canEditLead(user, lead) ? t("yes") : t("no")}</dd></div>
            <div className="flex justify-between gap-4 items-center">
              <dt>{t("assigned")}</dt>
              <dd>
                <LeadOwnerSelect
                  leadId={lead.id}
                  assignedToId={lead.assignedToId}
                  managers={managers}
                  canAssign={canAssignLeads}
                  compact
                />
              </dd>
            </div>
          </dl>
          {lead.notes ? <p className="mt-4 text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{lead.notes}</p> : null}
        </div>

        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("stageHistoryTitle")}</h2>
          <div className="flex flex-col gap-3">
            {lead.stageHistory.map((history) => (
              <div key={history.id} className="text-[13px]">
                <div className="font-medium">{leadStatusLabel(t, history.fromStatus, t("stageCreated"))} → {leadStatusLabel(t, history.toStatus, t("stageCreated"))}</div>
                <div style={{ color: "var(--a-text-tertiary)" }}>
                  {history.changedBy?.name || t("systemActor")} · {history.enteredAt.toLocaleString()}
                  {history.durationSeconds ? ` · ${Math.round(history.durationSeconds / 3600)}h` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LeadQuickActions
        leadId={lead.id}
        clientId={lead.clientId}
        assignedToId={lead.assignedToId}
        currentUserId={user.id}
        projectId={lead.projectId}
        unitId={lead.unitId}
        source={lead.source}
        phone={lead.client?.phone || lead.phone}
      />

      {lead.clientId ? (
        <ClientQualificationPanel
          clientId={lead.clientId}
          leadId={lead.id}
          initialQualification={JSON.parse(JSON.stringify(visibleQualification))}
          initialCompleteness={qualificationCompleteness(visibleQualification)}
          initialInterestedUnits={JSON.parse(JSON.stringify(interestedUnits))}
          initialRecommendations={JSON.parse(JSON.stringify(recommendations))}
          canEdit={canEditQualification}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("tasksTitle")}</h2>
          <div className="flex flex-col gap-3">
            {lead.tasks.map((task) => (
              <div key={task.id} className="text-[13px]">
                <div className="font-medium">{task.title}</div>
                <div style={{ color: "var(--a-text-tertiary)" }}>{taskStatusLabel(t, task.status)} · {task.assignedTo.name} · {task.dueAt?.toLocaleString() || t("noDueDate")}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("activityTitle")}</h2>
          <div className="flex flex-col gap-3">
            {lead.activities.map((activity) => (
              <div key={activity.id} className="text-[13px]">
                <div className="font-medium">{activity.title}</div>
                <div style={{ color: "var(--a-text-tertiary)" }}>{activity.actor?.name || t("systemActor")} · {activity.occurredAt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
