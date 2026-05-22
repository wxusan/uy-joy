import { requireAdmin } from "@/lib/auth";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getAgentReport, getReportFilterOptions, parseReportFilters } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, money } from "@/components/reports/ReportUi";
import { ReportBarChart } from "@/components/reports/ReportCharts";

export const dynamic = "force-dynamic";

export default async function MyReportPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAdmin();
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports")) return null;

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getAgentReport(filters, user, true)]);
  const row = report.tables.agents[0];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">My sales dashboard</h1>
        <p className="a-page-sub">Your leads, tasks, activity, reservations, and sold deals.</p>
      </div>
      <ReportControls filters={filters} options={options} showAgent={false} showSource={false} />
      <MetricGrid
        metrics={[
          { label: "My active leads", value: row?.assignedLeads ?? 0, href: "/portal/management-x7k9/crm/leads" },
          { label: "My overdue tasks", value: row?.overdueTasks ?? 0, href: "/portal/management-x7k9/crm/tasks?overdue=true" },
          { label: "Actions", value: row?.actions ?? 0 },
          { label: "Calls", value: row?.calls ?? 0 },
          { label: "Meetings", value: row?.meetings ?? 0 },
          { label: "Reservations", value: row?.reservations ?? 0 },
          { label: "Sold deals", value: row?.soldDeals ?? 0 },
          { label: "Sold revenue", value: money(row?.soldRevenue ?? 0) },
        ]}
      />
      <ReportSection title="Target progress">
        {row ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[6px] border p-3" style={{ borderColor: "var(--a-border)" }}>
              <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>Deal target</div>
              <div className="mt-1 text-[24px] font-semibold">{row.targetDealProgress != null ? `${row.targetDealProgress}%` : "Not set"}</div>
            </div>
            <div className="rounded-[6px] border p-3" style={{ borderColor: "var(--a-border)" }}>
              <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>Revenue target</div>
              <div className="mt-1 text-[24px] font-semibold">{row.targetRevenueProgress != null ? `${row.targetRevenueProgress}%` : "Not set"}</div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>No sales profile is available.</div>
        )}
      </ReportSection>
      <ReportSection title="Personal sales trend">
        <ReportBarChart data={report.series.soldByAgent} xKey="agent" yKey="soldDeals" emptyLabel="No sales yet" />
      </ReportSection>
    </div>
  );
}
