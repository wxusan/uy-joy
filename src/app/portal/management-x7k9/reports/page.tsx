import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getOverviewReport, getReportFilterOptions, parseReportFilters, reportQueryString } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, ReportTabs, money } from "@/components/reports/ReportUi";
import { ReportBarChart, ReportLineChart, ReportPieChart } from "@/components/reports/ReportCharts";

export const dynamic = "force-dynamic";

export default async function ReportsOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports")) return null;

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getOverviewReport(filters, user)]);
  const query = reportQueryString(filters);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Executive reports</h1>
        <p className="a-page-sub">Leads, conversion, pipeline, inventory movement, and period comparison.</p>
      </div>
      <div>
        <Link href="/portal/management-x7k9/reports/digest" className="a-btn subtle">Weekly digest preview</Link>
      </div>
      <ReportTabs active="overview" financeEnabled={financeEnabled} marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} exportHref={`/api/reports/leads.csv?${query}`} />
      <MetricGrid
        metrics={[
          { label: "Leads in period", value: report.summary.totalLeads, sub: `${report.comparison.totalLeads.delta >= 0 ? "+" : ""}${report.comparison.totalLeads.delta} vs previous`, href: report.drilldowns.totalLeads },
          { label: "New today", value: report.summary.newToday },
          { label: "Active leads", value: report.summary.activeLeads },
          { label: "Overdue follow-ups", value: report.summary.overdueFollowups, href: report.drilldowns.overdueFollowups },
          { label: "Reservations", value: report.summary.reservations },
          { label: "Sold deals", value: report.summary.soldDeals, sub: `${report.comparison.soldDeals.delta >= 0 ? "+" : ""}${report.comparison.soldDeals.delta} vs previous`, href: report.drilldowns.soldDeals },
          { label: "Deal-backed pipeline", value: money(report.summary.pipelineValue), sub: "Open deal sale value" },
          { label: "Estimated pipeline", value: money(report.summary.estimatedPipelineValue), sub: "Lead unit snapshots" },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Lead trend">
          <ReportLineChart data={report.series.leadsByDay} xKey="date" yKey="leads" />
        </ReportSection>
        <ReportSection title="Lead funnel">
          <ReportBarChart data={report.series.funnel} xKey="status" yKey="count" />
        </ReportSection>
        <ReportSection title="Inventory mix">
          <ReportPieChart data={report.series.inventoryMix} nameKey="status" valueKey="count" />
        </ReportSection>
        <ReportSection title="Period comparison">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Leads", report.comparison.totalLeads],
              ["Sold deals", report.comparison.soldDeals],
              ["Pipeline", report.comparison.pipelineValue],
            ].map(([label, row]) => {
              const comparison = row as { current: number; previous: number; deltaPercent: number };
              return (
                <div key={String(label)} className="rounded-[6px] border p-3" style={{ borderColor: "var(--a-border)" }}>
                  <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{String(label)}</div>
                  <div className="mt-1 text-[20px] font-semibold">{comparison.current.toLocaleString()}</div>
                  <div className="text-[12px]" style={{ color: comparison.deltaPercent >= 0 ? "var(--a-success)" : "var(--a-danger)" }}>
                    {comparison.deltaPercent >= 0 ? "+" : ""}{comparison.deltaPercent}% vs previous
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Top agents">
          <table className="a-table">
            <thead><tr><th>Agent</th><th style={{ textAlign: "right" }}>Leads</th></tr></thead>
            <tbody>
              {report.tables.topAgents.map((row) => (
                <tr key={row.agentId}>
                  <td><Link className="hover:underline" href={`/portal/management-x7k9/reports/agents?agentId=${row.agentId}`}>{row.agent}</Link></td>
                  <td style={{ textAlign: "right" }}>{row.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
        <ReportSection title="Top sources">
          <table className="a-table">
            <thead><tr><th>Source</th><th style={{ textAlign: "right" }}>Leads</th></tr></thead>
            <tbody>
              {report.tables.topSources.map((row) => (
                <tr key={row.source}>
                  <td><Link className="hover:underline" href={`/portal/management-x7k9/reports/marketing?source=${row.source}`}>{row.label}</Link></td>
                  <td style={{ textAlign: "right" }}>{row.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
      </div>
    </div>
  );
}
