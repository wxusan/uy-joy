"use client";

import { useState } from "react";
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

export default function LeadsClient({ initialLeads, initialTotal, initialPages }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [pages, setPages] = useState(initialPages);

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

  const updateLead = async (leadId: string, patch: Partial<Pick<Lead, "status" | "assignedTo" | "nextFollowUp">>) => {
    await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadLeads(page);
  };

  const exportToCSV = async () => {
    const res = await fetch(`/api/leads?page=1&limit=10000`);
    const data = await res.json();
    const allLeads: Lead[] = data.data;
    const headers = ["Name", "Phone", "Project", "Unit", "Source", "Status", "Assigned To", "Follow-up", "Date"];
    const rows = allLeads.map((l) => [
      l.name, l.phone, l.projectName || "-", l.unitNumber || "-",
      l.source || "-", l.status, l.assignedTo || "-",
      l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString() : "-",
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

  const isOverdue = (followUp: string | null) => followUp ? new Date(followUp) < new Date() : false;
  const today = new Date().toISOString().split("T")[0];

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
          <Link href="/portal/management-x7k9" className="text-sm text-slate-500 hover:text-slate-700 py-2">
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
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-slate-600">{t("name")}</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("phone")}</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("project")}</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("unit")}</th>
                <th className="text-left p-4 font-medium text-slate-600">Manba</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("status")}</th>
                <th className="text-left p-4 font-medium text-slate-600">Mas&apos;ul</th>
                <th className="text-left p-4 font-medium text-slate-600">Qo&apos;ng&apos;iroq</th>
                <th className="text-left p-4 font-medium text-slate-600">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const overdue = isOverdue(lead.nextFollowUp);
                return (
                  <tr key={lead.id} className={`border-b hover:bg-slate-50 ${overdue ? "bg-red-50/40" : ""}`}>
                    <td className="p-4 font-medium">{lead.name}</td>
                    <td className="p-4">
                      <a href={`tel:${lead.phone}`} className="text-emerald-600 hover:underline">{lead.phone}</a>
                    </td>
                    <td className="p-4 text-slate-600">{lead.projectName || "-"}</td>
                    <td className="p-4 text-slate-600">{lead.unitNumber || "-"}</td>
                    <td className="p-4">
                      {lead.source === "kvartiralar" && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Kvartiralar</span>}
                      {lead.source === "vizual" && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Vizual</span>}
                      {lead.source === "bosh-sahifa" && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Bosh sahifa</span>}
                      {!lead.source && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500">—</span>}
                    </td>
                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[lead.status] || statusColors.new}`}
                      >
                        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        defaultValue={lead.assignedTo || ""}
                        placeholder="Kim?"
                        className="w-24 text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-transparent"
                        onBlur={(e) => {
                          if (e.target.value !== (lead.assignedTo || "")) {
                            updateLead(lead.id, { assignedTo: e.target.value || null });
                          }
                        }}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {overdue && <span className="text-red-500 text-xs font-bold" title="Muddati o'tgan">!</span>}
                        <input
                          type="date"
                          defaultValue={lead.nextFollowUp ? lead.nextFollowUp.split("T")[0] : ""}
                          min={today}
                          className={`text-xs px-2 py-1 border rounded focus:outline-none focus:border-indigo-400 bg-transparent ${overdue ? "border-red-300 text-red-600" : "border-slate-200"}`}
                          onChange={(e) => updateLead(lead.id, { nextFollowUp: e.target.value || null })}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-sm whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Page {page} of {pages} — {total} total</p>
          <div className="flex gap-2">
            <button onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition">
              ← Prev
            </button>
            <button onClick={() => changePage(Math.min(pages, page + 1))} disabled={page >= pages}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
