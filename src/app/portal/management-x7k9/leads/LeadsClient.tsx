"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Download, Search } from "lucide-react";
import { getLeadStatusTone, LEAD_STATUSES } from "@/lib/lead-status";

interface Lead {
  id: string;
  name: string;
  phone: string;
  projectId: string | null;
  projectName: string | null;
  unitId: string | null;
  unitNumber: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  assignedTo: string | null;
  nextFollowUp: string | null;
  unitNumberSnapshot: string | null;
  unitAreaSnapshot: number | null;
  unitRoomsSnapshot: number | null;
  unitPriceSnapshot: number | null;
  buildingNameSnapshot: string | null;
  floorNumberSnapshot: number | null;
  createdAt: string;
  updatedAt?: string;
  nextActionAt?: string | null;
  client?: { id: string; fullName: string; phone: string } | null;
  assignedToUser?: { id: string; name: string | null; email: string | null } | null;
}

const LIMIT = 20;

interface Props {
  initialLeads: Lead[];
  initialTotal: number;
  initialPages: number;
  emptyMessage?: string | null;
}

function escapeCsvValue(value: unknown) {
  const raw = String(value ?? "");
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export default function LeadsClient({ initialLeads, initialTotal, initialPages, emptyMessage }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  const SOURCE_LABEL: Record<string, string> = {
    public_page: t("sourceBoshSahifa"),
    contact_form: t("sourceBoshSahifa"),
    apartment_page: t("sourceKvartiralar"),
    visual_explorer: t("sourceVizual"),
    floating_contact: "Floating contact",
    waitlist: "Waitlist",
    campaign: "Campaign",
    manual: "Manual",
    kvartiralar: t("sourceKvartiralar"),
    vizual: t("sourceVizual"),
    "bosh-sahifa": t("sourceBoshSahifa"),
  };
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [pages, setPages] = useState(initialPages);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const buildLeadUrl = (p: number, nextQuery = query, nextStatus = statusFilter, limit = LIMIT) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    const q = nextQuery.trim();
    if (q) params.set("q", q);
    if (nextStatus !== "all") params.set("status", nextStatus);
    return `/api/leads?${params.toString()}`;
  };

  const loadLeads = (p: number, nextQuery = query, nextStatus = statusFilter) => {
    setLoading(true);
    fetch(buildLeadUrl(p, nextQuery, nextStatus))
      .then((res) => res.json())
      .then((data) => {
        setLeads(data.data);
        setTotal(data.total);
        setPages(data.pages);
        setLoading(false);
      });
  };

  const changePage = (p: number) => {
    setPage(p);
    loadLeads(p);
  };

  const applyFilters = () => {
    setPage(1);
    loadLeads(1);
  };

  const updateLead = async (leadId: string, patch: Partial<Pick<Lead, "status">>) => {
    const previous = leads.find((l) => l.id === leadId);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok && previous) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? previous : l)));
    }
  };

  const exportToCSV = async () => {
    const res = await fetch(buildLeadUrl(1, query, statusFilter, 10000));
    const data = await res.json();
    const allLeads: Lead[] = data.data;
    const headers = [
      t("csvHeaderName"),
      t("csvHeaderPhone"),
      t("csvHeaderProject"),
      t("csvHeaderBuilding"),
      t("csvHeaderFloor"),
      t("csvHeaderUnit"),
      t("csvHeaderRooms"),
      t("csvHeaderArea"),
      t("csvHeaderPrice"),
      t("csvHeaderSource"),
      t("csvHeaderStatus"),
      t("csvHeaderDate"),
    ];
    const rows = allLeads.map((l) => [
      l.name,
      l.phone,
      l.projectName || "-",
      l.buildingNameSnapshot || "-",
      l.floorNumberSnapshot ?? "-",
      l.unitNumberSnapshot || l.unitNumber || "-",
      l.unitRoomsSnapshot ?? "-",
      l.unitAreaSnapshot ?? "-",
      l.unitPriceSnapshot ?? "-",
      l.source || "-",
      l.status,
      new Date(l.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.projectName || "").toLowerCase().includes(q) ||
        (l.unitNumber || "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, statusFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{t("leadsInquiries")}</h1>
          <p className="a-page-sub">{t("totalLeads", { count: total })}</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={total === 0}
          className="a-btn"
        >
          <Download className="w-3.5 h-3.5" />
          {t("exportCSV")}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--a-text-tertiary)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchLeadPlaceholder")}
            className="a-input"
            style={{ height: 30, paddingLeft: 28 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
            loadLeads(1, query, e.target.value);
          }}
          className="a-input"
          style={{ height: 30, width: "auto", padding: "0 8px" }}
        >
          <option value="all">{t("allStatuses")}</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
        <button onClick={applyFilters} className="a-btn" disabled={loading}>
          {tc("search")}
        </button>
      </div>

      {/* Table or empty */}
      {loading ? (
        <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
          {tc("loading")}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className="a-card text-center py-12 text-[13px]"
          style={{ color: "var(--a-text-tertiary)" }}
        >
          {leads.length === 0 ? emptyMessage || t("noLeadsYet") : t("noLeadsMatch")}
        </div>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[820px]">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("phone")}</th>
                <th>{t("project")}</th>
                <th>{t("unit")}</th>
                <th>{t("source")}</th>
                <th>{t("status")}</th>
                <th style={{ textAlign: "right" }}>{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 500 }}>
                    <Link className="hover:underline" href={`/portal/management-x7k9/crm/leads/${lead.id}`}>
                      {lead.client?.fullName || lead.name}
                    </Link>
                    {lead.assignedToUser ? (
                      <div className="text-[11px]" style={{ color: "var(--a-text-tertiary)" }}>
                        {lead.assignedToUser.name || lead.assignedToUser.email}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <a
                      href={`tel:${lead.phone}`}
                      style={{ color: "var(--a-text)" }}
                      className="hover:underline"
                    >
                      {lead.phone}
                    </a>
                  </td>
                  <td style={{ color: "var(--a-text-secondary)" }}>
                    {lead.projectName || "—"}
                  </td>
                  <td style={{ color: "var(--a-text-secondary)" }}>
                    {(() => {
                      const live = lead.unitNumber;
                      const snap = lead.unitNumberSnapshot;
                      // No unit at all
                      if (!live && !snap) return "—";
                      // Prefer the snapshot (it was captured server-side) but
                      // mark it explicitly when the lead has no live unitId
                      // reference (i.e. the underlying unit may have been deleted).
                      const label = snap || live || "—";
                      const subtitle: string[] = [];
                      if (lead.buildingNameSnapshot) subtitle.push(lead.buildingNameSnapshot);
                      if (lead.floorNumberSnapshot != null)
                        subtitle.push(`F${lead.floorNumberSnapshot}`);
                      if (lead.unitRoomsSnapshot != null)
                        subtitle.push(`${lead.unitRoomsSnapshot}R`);
                      if (lead.unitAreaSnapshot != null)
                        subtitle.push(`${lead.unitAreaSnapshot}m²`);
                      const showSnapshotTag = !lead.unitId && !!snap;
                      return (
                        <div className="flex flex-col">
                          <span>
                            {label}
                            {showSnapshotTag ? (
                              <span
                                className="ml-1 text-[11px]"
                                style={{ color: "var(--a-text-tertiary)" }}
                              >
                                ({t("snapshot")})
                              </span>
                            ) : null}
                          </span>
                          {subtitle.length > 0 && (
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--a-text-tertiary)" }}
                            >
                              {subtitle.join(" · ")}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ color: "var(--a-text-secondary)" }}>
                    {lead.source ? SOURCE_LABEL[lead.source] || lead.source : "—"}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="a-dot"
                        style={{ color: getLeadStatusTone(lead.status) }}
                      />
                      <select
                        value={lead.status}
                        onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                        className="a-input"
                        style={{
                          height: 24,
                          padding: "0 6px",
                          fontSize: 12,
                          width: "auto",
                          background: "transparent",
                          border: "1px solid transparent",
                        }}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: "var(--a-text-tertiary)",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(lead.createdAt).toLocaleDateString()}{" "}
                    {new Date(lead.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
            {t("pageStatus", { page, pages, total })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="a-btn"
            >
              {t("prev")}
            </button>
            <button
              onClick={() => changePage(Math.min(pages, page + 1))}
              disabled={page >= pages}
              className="a-btn"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
