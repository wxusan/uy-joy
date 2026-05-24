import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getFinanceReport, getReportFilterOptions, parseReportFilters, reportQueryString } from "@/lib/reports";
import { MetricGrid, ReportControls, ReportSection, ReportTabs, money } from "@/components/reports/ReportUi";
import { ReportBarChart, ReportStackedBarChart } from "@/components/reports/ReportCharts";

export const dynamic = "force-dynamic";

export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewFinance);
  const user = session.user as { id?: string; role?: string };
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "financeReports")) return null;

  const t = await getTranslations("admin");
  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getFinanceReport(filters, user)]);
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("financeReportTitle")}</h1>
        <p className="a-page-sub">{t("financeReportSubtitle")}</p>
      </div>
      <ReportTabs active="finance" financeEnabled marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} exportHref={`/api/reports/payments.csv?${reportQueryString(filters)}`} showSource={false} />
      <MetricGrid
        metrics={[
          { label: t("metricTotalSoldValue"), value: money(report.summary.totalSoldValue) },
          { label: t("metricExpectedThisMonth"), value: money(report.summary.expectedThisMonth) },
          { label: t("metricPaidThisMonth"), value: money(report.summary.paidThisMonth) },
          { label: t("metricUnpaidScheduled"), value: money(report.summary.unpaidScheduled) },
          { label: t("metricOverdueAmount"), value: money(report.summary.overdueAmount) },
          { label: t("metricOverdueClients"), value: report.summary.overdueClients },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("sectionCashflow")}>
          <ReportStackedBarChart data={report.series.cashflow} xKey="month" keys={["expected", "paid"]} emptyLabel={t("noPaymentRowsYet")} />
        </ReportSection>
        <ReportSection title={t("sectionPaymentPlanStatus")}>
          <ReportBarChart data={report.series.paymentPlanStatus} xKey="status" yKey="count" emptyLabel={t("noPaymentPlansYet")} />
        </ReportSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title={t("sectionOverduePayments")}>
          <table className="a-table">
            <thead><tr><th>{t("colDeal")}</th><th>{t("colClient")}</th><th>{t("colDue")}</th><th style={{ textAlign: "right" }}>{t("colAmount")}</th></tr></thead>
            <tbody>
              {report.tables.overduePayments.map((payment) => (
                <tr key={payment.paymentId}>
                  <td><Link className="hover:underline" href={`/portal/management-x7k9/crm/deals/${payment.dealId}`}>{payment.dealNumber}</Link></td>
                  <td>{payment.client}</td>
                  <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>{money(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
        <ReportSection title={t("sectionOverdueClients")}>
          <table className="a-table">
            <thead><tr><th>{t("colClient")}</th><th>{t("colPayments")}</th><th style={{ textAlign: "right" }}>{t("colOverdue")}</th></tr></thead>
            <tbody>
              {report.tables.overdueClients.map((client) => (
                <tr key={client.clientId}>
                  <td>{client.client}</td>
                  <td>{client.payments}</td>
                  <td style={{ textAlign: "right" }}>{money(client.overdueAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
      </div>
    </div>
  );
}
