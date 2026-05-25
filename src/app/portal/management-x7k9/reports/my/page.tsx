import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { normalizePlatformRole } from "@/lib/platform-plans";
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
  const role = normalizePlatformRole(user.role);
  if (role !== "sales_agent" && role !== "external_agent") notFound();
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports")) return null;

  const t = await getTranslations("admin");
  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getAgentReport(filters, user, true)]);
  const row = report.tables.agents[0];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("myReportTitle")}</h1>
        <p className="a-page-sub">{t("myReportSubtitle")}</p>
      </div>
      <ReportControls filters={filters} options={options} showAgent={false} showSource={false} />
      <MetricGrid
        metrics={[
          { label: t("metricMyActiveLeads"), value: row?.assignedLeads ?? 0, href: "/portal/management-x7k9/crm/leads" },
          { label: t("metricMyOverdueTasks"), value: row?.overdueTasks ?? 0, href: "/portal/management-x7k9/crm/tasks?view=overdue" },
          { label: t("metricActions"), value: row?.actions ?? 0 },
          { label: t("metricCalls"), value: row?.calls ?? 0 },
          { label: t("metricMeetings"), value: row?.meetings ?? 0 },
          { label: t("metricReservations"), value: row?.reservations ?? 0 },
          { label: t("metricSoldDeals"), value: row?.soldDeals ?? 0 },
          { label: t("metricSoldRevenue"), value: money(row?.soldRevenue ?? 0) },
        ]}
      />
      <ReportSection title={t("sectionTargetProgress")}>
        {row ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[6px] border p-3" style={{ borderColor: "var(--a-border)" }}>
              <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{t("dealTarget")}</div>
              <div className="mt-1 text-[24px] font-semibold">{row.targetDealProgress != null ? `${row.targetDealProgress}%` : t("notSet")}</div>
            </div>
            <div className="rounded-[6px] border p-3" style={{ borderColor: "var(--a-border)" }}>
              <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{t("revenueTarget")}</div>
              <div className="mt-1 text-[24px] font-semibold">{row.targetRevenueProgress != null ? `${row.targetRevenueProgress}%` : t("notSet")}</div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("noSalesProfile")}</div>
        )}
      </ReportSection>
      <ReportSection title={t("sectionPersonalSalesTrend")}>
        <ReportBarChart data={report.series.soldByAgent} xKey="agent" yKey="soldDeals" emptyLabel={t("noSalesYet")} />
      </ReportSection>
    </div>
  );
}
