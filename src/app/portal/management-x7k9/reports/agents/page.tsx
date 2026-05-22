import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getAgentReport, getReportFilterOptions, parseReportFilters, reportQueryString } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, ReportTabs, money } from "@/components/reports/ReportUi";
import { ReportBarChart } from "@/components/reports/ReportCharts";

export const dynamic = "force-dynamic";

export default async function AgentPerformanceReportPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports")) return null;

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getAgentReport(filters, user)]);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Agent performance</h1>
        <p className="a-page-sub">Assigned leads, activity, reservations, sales, and target progress.</p>
      </div>
      <ReportTabs active="agents" financeEnabled={financeEnabled} marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} exportHref={`/api/reports/agent-performance.csv?${reportQueryString(filters)}`} showSource={false} />
      <MetricGrid
        metrics={[
          { label: "Visible agents", value: report.summary.agents },
          { label: "Assigned active leads", value: report.summary.assignedLeads },
          { label: "Overdue tasks", value: report.summary.overdueTasks },
          { label: "Sold revenue", value: money(report.summary.soldRevenue) },
        ]}
      />
      <ReportSection title="Sold deals by agent">
        <ReportBarChart data={report.series.soldByAgent} xKey="agent" yKey="soldDeals" emptyLabel="No sold deals in this period" />
      </ReportSection>
      <ReportSection title="Agent table">
        <div className="overflow-x-auto">
          <table className="a-table min-w-[980px]">
            <thead>
              <tr>
                <th>Agent</th><th>Assigned leads</th><th>Overdue</th><th>Actions</th><th>Calls</th><th>Meetings</th><th>Reservations</th><th>Sold</th><th>Conversion</th><th>Target</th>
              </tr>
            </thead>
            <tbody>
              {report.tables.agents.map((row) => (
                <tr key={row.agentId}>
                  <td><Link className="font-medium hover:underline" href={`/portal/management-x7k9/crm/agents/${row.agentId}`}>{row.agent}</Link></td>
                  <td>{row.assignedLeads}</td>
                  <td>{row.overdueTasks}</td>
                  <td>{row.actions}</td>
                  <td>{row.calls}</td>
                  <td>{row.meetings}</td>
                  <td>{row.reservations}</td>
                  <td>{row.soldDeals}</td>
                  <td>{row.conversionRate}%</td>
                  <td>{row.targetDealProgress != null ? `${row.targetDealProgress}% deals` : row.targetRevenueProgress != null ? `${row.targetRevenueProgress}% revenue` : "Not set"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  );
}
