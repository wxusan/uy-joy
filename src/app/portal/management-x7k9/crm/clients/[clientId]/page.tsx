import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { clientVisibilityWhere } from "@/lib/crm-access";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;
  const user = session.user as { id?: string; role?: string };

  const { clientId } = await params;
  const client = await prisma.client.findFirst({
    where: { AND: [{ id: clientId }, clientVisibilityWhere(user, settings.allowAgentClaim)] },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      leads: { orderBy: { createdAt: "desc" }, include: { assignedToUser: { select: { name: true } } } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], include: { assignedTo: { select: { name: true } } } },
      activities: { orderBy: { occurredAt: "desc" }, take: 50, include: { actor: { select: { name: true } } } },
    },
  });
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{client.fullName}</h1>
          <p className="a-page-sub">{client.phone} · {client.status}</p>
        </div>
        <Link href="/portal/management-x7k9/crm/clients" className="a-btn">Back to clients</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Profile</h2>
          <dl className="grid gap-2 text-[13px]">
            <div className="flex justify-between gap-4"><dt>Email</dt><dd>{client.email || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Telegram</dt><dd>{client.telegramUsername || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Instagram</dt><dd>{client.instagramUsername || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Assigned</dt><dd>{client.assignedTo?.name || "Unassigned"}</dd></div>
            <div className="flex justify-between gap-4"><dt>Source</dt><dd>{client.source || "—"}</dd></div>
          </dl>
          {client.notes ? <p className="mt-4 text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{client.notes}</p> : null}
        </div>

        <div className="a-card overflow-x-auto">
          <div className="p-4 border-b" style={{ borderColor: "var(--a-border)" }}>
            <h2 className="text-[15px] font-semibold">Leads</h2>
          </div>
          <table className="a-table min-w-[640px]">
            <thead>
              <tr><th>Lead</th><th>Status</th><th>Project</th><th>Assigned</th><th style={{ textAlign: "right" }}>Created</th></tr>
            </thead>
            <tbody>
              {client.leads.map((lead) => (
                <tr key={lead.id}>
                  <td><Link className="hover:underline" href={`/portal/management-x7k9/crm/leads/${lead.id}`}>{lead.name}</Link></td>
                  <td>{lead.status}</td>
                  <td>{lead.projectName || "—"}</td>
                  <td>{lead.assignedToUser?.name || "Unassigned"}</td>
                  <td style={{ textAlign: "right" }}>{lead.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Tasks</h2>
          <div className="flex flex-col gap-3">
            {client.tasks.map((task) => (
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
            {client.activities.map((activity) => (
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
