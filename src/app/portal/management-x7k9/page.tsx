import Link from "next/link";
import { getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "New",
  inCRM: "In CRM",
  callback: "Callback",
  inProgress: "In progress",
  contacted: "Contacted",
  converted: "Converted",
  notInterested: "Not interested",
  closed: "Closed",
};

function formatRelative(dateIso: string) {
  const d = new Date(dateIso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default async function AdminDashboard() {
  const t = await getTranslations("admin");

  const [total, available, reserved, sold, leadsTotal, leadsNew, recentLeads] =
    await Promise.all([
      prisma.unit.count(),
      prisma.unit.count({ where: { status: "available" } }),
      prisma.unit.count({ where: { status: "reserved" } }),
      prisma.unit.count({ where: { status: "sold" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "new" } }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  const occupancyPct = total > 0 ? Math.round(((reserved + sold) / total) * 100) : 0;

  const stats: { label: string; value: string | number; sub?: string }[] = [
    { label: t("totalUnits"), value: total },
    { label: t("available"), value: available, sub: `${total > 0 ? Math.round((available / total) * 100) : 0}%` },
    { label: t("reserved"), value: reserved },
    { label: t("sold"), value: sold },
    { label: "Leads", value: leadsTotal, sub: leadsNew > 0 ? `${leadsNew} new` : undefined },
    { label: "Occupancy", value: `${occupancyPct}%` },
  ];

  const quickActions = [
    { label: "View leads", href: "/portal/management-x7k9/leads" },
    { label: "Manage project", href: "/portal/management-x7k9/projects" },
    { label: "Edit homepage", href: "/portal/management-x7k9/hero-images" },
    { label: "Edit FAQ", href: "/portal/management-x7k9/faqs" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="a-page-title">Overview</h1>
          <p className="a-page-sub">{t("dashboard")}</p>
        </div>
        <Link
          href="/portal/management-x7k9/leads"
          className="a-btn"
        >
          View leads
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
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
              Recent leads
            </div>
            <Link
              href="/portal/management-x7k9/leads"
              className="text-[12px]"
              style={{ color: "var(--a-text-secondary)" }}
            >
              See all →
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div
              className="px-4 py-10 text-center text-[13px]"
              style={{ color: "var(--a-text-tertiary)" }}
            >
              No leads yet. Inquiries from the contact form will appear here.
            </div>
          ) : (
            <table className="a-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>When</th>
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
                            color:
                              l.status === "new"
                                ? "var(--a-accent)"
                                : l.status === "converted"
                                ? "var(--a-success)"
                                : l.status === "notInterested" || l.status === "closed"
                                ? "var(--a-text-tertiary)"
                                : "var(--a-warning)",
                          }}
                        />
                        {LEAD_STATUS_LABEL[l.status] || l.status}
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
          <div className="a-card p-4">
            <div
              className="text-[13px] font-semibold mb-3"
              style={{ color: "var(--a-text)" }}
            >
              Inventory
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

          {/* Quick actions — text links */}
          <div className="a-card p-4">
            <div
              className="text-[13px] font-semibold mb-3"
              style={{ color: "var(--a-text)" }}
            >
              Quick actions
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
