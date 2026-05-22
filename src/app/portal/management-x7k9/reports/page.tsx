import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getOverviewReport, getReportFilterOptions, parseReportFilters, reportQueryString } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, ReportTabs, money } from "@/components/reports/ReportUi";
import { ReportBarChart, ReportLineChart, ReportPieChart } from "@/components/reports/ReportCharts";
import { getTranslations } from "next-intl/server";

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

  const t = await getTranslations("admin");
  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getOverviewReport(filters, user)]);
  const query = reportQueryString(filters);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("executiveReports")}</h1>
        <p className="a-page-sub">{t("reportsSubtitle")}</p>
      </div>
      <div>
        <Link href="/portal/management-x7k9/reports/digest" className="a-btn subtle">{t("weeklyDigestPreview")}</Link>
      </div>
      <ReportTabs active="overview" financeEnabled={financeEnabled} marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} exportHref={`/api/reports/leads.csv?${query}`} />
      <MetricGrid
        metrics={[
          { label: t("leadsInPeriod"), value: report.summary.totalLeads, sub: `${report.comparison.totalLeads.delta >= 0 ? "+" : ""}${report.comparison.totalLeads.delta} ${t("vsPrevious")}`, href: report.drilldowns.totalLeads },
          { label: t("newToday"), value: report.summary.newToday },
          { label: t("activeLeads"), value: report.summary.activeLeads },
          { label: t("overdueFollowups"), value: report.summary.overdueFollowups, href: report.drilldowns.overdueFollowups },
          { label: t("reservations"), value: report.summary.reservations },
          { label: t("soldDeals"), value: report.summary.soldDeals, sub: `${report.comparison.soldDeals.delta >= 0 ? "+" : ""}${report.comparison.soldDeals.delta} ${t("vsPrevious")}`, href: report.drilldowns.soldDeals },
          { label: t("dealBackedPipeline"), value: money(report.summary.pipelineValue), sub: t("openDealSaleValue") },
          { label: t("estimatedPipeline"), value: money(report.summary.estimatedPipelineValue), sub: t("leadUnitSnapshots") },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("leadTrend")}>
          <ReportLineChart data={report.series.leadsByDay} xKey="date" yKey="leads" />
        </ReportSection>
        <ReportSection title={t("leadFunnel")}>
          <ReportBarChart data={report.series.funnel} xKey="status" yKey="count" />
        </ReportSection>
        <ReportSection title={t("inventoryMix")}>
          <ReportPieChart data={report.series.inventoryMix} nameKey="status" valueKey="count" />
        </ReportSection>
        <ReportSection title={t("periodComparison")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [t("leadsLabel"), report.comparison.totalLeads],
              [t("soldDealsLabel"), report.comparison.soldDeals],
              [t("pipelineLabel"), report.comparison.pipelineValue],
            ].map(([label, row]) => {
              const comparison = row as { current: number; previous: number; deltaPercent: number };
              return (
                <div key={String(label)} className="rounded-[6px] border p-3" style={{ borderColor: "var(--a-border)" }}>
                  <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{String(label)}</div>
                  <div className="mt-1 text-[20px] font-semibold">{comparison.current.toLocaleString()}</div>
                  <div className="text-[12px]" style={{ color: comparison.deltaPercent >= 0 ? "var(--a-success)" : "var(--a-danger)" }}>
                    {comparison.deltaPercent >= 0 ? "+" : ""}{comparison.deltaPercent}% {t("vsPrevious")}
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("topAgents")}>
          <table className="a-table">
            <thead><tr><th>{t("agent")}</th><th style={{ textAlign: "right" }}>{t("leads")}</th></tr></thead>
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
        <ReportSection title={t("topSources")}>
          <table className="a-table">
            <thead><tr><th>{t("source")}</th><th style={{ textAlign: "right" }}>{t("leads")}</th></tr></thead>
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
