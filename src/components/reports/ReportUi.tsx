import Link from "next/link";
import type React from "react";
import { Download, RefreshCw } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReportFilters } from "@/lib/reports";
import { formatMoney } from "@/lib/reports";

type FilterOptions = {
  projects: { id: string; name: string }[];
  buildings: { id: string; name: string; projectId: string }[];
  agents: { id: string; label: string; role: string }[];
  sources: { key: string; label: string }[];
};

type Metric = {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function qs(base: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${base}?${search.toString()}`;
}

export async function ReportTabs({
  active,
  financeEnabled,
  marketingEnabled,
}: {
  active: string;
  financeEnabled: boolean;
  marketingEnabled: boolean;
}) {
  const t = await getTranslations("admin");
  const tabs = [
    { key: "overview", label: t("reportTabOverview"), href: "/portal/management-x7k9/reports" },
    { key: "sales", label: t("reportTabSales"), href: "/portal/management-x7k9/reports/sales" },
    { key: "agents", label: t("reportTabAgents"), href: "/portal/management-x7k9/reports/agents" },
    { key: "inventory", label: t("reportTabInventory"), href: "/portal/management-x7k9/reports/inventory" },
    marketingEnabled ? { key: "marketing", label: t("reportTabMarketing"), href: "/portal/management-x7k9/reports/marketing" } : null,
    financeEnabled ? { key: "finance", label: t("reportTabFinance"), href: "/portal/management-x7k9/reports/finance" } : null,
  ].filter((tab): tab is { key: string; label: string; href: string } => Boolean(tab));

  return (
    <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: "var(--a-border)" }}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className="px-3 py-2 text-[13px] font-medium"
          style={{
            color: active === tab.key ? "var(--a-text)" : "var(--a-text-secondary)",
            borderBottom: active === tab.key ? "2px solid var(--a-text)" : "2px solid transparent",
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export async function ReportControls({
  filters,
  options,
  exportHref,
  showAgent = true,
  showSource = true,
}: {
  filters: ReportFilters;
  options: FilterOptions;
  exportHref?: string;
  showAgent?: boolean;
  showSource?: boolean;
}) {
  const t = await getTranslations("admin");
  const last7 = new Date(filters.to);
  last7.setDate(last7.getDate() - 7);
  const last30 = new Date(filters.to);
  last30.setDate(last30.getDate() - 30);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  return (
    <div className="a-card p-3">
      <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
        <Link className="a-btn subtle" href={qs("", { from: dateInputValue(today), to: dateInputValue(today) })}>{t("reportRangeToday")}</Link>
        <Link className="a-btn subtle" href={qs("", { from: dateInputValue(yesterday), to: dateInputValue(yesterday) })}>{t("reportRangeYesterday")}</Link>
        <Link className="a-btn subtle" href={qs("", { from: dateInputValue(last7), to: dateInputValue(filters.to) })}>{t("reportRangeLast7")}</Link>
        <Link className="a-btn subtle" href={qs("", { from: dateInputValue(last30), to: dateInputValue(filters.to) })}>{t("reportRangeLast30")}</Link>
        <Link className="a-btn subtle" href={qs("", { from: dateInputValue(monthStart), to: dateInputValue(today) })}>{t("reportRangeThisMonth")}</Link>
        <Link className="a-btn subtle" href={qs("", { from: dateInputValue(lastMonthStart), to: dateInputValue(lastMonthEnd) })}>{t("reportRangeLastMonth")}</Link>
      </div>
      <form className="grid gap-2 md:grid-cols-6" action="">
        <input className="a-input" type="date" name="from" defaultValue={dateInputValue(filters.from)} />
        <input className="a-input" type="date" name="to" defaultValue={dateInputValue(filters.to)} />
        <select className="a-input" name="projectId" defaultValue={filters.projectId || ""}>
          <option value="">{t("filterAllProjects")}</option>
          {options.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select className="a-input" name="buildingId" defaultValue={filters.buildingId || ""}>
          <option value="">{t("filterAllBuildings")}</option>
          {options.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
        </select>
        {showAgent ? (
          <select className="a-input" name="agentId" defaultValue={filters.agentId || ""}>
            <option value="">{t("filterAllAgents")}</option>
            {options.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.label}</option>)}
          </select>
        ) : <input type="hidden" name="agentId" value="" />}
        {showSource ? (
          <select className="a-input" name="source" defaultValue={filters.source || ""}>
            <option value="">{t("filterAllSources")}</option>
            {options.sources.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}
          </select>
        ) : <input type="hidden" name="source" value="" />}
        <div className="flex gap-2 md:col-span-6">
          <button className="a-btn" type="submit">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("reportRefresh")}
          </button>
          {exportHref ? (
            <Link className="a-btn subtle" href={exportHref}>
              <Download className="h-3.5 w-3.5" />
              {t("reportExportCsv")}
            </Link>
          ) : null}
        </div>
      </form>
      {filters.warnings.length > 0 ? (
        <div className="mt-2 text-[12px]" style={{ color: "var(--a-warning)" }}>
          {filters.warnings.join(" ")}
        </div>
      ) : null}
    </div>
  );
}

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const inner = (
          <>
            <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{metric.label}</div>
            <div className="mt-1 text-[26px] font-semibold tabular-nums" style={{ color: "var(--a-text)" }}>{metric.value}</div>
            {metric.sub ? <div className="mt-1 text-[12px]" style={{ color: "var(--a-text-secondary)" }}>{metric.sub}</div> : null}
          </>
        );
        return metric.href ? (
          <Link key={metric.label} href={metric.href} className="a-card p-4 transition hover:bg-[var(--a-bg-hover)]">
            {inner}
          </Link>
        ) : (
          <div key={metric.label} className="a-card p-4">{inner}</div>
        );
      })}
    </div>
  );
}

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="a-card p-4">
      <h2 className="mb-3 text-[15px] font-semibold" style={{ color: "var(--a-text)" }}>{title}</h2>
      {children}
    </section>
  );
}

export async function EmptyTable({ label }: { label?: string }) {
  const t = await getTranslations("admin");
  return <div className="py-8 text-center text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{label ?? t("noRowsForPeriod")}</div>;
}

export function money(value: number | null | undefined) {
  return formatMoney(value || 0, "UZS");
}
