import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canEditLead, leadVisibilityWhere } from "@/lib/crm-access";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import LeadQuickActions from "./LeadQuickActions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{lead.client?.fullName || lead.name}</h1>
          <p className="a-page-sub">{lead.phone} · {lead.status} · {lead.assignedToUser?.name || "Unassigned"}</p>
        </div>
        <div className="flex gap-2">
          {lead.clientId ? <Link href={`/portal/management-x7k9/crm/clients/${lead.clientId}`} className="a-btn">Client</Link> : null}
          <Link href="/portal/management-x7k9/crm/pipeline" className="a-btn">Pipeline</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Lead</h2>
          <dl className="grid gap-2 text-[13px]">
            <div className="flex justify-between gap-4"><dt>Project</dt><dd>{lead.projectName || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Unit</dt><dd>{lead.unitNumberSnapshot || lead.unitNumber || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Source</dt><dd>{lead.source || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Campaign</dt><dd>{lead.campaign || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Next action</dt><dd>{lead.nextActionAt?.toLocaleString() || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Editable</dt><dd>{canEditLead(user, lead) ? "Yes" : "No"}</dd></div>
          </dl>
          {lead.notes ? <p className="mt-4 text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{lead.notes}</p> : null}
        </div>

        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Stage history</h2>
          <div className="flex flex-col gap-3">
            {lead.stageHistory.map((history) => (
              <div key={history.id} className="text-[13px]">
                <div className="font-medium">{history.fromStatus || "created"} → {history.toStatus}</div>
                <div style={{ color: "var(--a-text-tertiary)" }}>
                  {history.changedBy?.name || "System"} · {history.enteredAt.toLocaleString()}
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
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Tasks</h2>
          <div className="flex flex-col gap-3">
            {lead.tasks.map((task) => (
              <div key={task.id} className="text-[13px]">
                <div className="font-medium">{task.title}</div>
                <div style={{ color: "var(--a-text-tertiary)" }}>{task.status} · {task.assignedTo.name} · {task.dueAt?.toLocaleString() || "No due date"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Activity</h2>
          <div className="flex flex-col gap-3">
            {lead.activities.map((activity) => (
              <div key={activity.id} className="text-[13px]">
                <div className="font-medium">{activity.title}</div>
                <div style={{ color: "var(--a-text-tertiary)" }}>{activity.actor?.name || "System"} · {activity.occurredAt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
