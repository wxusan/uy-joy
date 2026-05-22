import Link from "next/link";
import { getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ArrowUpRight } from "lucide-react";
import { getLeadStatusTone } from "@/lib/lead-status";
import { leadVisibilityWhere } from "@/lib/crm-access";
import { roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await requireAdmin();
  const t = await getTranslations("admin");
  const role = (session.user as { role?: string } | undefined)?.role;
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  const inventoryEnabled = platformSettingsHasFeature(settings, "inventory");
  const publicPageEnabled = platformSettingsHasFeature(settings, "publicPage");
  const crmEnabled = platformSettingsHasFeature(settings, "crm");
  const canViewLeads = crmEnabled && roleHasPlatformPermission(role, "viewLeads");
  const leadWhere = leadVisibilityWhere(user, settings.allowAgentClaim);

  function formatRelative(dateIso: string) {
    const d = new Date(dateIso);
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return t("justNow");
    if (min < 60) return t("minutesAgo", { min });
    const h = Math.round(min / 60);
    if (h < 24) return t("hoursAgo", { h });
    const days = Math.round(h / 24);
    if (days < 7) return t("daysAgo", { days });
    return d.toLocaleDateString();
  }

  const [total, available, reserved, sold, leadsTotal, leadsNew, recentLeads] = await Promise.all([
    inventoryEnabled ? prisma.unit.count() : Promise.resolve(0),
    inventoryEnabled ? prisma.unit.count({ where: { status: "available" } }) : Promise.resolve(0),
    inventoryEnabled ? prisma.unit.count({ where: { status: "reserved" } }) : Promise.resolve(0),
    inventoryEnabled ? prisma.unit.count({ where: { status: "sold" } }) : Promise.resolve(0),
    canViewLeads ? prisma.lead.count({ where: leadWhere }) : Promise.resolve(0),
    canViewLeads ? prisma.lead.count({ where: { AND: [leadWhere, { status: "new" }] } }) : Promise.resolve(0),
    canViewLeads
      ? prisma.lead.findMany({
          where: leadWhere,
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const occupancyPct = total > 0 ? Math.round(((reserved + sold) / total) * 100) : 0;

  const stats: { label: string; value: string | number; sub?: string }[] = [
    { label: t("leads"), value: leadsTotal, sub: leadsNew > 0 ? t("newLeads", { count: leadsNew }) : undefined },
    ...(inventoryEnabled
      ? [
          { label: t("totalUnits"), value: total },
          {
            label: t("available"),
            value: available,
            sub: `${total > 0 ? Math.round((available / total) * 100) : 0}%`,
          },
          { label: t("reserved"), value: reserved },
          { label: t("sold"), value: sold },
          { label: t("occupancy"), value: `${occupancyPct}%` },
        ]
      : []),
  ];

  const quickActions = [
    canViewLeads
      ? { label: t("viewLeads"), href: "/portal/management-x7k9/crm/leads" }
      : null,
    publicPageEnabled && roleHasPlatformPermission(role, "managePublicContent")
      ? { label: t("manageProject"), href: "/portal/management-x7k9/projects" }
      : null,
    publicPageEnabled && roleHasPlatformPermission(role, "managePublicContent")
      ? { label: t("editFAQ"), href: "/portal/management-x7k9/faqs" }
      : null,
  ].filter((action): action is { label: string; href: string } => Boolean(action));

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="a-page-title">{t("overview")}</h1>
          <p className="a-page-sub">{t("dashboard")}</p>
        </div>
        {canViewLeads && (
          <Link
            href="/portal/management-x7k9/crm/leads"
            className="a-btn"
          >
            {t("viewLeads")}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Stats row — quiet, no decoration */}
      <section
        className="a-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        style={{ overflow: "hidden" }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="px-4 py-3"
            style={{
              borderRight: i < stats.length - 1 ? "1px solid var(--a-border)" : undefined,
              borderBottom: undefined,
            }}
          >
            <div
              className="text-[11px] uppercase tracking-wide"
              style={{ color: "var(--a-text-tertiary)", letterSpacing: "0.04em" }}
            >
              {s.label}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="text-[22px] font-semibold tabular-nums"
                style={{ color: "var(--a-text)", lineHeight: 1.1 }}
              >
                {s.value}
              </span>
              {s.sub && (
                <span className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
                  {s.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Two-column: recent leads + quick actions / sales bar */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent leads (2/3) */}
        <div className="lg:col-span-2 a-card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--a-border)" }}
          >
            <div className="text-[13px] font-semibold" style={{ color: "var(--a-text)" }}>
              {t("recentLeads")}
            </div>
            <Link
              href="/portal/management-x7k9/crm/leads"
              className="text-[12px]"
              style={{ color: "var(--a-text-secondary)" }}
            >
              {t("seeAll")}
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div
              className="px-4 py-10 text-center text-[13px]"
              style={{ color: "var(--a-text-tertiary)" }}
            >
              {t("noLeadsYet")}
            </div>
          ) : (
            <table className="a-table">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("phone")}</th>
                  <th>{t("status")}</th>
                  <th style={{ textAlign: "right" }}>{t("when")}</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.name}</td>
                    <td style={{ color: "var(--a-text-secondary)" }}>{l.phone}</td>
                    <td>
                      <span
                        className="inline-flex items-center gap-1.5 text-[12px]"
                        style={{ color: "var(--a-text-secondary)" }}
                      >
                        <span
                          className="a-dot"
                          style={{
                            color: getLeadStatusTone(l.status),
                          }}
                        />
                        {t(l.status)}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: "var(--a-text-tertiary)",
                        fontSize: 12,
                      }}
                    >
                      {formatRelative(l.createdAt.toISOString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Inventory mix */}
          {inventoryEnabled && (
          <div className="a-card p-4">
            <div
              className="text-[13px] font-semibold mb-3"
              style={{ color: "var(--a-text)" }}
            >
              {t("inventory")}
            </div>

            {/* Simple stacked bar */}
            <div
              className="flex h-1.5 w-full overflow-hidden"
              style={{
                background: "var(--a-bg-active)",
                borderRadius: 999,
              }}
            >
              {total > 0 && (
                <>
                  <div
                    style={{
                      width: `${(available / total) * 100}%`,
                      background: "var(--a-success)",
                    }}
                  />
                  <div
                    style={{
                      width: `${(reserved / total) * 100}%`,
                      background: "var(--a-warning)",
                    }}
                  />
                  <div
                    style={{
                      width: `${(sold / total) * 100}%`,
                      background: "var(--a-danger)",
                    }}
                  />
                </>
              )}
            </div>

            <ul className="mt-3 flex flex-col gap-1.5 text-[12px]">
              {[
                { c: "var(--a-success)", label: t("available"), v: available },
                { c: "var(--a-warning)", label: t("reserved"), v: reserved },
                { c: "var(--a-danger)", label: t("sold"), v: sold },
              ].map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between"
                  style={{ color: "var(--a-text-secondary)" }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="a-dot" style={{ color: row.c }} />
                    {row.label}
                  </span>
                  <span className="tabular-nums" style={{ color: "var(--a-text)" }}>
                    {row.v}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Quick actions — text links */}
          <div className="a-card p-4">
            <div
              className="text-[13px] font-semibold mb-3"
              style={{ color: "var(--a-text)" }}
            >
              {t("quickActions")}
            </div>
            <ul className="flex flex-col">
              {quickActions.map((a, i) => (
                <li
                  key={a.href}
                  style={{
                    borderTop: i === 0 ? undefined : "1px solid var(--a-border)",
                  }}
                >
                  <Link
                    href={a.href}
                    className="flex items-center justify-between py-2 text-[13px] hover:opacity-80"
                    style={{ color: "var(--a-text)" }}
                  >
                    <span>{a.label}</span>
                    <ArrowUpRight
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--a-text-tertiary)" }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
