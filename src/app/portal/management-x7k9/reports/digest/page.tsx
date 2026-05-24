import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getOverviewReport, getSalesReport, parseReportFilters } from "@/lib/reports";
import { MetricGrid, ReportSection, money } from "@/components/reports/ReportUi";

export const dynamic = "force-dynamic";

export default async function WeeklyDigestPreviewPage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewReports);
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "reports")) return null;
  const t = await getTranslations("admin");

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  const filters = parseReportFilters(new URLSearchParams({ from: from.toISOString(), to: to.toISOString() }));
  const [overview, sales] = await Promise.all([getOverviewReport(filters, user), getSalesReport(filters, user)]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="a-page-title">{t("weeklyDigestPreview")}</h1>
          <p className="a-page-sub">{t("digestSubtitle")}</p>
        </div>
        <Link href="/portal/management-x7k9/reports" className="a-btn subtle">{t("backToReports")}</Link>
      </div>
      <MetricGrid
        metrics={[
          { label: t("digestLeads"), value: overview.summary.totalLeads },
          { label: t("digestReservations"), value: overview.summary.reservations },
          { label: t("digestSoldDeals"), value: overview.summary.soldDeals },
          { label: t("digestPipeline"), value: money(overview.summary.pipelineValue) },
          { label: t("digestOverdueFollowups"), value: overview.summary.overdueFollowups },
          { label: t("digestSlaBreach"), value: sales.summary.firstResponseBreaches },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("digestTopSources")}>
          <table className="a-table">
            <thead><tr><th>{t("digestColSource")}</th><th style={{ textAlign: "right" }}>{t("digestLeads")}</th></tr></thead>
            <tbody>
              {overview.tables.topSources.map((source) => (
                <tr key={source.source}><td>{source.label}</td><td style={{ textAlign: "right" }}>{source.leads}</td></tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
        <ReportSection title={t("digestOverdueByAgent")}>
          <table className="a-table">
            <thead><tr><th>{t("digestColAgent")}</th><th style={{ textAlign: "right" }}>{t("digestColOverdue")}</th></tr></thead>
            <tbody>
              {sales.tables.overdueByAgent.map((row) => (
                <tr key={row.agentId}><td>{row.agent}</td><td style={{ textAlign: "right" }}>{row.count}</td></tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
      </div>
    </div>
  );
}
