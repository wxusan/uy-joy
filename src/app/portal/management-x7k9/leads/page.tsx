"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Lead {
  id: string;
  name: string;
  phone: string;
  projectId: string | null;
  projectName: string | null;
  unitNumber: string | null;
  status: string;
  source: string | null;
  createdAt: string;
}

const LEAD_STATUSES = [
  "new",
  "inCRM",
  "callback",
  "inProgress",
  "contacted",
  "converted",
  "notInterested",
  "closed",
] as const;

export default function LeadsPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

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

  useEffect(() => {
    loadLeads(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadLeads(page);
  };

  const exportToCSV = async () => {
    // Fetch all leads for export
    const res = await fetch(`/api/leads?page=1&limit=10000`);
    const data = await res.json();
    const allLeads: Lead[] = data.data;
    const headers = ["Name", "Phone", "Project", "Unit", "Source", "Status", "Date"];
    const rows = allLeads.map((l) => [
      l.name,
      l.phone,
      l.projectName || "-",
      l.unitNumber || "-",
      l.source || "-",
      l.status,
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

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    inCRM: "bg-purple-100 text-purple-700",
    callback: "bg-orange-100 text-orange-700",
    inProgress: "bg-cyan-100 text-cyan-700",
    contacted: "bg-yellow-100 text-yellow-700",
    converted: "bg-green-100 text-green-700",
    notInterested: "bg-red-100 text-red-700",
    closed: "bg-slate-100 text-slate-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("leadsInquiries")}</h1>
          <p className="text-slate-500 text-sm">{t("totalLeads", { count: total })}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={total === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-300 transition"
          >
            📥 {t("exportCSV")}
          </button>
          <Link
            href="/portal/management-x7k9"
            className="text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            ← {t("backToDashboard")}
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">{tc("loading")}</p>
      ) : leads.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center">
          <span className="text-5xl block mb-4">📭</span>
          <p className="text-slate-500">{t("noLeadsYet")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-slate-600">{t("name")}</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("phone")}</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("project")}</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("unit")}</th>
                <th className="text-left p-4 font-medium text-slate-600">Manba</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("status")}</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium">{lead.name}</td>
                  <td className="p-4">
                    <a href={`tel:${lead.phone}`} className="text-emerald-600 hover:underline">
                      {lead.phone}
                    </a>
                  </td>
                  <td className="p-4 text-slate-600">{lead.projectName || "-"}</td>
                  <td className="p-4 text-slate-600">{lead.unitNumber || "-"}</td>
                  <td className="p-4">
                    {lead.source === "kvartiralar" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Kvartiralar</span>
                    )}
                    {lead.source === "vizual" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Vizual</span>
                    )}
                    {lead.source === "bosh-sahifa" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Bosh sahifa</span>
                    )}
                    {!lead.source && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[lead.status] || statusColors.new}`}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {pages} — {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
