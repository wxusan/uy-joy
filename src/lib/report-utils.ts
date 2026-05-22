export function parseDateRange(searchParams: URLSearchParams) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : defaultFrom;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : now;
  return { from, to };
}

export function previousPeriod(from: Date, to: Date) {
  const len = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - len), to: new Date(from) };
}

export function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  // Formula injection prevention
  if (/^[=+\-@\t\r]/.test(s)) return `"'${s.replace(/"/g, '""')}"`;
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(fields: unknown[]): string {
  return fields.map(csvEscape).join(",");
}

export const CSV_BOM = "﻿";
