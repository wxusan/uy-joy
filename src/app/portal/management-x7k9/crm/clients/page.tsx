import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { clientVisibilityWhere } from "@/lib/crm-access";
import { getCrmScopeEmptyMessage } from "@/lib/crm-scope-copy";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;
  const t = await getTranslations("admin");
  const user = session.user as { id?: string; role?: string };

  const clients = await prisma.client.findMany({
    where: clientVisibilityWhere(user, settings.allowAgentClaim),
    include: {
      assignedTo: { select: { id: true, name: true } },
      _count: { select: { leads: true, activities: true, tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const emptyMessage = getCrmScopeEmptyMessage(user.role);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("clientsTitle")}</h1>
        <p className="a-page-sub">{t("clientsSubtitle")}</p>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[860px]">
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("phone")}</th>
              <th>{t("status")}</th>
              <th>{t("assigned")}</th>
              <th>{t("leads")}</th>
              <th>{t("activity")}</th>
              <th style={{ textAlign: "right" }}>{t("updated")}</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10" style={{ color: "var(--a-text-tertiary)" }}>
                  {emptyMessage || t("noClientsYet")}
                </td>
              </tr>
            ) : clients.map((client) => (
              <tr key={client.id}>
                <td>
                  <Link className="font-medium hover:underline" href={`/portal/management-x7k9/crm/clients/${client.id}`}>
                    {client.fullName}
                  </Link>
                </td>
                <td>{client.phone}</td>
                <td>{client.status}</td>
                <td>{client.assignedTo?.name || t("unassigned")}</td>
                <td>{client._count.leads}</td>
                <td>{client._count.activities}</td>
                <td style={{ textAlign: "right" }}>{client.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
