import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { unitStatusLabel } from "@/lib/crm-labels";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getInventoryReport, getReportFilterOptions, parseReportFilters, reportQueryString } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, ReportTabs, money } from "@/components/reports/ReportUi";
import { ReportBarChart, ReportPieChart, ReportStackedBarChart } from "@/components/reports/ReportCharts";

export const dynamic = "force-dynamic";

export default async function InventoryReportPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports") || !platformSettingsHasFeature(settings, "inventory")) return null;

  const t = await getTranslations("admin");
  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getInventoryReport(filters, user)]);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");
  const inventoryStatusLegend = {
    available: unitStatusLabel(t, "available"),
    reserved: unitStatusLabel(t, "reserved"),
    sold: unitStatusLabel(t, "sold"),
    other: t("other"),
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("inventoryReportTitle")}</h1>
        <p className="a-page-sub">{t("inventoryReportSubtitle")}</p>
      </div>
      <ReportTabs active="inventory" financeEnabled={financeEnabled} marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} showAgent={false} exportHref={`/api/reports/deals.csv?${reportQueryString(filters)}`} />
      <MetricGrid
        metrics={[
          { label: t("metricTotalUnits"), value: report.summary.totalUnits },
          { label: t("metricAvailable"), value: report.summary.available, href: "/portal/management-x7k9/projects" },
          { label: t("metricReserved"), value: report.summary.reserved },
          { label: t("metricSold"), value: report.summary.sold },
          { label: t("metricInventoryValue"), value: money(report.summary.inventoryValue) },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("sectionStatusMix")}>
          <ReportPieChart data={report.series.statusMix.map((row) => ({ ...row, status: unitStatusLabel(t, row.status) }))} nameKey="status" valueKey="count" />
        </ReportSection>
        <ReportSection title={t("sectionRoomCount")}>
          <ReportBarChart data={report.series.rooms.map((row) => ({ ...row, rooms: `${row.rooms} rooms` }))} xKey="rooms" yKey="count" />
        </ReportSection>
        <ReportSection title={t("sectionStatusByBuilding")}>
          <ReportStackedBarChart data={report.series.buildingMatrix} xKey="building" keys={["available", "reserved", "sold", "other"]} keyLabels={inventoryStatusLegend} />
        </ReportSection>
        <ReportSection title={t("sectionSoldValueByBuilding")}>
          <ReportBarChart data={report.series.soldValueByBuilding} xKey="building" yKey="value" emptyLabel={t("noSoldUnitsYet")} />
        </ReportSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("sectionTopRequested")}>
          <table className="a-table">
            <thead><tr><th>{t("colUnit")}</th><th>{t("colBuilding")}</th><th>{t("colStatus")}</th><th style={{ textAlign: "right" }}>{t("colLeadInterest")}</th></tr></thead>
            <tbody>
              {report.tables.topRequestedUnits.map((unit) => (
                <tr key={unit.unitId}>
                  <td><Link className="hover:underline" href={`/portal/management-x7k9/crm/leads?unitId=${unit.unitId}`}>{unit.unit}</Link></td>
                  <td>{unit.building} / {t("floorLabel")} {unit.floor}</td>
                  <td>{unitStatusLabel(t, unit.status)}</td>
                  <td style={{ textAlign: "right" }}>{unit.leadInterest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
        <ReportSection title={t("sectionSlowMoving")}>
          <table className="a-table">
            <thead><tr><th>{t("colUnit")}</th><th>{t("colBuilding")}</th><th>{t("colRooms")}</th><th>{t("colDaysOpen")}</th><th style={{ textAlign: "right" }}>{t("colPrice")}</th></tr></thead>
            <tbody>
              {report.tables.slowUnits.map((unit) => (
                <tr key={unit.unitId}>
                  <td>{unit.unit}</td>
                  <td>{unit.building} / {t("floorLabel")} {unit.floor}</td>
                  <td>{unit.rooms}</td>
                  <td>{unit.daysOpen}</td>
                  <td style={{ textAlign: "right" }}>{money(unit.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
      </div>
    </div>
  );
}
