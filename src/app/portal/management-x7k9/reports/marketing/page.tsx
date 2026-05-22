import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getMarketingReport, getReportFilterOptions, parseReportFilters, reportQueryString } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, ReportTabs, money } from "@/components/reports/ReportUi";
import { ReportBarChart } from "@/components/reports/ReportCharts";

export const dynamic = "force-dynamic";

export default async function MarketingReportPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewMarketingReports);
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports")) return null;

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getMarketingReport(filters)]);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Marketing report</h1>
        <p className="a-page-sub">Source, campaign, UTM, and public form performance without exposing finance details.</p>
      </div>
      <ReportTabs active="marketing" financeEnabled={financeEnabled} marketingEnabled />
      <ReportControls filters={filters} options={options} showAgent={false} exportHref={`/api/reports/leads.csv?${reportQueryString(filters)}`} />
      <MetricGrid
        metrics={[
          { label: "Leads", value: report.summary.leads },
          { label: "Active sources", value: report.summary.sources },
          { label: "Public page views", value: report.summary.publicPageViews },
          { label: "Form views", value: report.summary.formViews },
          { label: "Form starts", value: report.summary.formStarts },
          { label: "Form submits", value: report.summary.formSubmits },
          { label: "Created leads", value: report.summary.formSuccesses },
          ...(report.summary.costMetricsEnabled ? [{ label: "Ad spend", value: money(report.summary.adSpend) }] : []),
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Public form funnel">
          <ReportBarChart data={report.series.formFunnel} xKey="stage" yKey="count" />
        </ReportSection>
        <ReportSection title="Source leads">
          <ReportBarChart data={report.series.sourcePerformance} xKey="label" yKey="leads" />
        </ReportSection>
      </div>
      <ReportSection title="Source conversion">
        <div className="overflow-x-auto">
          <table className="a-table min-w-[880px]">
            <thead>
              <tr><th>Source</th><th>Leads</th><th>Meetings</th><th>Reservations</th><th>Sold</th><th>Meeting %</th><th>Reservation %</th><th>Sold %</th>{report.summary.costMetricsEnabled ? <><th>CPL</th><th>CPS</th></> : null}</tr>
            </thead>
            <tbody>
              {report.tables.sources.map((row) => (
                <tr key={row.source}>
                  <td>{row.label}</td>
                  <td>{row.leads}</td>
                  <td>{row.meetings}</td>
                  <td>{row.reservations}</td>
                  <td>{row.sold}</td>
                  <td>{row.meetingRate}%</td>
                  <td>{row.reservationRate}%</td>
                  <td>{row.soldRate}%</td>
                  {report.summary.costMetricsEnabled ? <><td>{row.costPerLead ? money(row.costPerLead) : "—"}</td><td>{row.costPerSale ? money(row.costPerSale) : "—"}</td></> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Campaign table">
          <table className="a-table">
            <thead><tr><th>Campaign</th><th>Leads</th><th>Sold</th><th>Conversion</th></tr></thead>
            <tbody>
              {report.tables.campaigns.map((row) => (
                <tr key={row.campaign}><td>{row.campaign}</td><td>{row.leads}</td><td>{row.sold}</td><td>{row.conversionRate}%</td></tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
        <ReportSection title="UTM table">
          <table className="a-table">
            <thead><tr><th>UTM</th><th>Leads</th><th>Sold</th></tr></thead>
            <tbody>
              {report.tables.utm.map((row) => (
                <tr key={row.utm}><td>{row.utm}</td><td>{row.leads}</td><td>{row.sold}</td></tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
      </div>
    </div>
  );
}
