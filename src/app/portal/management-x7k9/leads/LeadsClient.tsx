"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Search } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phone: string;
  projectId: string | null;
  projectName: string | null;
  unitNumber: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  assignedTo: string | null;
  nextFollowUp: string | null;
  createdAt: string;
}

const LEAD_STATUSES = [
  "new", "inCRM", "callback", "inProgress",
  "contacted", "converted", "notInterested", "closed",
] as const;

const LIMIT = 20;

interface Props {
  initialLeads: Lead[];
  initialTotal: number;
  initialPages: number;
}

const statusDotColor = (s: string) => {
  if (s === "new") return "var(--a-accent)";
  if (s === "converted") return "var(--a-success)";
  if (s === "notInterested" || s === "closed") return "var(--a-text-tertiary)";
  return "var(--a-warning)";
};

const SOURCE_LABEL: Record<string, string> = {
  kvartiralar: "Apartments",
  vizual: "Visual",
  "bosh-sahifa": "Homepage",
};

export default function LeadsClient({ initialLeads, initialTotal, initialPages }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [pages, setPages] = useState(initialPages);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadLeads = (p: number) => {
    setLoading(true);
    fetch(`/api/leads?page=${p}&limit=${LIMIT}`)
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
    const res = await fetch(`/api/leads?page=1&limit=10000`);
    const data = await res.json();
    const allLeads: Lead[] = data.data;
    const headers = ["Name", "Phone", "Project", "Unit", "Source", "Status", "Date"];
    const rows = allLeads.map((l) => [
      l.name, l.phone, l.projectName || "-", l.unitNumber || "-",
      l.source || "-", l.status,
      new Date(l.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
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
            placeholder="Search name, phone, project…"
            className="a-input"
            style={{ height: 30, paddingLeft: 28 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="a-input"
          style={{ height: 30, width: "auto", padding: "0 8px" }}
        >
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
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
          {leads.length === 0 ? t("noLeadsYet") : "No leads match your filter."}
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
                <th>Source</th>
                <th>{t("status")}</th>
                <th style={{ textAlign: "right" }}>{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 500 }}>{lead.name}</td>
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
                    {lead.unitNumber || "—"}
                  </td>
                  <td style={{ color: "var(--a-text-secondary)" }}>
                    {lead.source ? SOURCE_LABEL[lead.source] || lead.source : "—"}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="a-dot"
                        style={{ color: statusDotColor(lead.status) }}
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
            Page {page} of {pages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="a-btn"
            >
              ← Prev
            </button>
            <button
              onClick={() => changePage(Math.min(pages, page + 1))}
              disabled={page >= pages}
              className="a-btn"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
