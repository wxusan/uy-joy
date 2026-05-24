import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { fetchDirectorQueues } from "@/lib/director-queues";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { leadSourceLabelUi, platformRoleLabel } from "@/lib/crm-labels";
import { getLocale, getTranslations } from "next-intl/server";
import AlertAckButton from "./AlertAckButton";

export const dynamic = "force-dynamic";

export default async function DirectorControlPanelPage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;
  const t = await getTranslations("admin");
  const locale = await getLocale();

  const user = session.user as { id?: string; role?: string };
  const canViewFinance = roleHasPlatformPermission(user.role, "viewFinance");
  const canViewPaymentRisk = canViewFinance || roleHasPlatformPermission(user.role, "viewReports");

  const now = new Date();
  const data = await fetchDirectorQueues(now);

  const summaryCards: Array<{
    label: string;
    value: number;
    href: string;
    sectionId: string;
    accent: string;
    danger?: boolean;
  }> = [
    {
      label: t("directorUnansweredLeads"),
      value: data.counts.unanswered,
      href: "#unanswered",
      sectionId: "unanswered",
      accent: "var(--a-danger)",
      danger: true,
    },
    {
      label: t("directorInactiveManagers"),
      value: data.counts.inactiveManagers,
      href: "#inactive",
      sectionId: "inactive",
      accent: "var(--a-warning)",
    },
    {
      label: t("directorOverdueFollowups"),
      value: data.counts.overdueFollowups,
      href: "#overdue",
      sectionId: "overdue",
      accent: "var(--a-danger)",
      danger: true,
    },
    {
      label: t("directorExpiringReservations"),
      value: data.counts.expiringReservations,
      href: "#expiring",
      sectionId: "expiring",
      accent: "var(--a-warning)",
    },
    {
      label: t("directorWeakSources"),
      value: data.weakSources.length,
      href: "#sources",
      sectionId: "sources",
      accent: "var(--a-warning)",
    },
    ...(canViewPaymentRisk
      ? [
          {
            label: t("directorOverduePayments"),
            value: data.counts.overduePayments,
            href: "#payments",
            sectionId: "payments",
            accent: "var(--a-danger)",
            danger: true,
          },
        ]
      : []),
  ];

  const noIssueRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="text-center py-8" style={{ color: "var(--a-text-tertiary)" }}>
        {t("directorNoIssues")}
      </td>
    </tr>
  );

  const managerCell = (name: string | null) => (
    <span style={{ color: name ? undefined : "var(--a-text-tertiary)" }}>
      {name ?? t("dashboardNoManager")}
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="a-page-title">{t("directorPanelTitle")}</h1>
        <p className="a-page-sub">{t("directorPanelSubtitle")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <a key={card.sectionId} href={card.href} className="a-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
              <span className="a-dot" style={{ color: card.accent }} />
              <span>{card.label}</span>
            </div>
            <div
              className="mt-2 text-[28px] font-semibold"
              style={{ color: card.danger && card.value > 0 ? card.accent : "var(--a-text)" }}
            >
              {card.value}
            </div>
            <div className="mt-2 text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
              {t("directorViewSection")}
            </div>
          </a>
        ))}
      </div>

      {/* ── 1. Unanswered leads ── */}
      <section id="unanswered" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{t("directorUnansweredLeads")}</h2>
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[680px]">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("phone")}</th>
                <th>{t("source")}</th>
                <th>{t("assigned")}</th>
                <th style={{ textAlign: "right" }}>{t("created")}</th>
              </tr>
            </thead>
            <tbody>
              {data.unansweredLeads.length === 0
                ? noIssueRow(5)
                : data.unansweredLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <Link
                          href={`/portal/management-x7k9/crm/leads/${lead.id}`}
                          className="font-medium hover:underline"
                        >
                          {lead.name ?? "—"}
                        </Link>
                      </td>
                      <td>{lead.phone ?? "—"}</td>
                      <td>{leadSourceLabelUi(lead.source, locale)}</td>
                      <td>{managerCell(lead.assignedToName)}</td>
                      <td style={{ textAlign: "right" }}>
                        {lead.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div>
          <Link
            href="/portal/management-x7k9/crm/leads?unanswered=true"
            className="text-[13px] hover:underline"
            style={{ color: "var(--a-accent)" }}
          >
            {t("directorViewAll")} →
          </Link>
        </div>
      </section>

      {/* ── 2. Inactive managers ── */}
      <section id="inactive" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{t("directorInactiveManagers")}</h2>
        <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
          {t("directorInactiveManagersHint")}
        </p>
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[560px]">
            <thead>
              <tr>
                <th>{t("agent")}</th>
                <th>{t("role")}</th>
                <th>{t("directorActiveLeads")}</th>
                <th style={{ textAlign: "right" }}>{t("directorLastContact")}</th>
              </tr>
            </thead>
            <tbody>
              {data.inactiveManagers.length === 0
                ? noIssueRow(4)
                : data.inactiveManagers.map((mgr) => (
                    <tr key={mgr.id}>
                      <td>
                        <Link
                          href={`/portal/management-x7k9/crm/agents/${mgr.id}`}
                          className="font-medium hover:underline"
                        >
                          {mgr.name}
                        </Link>
                      </td>
                      <td>{platformRoleLabel(t, mgr.role)}</td>
                      <td>{mgr.activeLeads}</td>
                      <td style={{ textAlign: "right", color: "var(--a-danger)" }}>
                        {mgr.lastActivityDate
                          ? mgr.lastActivityDate.toLocaleDateString()
                          : t("directorNeverContacted")}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 3. Overdue follow-ups ── */}
      <section id="overdue" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{t("directorOverdueFollowups")}</h2>
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[700px]">
            <thead>
              <tr>
                <th>{t("task")}</th>
                <th>{t("lead")}</th>
                <th>{t("assigned")}</th>
                <th style={{ textAlign: "right" }}>{t("overdue")}</th>
              </tr>
            </thead>
            <tbody>
              {data.overdueFollowups.length === 0
                ? noIssueRow(4)
                : data.overdueFollowups.map((task) => (
                    <tr key={task.id}>
                      <td className="font-medium">{task.title}</td>
                      <td>
                        {task.leadId ? (
                          <Link
                            href={`/portal/management-x7k9/crm/leads/${task.leadId}`}
                            className="hover:underline"
                          >
                            {task.leadName ?? "—"}
                          </Link>
                        ) : task.clientId ? (
                          <Link
                            href={`/portal/management-x7k9/crm/clients/${task.clientId}`}
                            className="hover:underline"
                          >
                            {task.clientName ?? "—"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{managerCell(task.assignedToName)}</td>
                      <td style={{ textAlign: "right", color: "var(--a-danger)" }}>
                        {task.dueAt ? task.dueAt.toLocaleDateString() : t("noDueDate")}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div>
          <Link
            href="/portal/management-x7k9/crm/tasks?view=overdue"
            className="text-[13px] hover:underline"
            style={{ color: "var(--a-accent)" }}
          >
            {t("directorViewAll")} →
          </Link>
        </div>
      </section>

      {/* ── 4. Expiring reservations ── */}
      <section id="expiring" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{t("directorExpiringReservations")}</h2>
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[620px]">
            <thead>
              <tr>
                <th>{t("directorDealRef")}</th>
                <th>{t("name")}</th>
                <th>{t("assigned")}</th>
                <th style={{ textAlign: "right" }}>{t("directorExpiresAt")}</th>
              </tr>
            </thead>
            <tbody>
              {data.expiringReservations.length === 0
                ? noIssueRow(4)
                : data.expiringReservations.map((deal) => (
                    <tr key={deal.id}>
                      <td>
                        <Link
                          href={`/portal/management-x7k9/crm/deals/${deal.id}`}
                          className="font-medium hover:underline"
                        >
                          {deal.dealNumber}
                        </Link>
                      </td>
                      <td>{deal.clientName ?? "—"}</td>
                      <td>{managerCell(deal.assignedToName)}</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "var(--a-warning)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {deal.reservationExpiresAt
                          ? deal.reservationExpiresAt.toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div>
          <Link
            href="/portal/management-x7k9/crm/deals?status=reserved&expiring=true"
            className="text-[13px] hover:underline"
            style={{ color: "var(--a-accent)" }}
          >
            {t("directorViewAll")} →
          </Link>
        </div>
      </section>

      {/* ── 5. Weak sources ── */}
      <section id="sources" className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{t("directorWeakSources")}</h2>
        <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
          {t("directorWeakSourcesHint")}
        </p>
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[520px]">
            <thead>
              <tr>
                <th>{t("source")}</th>
                <th style={{ textAlign: "right" }}>{t("directorUnansweredCount")}</th>
              </tr>
            </thead>
            <tbody>
              {data.weakSources.length === 0
                ? noIssueRow(2)
                : data.weakSources.map((row) => (
                    <tr key={row.source}>
                      <td>{leadSourceLabelUi(row.source, locale)}</td>
                      <td style={{ textAlign: "right", color: "var(--a-warning)" }}>{row.unansweredCount}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 6. Overdue payments (finance-safe risk signal) ── */}
      {canViewPaymentRisk ? (
        <section id="payments" className="flex flex-col gap-2">
          <h2 className="text-[15px] font-semibold">{t("directorOverduePayments")}</h2>
          <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
            {t("directorOverduePaymentsHint")}
          </p>
          <div className="a-card overflow-x-auto">
            <table className="a-table min-w-[520px]">
              <thead>
                <tr>
                  <th>{t("directorDealRef")}</th>
                  <th>{t("directorPaymentLabel")}</th>
                  <th style={{ textAlign: "right" }}>{t("directorPaymentDue")}</th>
                </tr>
              </thead>
              <tbody>
                {data.overduePayments.length === 0
                  ? noIssueRow(3)
                  : data.overduePayments.map((pmt) => (
                      <tr key={pmt.id}>
                        <td>
                          <Link
                            href={`/portal/management-x7k9/crm/deals/${pmt.dealId}`}
                            className="font-medium hover:underline"
                          >
                            {pmt.dealNumber}
                          </Link>
                        </td>
                        <td>{pmt.label}</td>
                        <td style={{ textAlign: "right", color: "var(--a-danger)" }}>
                          {pmt.dueDate.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ── 7. Telegram alerts ── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{t("directorAlertLog")}</h2>
        <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
          {t("directorAlertLogHint")}
        </p>
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[760px]">
            <thead>
              <tr>
                <th>{t("message")}</th>
                <th>{t("directorAlertStatus")}</th>
                <th style={{ textAlign: "right" }}>{t("directorAlertCreated")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.recentAlerts.length === 0
                ? noIssueRow(4)
                : data.recentAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td className="max-w-[420px]">
                        <Link href={`/portal/management-x7k9/crm/leads/${alert.leadId}`} className="font-medium hover:underline">
                          {alert.messageText.split("\n")[0]}
                        </Link>
                        {alert.errorMessage ? (
                          <div className="text-[11px]" style={{ color: "var(--a-danger)" }}>{alert.errorMessage}</div>
                        ) : null}
                      </td>
                      <td>{alert.status}</td>
                      <td style={{ textAlign: "right" }}>{alert.createdAt.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}><AlertAckButton alertId={alert.id} /></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 8. Manager comparison snapshot ── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{t("directorManagerSnapshot")}</h2>
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[760px]">
            <thead>
              <tr>
                <th>{t("agent")}</th>
                <th>{t("role")}</th>
                <th style={{ textAlign: "right" }}>{t("directorActiveLeads")}</th>
                <th style={{ textAlign: "right" }}>{t("directorNewToday")}</th>
                <th style={{ textAlign: "right" }}>{t("directorContactedWeek")}</th>
                <th style={{ textAlign: "right" }}>{t("directorOverdueTasks")}</th>
                <th style={{ textAlign: "right" }}>{t("directorActiveDeals")}</th>
              </tr>
            </thead>
            <tbody>
              {data.managerSnapshots.length === 0 ? (
                noIssueRow(7)
              ) : (
                data.managerSnapshots.map((mgr) => (
                  <tr key={mgr.id}>
                    <td>
                      <Link
                        href={`/portal/management-x7k9/crm/agents/${mgr.id}`}
                        className="font-medium hover:underline"
                      >
                        {mgr.name}
                      </Link>
                    </td>
                    <td>{platformRoleLabel(t, mgr.role)}</td>
                    <td style={{ textAlign: "right" }}>{mgr.totalLeads}</td>
                    <td style={{ textAlign: "right" }}>{mgr.newToday}</td>
                    <td style={{ textAlign: "right" }}>{mgr.contactedThisWeek}</td>
                    <td
                      style={{
                        textAlign: "right",
                        color: mgr.overdueTasksCount > 0 ? "var(--a-danger)" : undefined,
                      }}
                    >
                      {mgr.overdueTasksCount}
                    </td>
                    <td style={{ textAlign: "right" }}>{mgr.activeDealsCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div>
          <Link
            href="/portal/management-x7k9/crm/agents"
            className="text-[13px] hover:underline"
            style={{ color: "var(--a-accent)" }}
          >
            {t("directorViewAll")} →
          </Link>
        </div>
      </section>
    </div>
  );
}
