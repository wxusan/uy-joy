import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
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

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getInventoryReport(filters, user)]);
  const financeEnabled = platformSettingsHasFeature(settings, "financeReports") && roleHasPlatformPermission(user.role, "viewFinance");
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Inventory report</h1>
        <p className="a-page-sub">Unit availability, building movement, demand signals, and slow-moving stock.</p>
      </div>
      <ReportTabs active="inventory" financeEnabled={financeEnabled} marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} showAgent={false} exportHref={`/api/reports/deals.csv?${reportQueryString(filters)}`} />
      <MetricGrid
        metrics={[
          { label: "Total units", value: report.summary.totalUnits },
          { label: "Available", value: report.summary.available, href: "/portal/management-x7k9/projects" },
          { label: "Reserved", value: report.summary.reserved },
          { label: "Sold", value: report.summary.sold },
          { label: "Inventory value", value: money(report.summary.inventoryValue) },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Status mix">
          <ReportPieChart data={report.series.statusMix} nameKey="status" valueKey="count" />
        </ReportSection>
        <ReportSection title="Room count distribution">
          <ReportBarChart data={report.series.rooms.map((row) => ({ ...row, rooms: `${row.rooms} rooms` }))} xKey="rooms" yKey="count" />
        </ReportSection>
        <ReportSection title="Status by building">
          <ReportStackedBarChart data={report.series.buildingMatrix} xKey="building" keys={["available", "reserved", "sold", "other"]} />
        </ReportSection>
        <ReportSection title="Sold value by building">
          <ReportBarChart data={report.series.soldValueByBuilding} xKey="building" yKey="value" emptyLabel="No sold units yet" />
        </ReportSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Top requested units">
          <table className="a-table">
            <thead><tr><th>Unit</th><th>Building</th><th>Status</th><th style={{ textAlign: "right" }}>Lead interest</th></tr></thead>
            <tbody>
              {report.tables.topRequestedUnits.map((unit) => (
                <tr key={unit.unitId}>
                  <td><Link className="hover:underline" href={`/portal/management-x7k9/crm/leads?unitId=${unit.unitId}`}>{unit.unit}</Link></td>
                  <td>{unit.building} / floor {unit.floor}</td>
                  <td>{unit.status}</td>
                  <td style={{ textAlign: "right" }}>{unit.leadInterest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
        <ReportSection title="Slow-moving units">
          <table className="a-table">
            <thead><tr><th>Unit</th><th>Building</th><th>Rooms</th><th>Days open</th><th style={{ textAlign: "right" }}>Price</th></tr></thead>
            <tbody>
              {report.tables.slowUnits.map((unit) => (
                <tr key={unit.unitId}>
                  <td>{unit.unit}</td>
                  <td>{unit.building} / floor {unit.floor}</td>
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
