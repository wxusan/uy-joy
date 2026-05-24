"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";

type Datum = Record<string, string | number | null | undefined>;

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#64748b"];

function EmptyChart({ label }: { label?: string }) {
  const t = useTranslations("admin");
  return (
    <div className="grid h-[240px] place-items-center text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
      {label ?? t("noData")}
    </div>
  );
}

function hasRows(data: Datum[]) {
  return data.some((row) => Object.values(row).some((value) => typeof value === "number" && value > 0));
}

export function ReportBarChart({
  data,
  xKey,
  yKey,
  emptyLabel,
}: {
  data: Datum[];
  xKey: string;
  yKey: string;
  emptyLabel?: string;
}) {
  if (!hasRows(data)) return <EmptyChart label={emptyLabel} />;

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--a-text-tertiary)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--a-text-tertiary)" />
          <Tooltip />
          <Bar dataKey={yKey} fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportLineChart({
  data,
  xKey,
  yKey,
  emptyLabel,
}: {
  data: Datum[];
  xKey: string;
  yKey: string;
  emptyLabel?: string;
}) {
  if (!hasRows(data)) return <EmptyChart label={emptyLabel} />;

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--a-text-tertiary)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--a-text-tertiary)" />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportStackedBarChart({
  data,
  xKey,
  keys,
  keyLabels,
  emptyLabel,
}: {
  data: Datum[];
  xKey: string;
  keys: string[];
  keyLabels?: Record<string, string>;
  emptyLabel?: string;
}) {
  if (!hasRows(data)) return <EmptyChart label={emptyLabel} />;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--a-text-tertiary)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--a-text-tertiary)" />
          <Tooltip />
          {keys.map((key, index) => (
            <Bar key={key} dataKey={key} name={keyLabels?.[key] ?? key} stackId="total" fill={COLORS[index % COLORS.length]} radius={index === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportPieChart({
  data,
  nameKey,
  valueKey,
  emptyLabel,
}: {
  data: Datum[];
  nameKey: string;
  valueKey: string;
  emptyLabel?: string;
}) {
  if (!hasRows(data)) return <EmptyChart label={emptyLabel} />;

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={48} outerRadius={86} paddingAngle={2}>
            {data.map((row, index) => (
              <Cell key={`${row[nameKey]}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
