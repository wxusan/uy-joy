import Link from "next/link";
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

  const filters = parseReportFilters(searchParams);
  const [options, report] = await Promise.all([getReportFilterOptions(), getFinanceReport(filters, user)]);
  const marketingEnabled = roleHasPlatformPermission(user.role, "viewMarketingReports");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Finance report</h1>
        <p className="a-page-sub">Sold value, expected payments, paid cash, overdue clients, and cashflow.</p>
      </div>
      <ReportTabs active="finance" financeEnabled marketingEnabled={marketingEnabled} />
      <ReportControls filters={filters} options={options} exportHref={`/api/reports/payments.csv?${reportQueryString(filters)}`} showSource={false} />
      <MetricGrid
        metrics={[
          { label: "Total sold value", value: money(report.summary.totalSoldValue) },
          { label: "Expected this month", value: money(report.summary.expectedThisMonth) },
          { label: "Paid this month", value: money(report.summary.paidThisMonth) },
          { label: "Unpaid scheduled", value: money(report.summary.unpaidScheduled) },
          { label: "Overdue amount", value: money(report.summary.overdueAmount) },
          { label: "Overdue clients", value: report.summary.overdueClients },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Cashflow by month">
          <ReportStackedBarChart data={report.series.cashflow} xKey="month" keys={["expected", "paid"]} emptyLabel="No payment rows yet" />
        </ReportSection>
        <ReportSection title="Payment plan status">
          <ReportBarChart data={report.series.paymentPlanStatus} xKey="status" yKey="count" emptyLabel="No payment plans yet" />
        </ReportSection>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection title="Overdue payments">
          <table className="a-table">
            <thead><tr><th>Deal</th><th>Client</th><th>Due</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
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
        <ReportSection title="Overdue clients">
          <table className="a-table">
            <thead><tr><th>Client</th><th>Payments</th><th style={{ textAlign: "right" }}>Overdue</th></tr></thead>
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
