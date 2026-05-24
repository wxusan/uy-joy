import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getReportFilterOptions, getSalesReport, parseReportFilters, reportQueryString } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, ReportTabs } from "@/components/reports/ReportUi";
import { ReportBarChart } from "@/components/reports/ReportCharts";

export const dynamic = "force-dynamic";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports")) return null;
  const t = await getTranslations("admin");

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getSalesReport(filters, user)]);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("salesDirectorReport")}</h1>
        <p className="a-page-sub">{t("salesReportSubtitle")}</p>
      </div>
      <ReportTabs active="sales" financeEnabled={financeEnabled} marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} exportHref={`/api/reports/leads.csv?${reportQueryString(filters)}`} />
      <MetricGrid
        metrics={[
          { label: t("unassignedLeads"), value: report.summary.unassignedLeads, href: "/portal/management-x7k9/crm/leads?assignedToId=" },
          { label: t("actionsLogged"), value: report.summary.actionCount },
          { label: t("callsLogged"), value: report.summary.callsLogged },
          { label: t("meetingsScheduled"), value: report.summary.meetingsScheduled },
          { label: t("visitsCompleted"), value: report.summary.visitsCompleted },
          { label: t("reservations"), value: report.summary.reservations },
          { label: t("soldDeals"), value: report.summary.soldDeals },
          { label: t("firstResponseBreaches"), value: report.summary.firstResponseBreaches },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("leadsByPipelineStatus")}>
          <ReportBarChart data={report.series.leadsByStatus} xKey="status" yKey="count" />
        </ReportSection>
        <ReportSection title={t("avgStageAging")}>
          <ReportBarChart data={report.series.stageAging} xKey="status" yKey="avgHours" emptyLabel={t("noStageAging")} />
        </ReportSection>
        <ReportSection title={t("overdueTasksByAgent")}>
          <ReportBarChart data={report.series.overdueByAgent} xKey="agent" yKey="count" emptyLabel={t("noOverdueTasks")} />
        </ReportSection>
        <ReportSection title={t("lostReasons")}>
          <ReportBarChart data={report.series.lostReasons} xKey="reason" yKey="count" emptyLabel={t("noLostDeals")} />
        </ReportSection>
      </div>
      <ReportSection title={t("directorActionTable")}>
        <table className="a-table">
          <thead><tr><th>{t("agent")}</th><th style={{ textAlign: "right" }}>{t("overdueTasks")}</th></tr></thead>
          <tbody>
            {report.tables.overdueByAgent.map((row) => (
              <tr key={row.agentId}><td>{row.agent}</td><td style={{ textAlign: "right" }}>{row.count}</td></tr>
            ))}
          </tbody>
        </table>
      </ReportSection>
    </div>
  );
}
