import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("admin");
  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getMarketingReport(filters)]);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("marketingReportTitle")}</h1>
        <p className="a-page-sub">{t("marketingReportSubtitle")}</p>
      </div>
      <ReportTabs active="marketing" financeEnabled={financeEnabled} marketingEnabled />
      <ReportControls filters={filters} options={options} showAgent={false} exportHref={`/api/reports/leads.csv?${reportQueryString(filters)}`} />
      <MetricGrid
        metrics={[
          { label: t("metricLeads"), value: report.summary.leads },
          { label: t("metricActiveSources"), value: report.summary.sources },
          { label: t("metricPublicPageViews"), value: report.summary.publicPageViews },
          { label: t("metricFormViews"), value: report.summary.formViews },
          { label: t("metricFormStarts"), value: report.summary.formStarts },
          { label: t("metricFormSubmits"), value: report.summary.formSubmits },
          { label: t("metricCreatedLeads"), value: report.summary.formSuccesses },
          ...(report.summary.costMetricsEnabled ? [{ label: t("metricAdSpend"), value: money(report.summary.adSpend) }] : []),
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("sectionFormFunnel")}>
          <ReportBarChart data={report.series.formFunnel} xKey="stage" yKey="count" />
        </ReportSection>
        <ReportSection title={t("sectionSourceLeads")}>
          <ReportBarChart data={report.series.sourcePerformance} xKey="label" yKey="leads" />
        </ReportSection>
      </div>
      <ReportSection title={t("sectionSourceConversion")}>
        <div className="overflow-x-auto">
          <table className="a-table min-w-[880px]">
            <thead>
              <tr><th>{t("colSource")}</th><th>{t("colLeads")}</th><th>{t("colMeetings")}</th><th>{t("colReservations")}</th><th>{t("colSold")}</th><th>{t("colMeetingPct")}</th><th>{t("colReservationPct")}</th><th>{t("colSoldPct")}</th>{report.summary.costMetricsEnabled ? <><th>{t("colCPL")}</th><th>{t("colCPS")}</th></> : null}</tr>
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
        <ReportSection title={t("sectionCampaignTable")}>
          <table className="a-table">
            <thead><tr><th>{t("colCampaign")}</th><th>{t("colLeads")}</th><th>{t("colSold")}</th><th>{t("colConversion")}</th></tr></thead>
            <tbody>
              {report.tables.campaigns.map((row) => (
                <tr key={row.campaign}><td>{row.campaign}</td><td>{row.leads}</td><td>{row.sold}</td><td>{row.conversionRate}%</td></tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
        <ReportSection title={t("sectionUTMTable")}>
          <table className="a-table">
            <thead><tr><th>{t("colUTM")}</th><th>{t("colLeads")}</th><th>{t("colSold")}</th></tr></thead>
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
