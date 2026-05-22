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

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getSalesReport(filters, user)]);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Sales director report</h1>
        <p className="a-page-sub">Lead stage health, agent follow-up pressure, actions, visits, and lost reasons.</p>
      </div>
      <ReportTabs active="sales" financeEnabled={financeEnabled} marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} exportHref={`/api/reports/leads.csv?${reportQueryString(filters)}`} />
      <MetricGrid
        metrics={[
          { label: "Unassigned leads", value: report.summary.unassignedLeads, href: "/portal/management-x7k9/crm/leads?assignedToId=" },
          { label: "Actions logged", value: report.summary.actionCount },
          { label: "Calls logged", value: report.summary.callsLogged },
          { label: "Meetings scheduled", value: report.summary.meetingsScheduled },
          { label: "Visits completed", value: report.summary.visitsCompleted },
          { label: "Reservations", value: report.summary.reservations },
          { label: "Sold deals", value: report.summary.soldDeals },
          { label: "First-response SLA breaches", value: report.summary.firstResponseBreaches },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Leads by pipeline status">
          <ReportBarChart data={report.series.leadsByStatus} xKey="status" yKey="count" />
        </ReportSection>
        <ReportSection title="Average stage aging">
          <ReportBarChart data={report.series.stageAging} xKey="status" yKey="avgHours" emptyLabel="No active stage aging yet" />
        </ReportSection>
        <ReportSection title="Overdue tasks by agent">
          <ReportBarChart data={report.series.overdueByAgent} xKey="agent" yKey="count" emptyLabel="No overdue tasks" />
        </ReportSection>
        <ReportSection title="Lost reasons">
          <ReportBarChart data={report.series.lostReasons} xKey="reason" yKey="count" emptyLabel="No lost deals in scope" />
        </ReportSection>
      </div>
      <ReportSection title="Director action table">
        <table className="a-table">
          <thead><tr><th>Agent</th><th style={{ textAlign: "right" }}>Overdue tasks</th></tr></thead>
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
