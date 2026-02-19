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
  createdAt: string;
}

export default function LeadsPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
      });
  }, []);

  const exportToCSV = () => {
    const headers = ["Name", "Phone", "Project", "Unit", "Status", "Date"];
    const rows = leads.map((l) => [
      l.name,
      l.phone,
      l.projectName || "-",
      l.unitNumber || "-",
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
    contacted: "bg-yellow-100 text-yellow-700",
    converted: "bg-green-100 text-green-700",
    closed: "bg-slate-100 text-slate-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("leadsInquiries")}</h1>
          <p className="text-slate-500 text-sm">{t("totalLeads", { count: leads.length })}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={leads.length === 0}
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || statusColors.new}`}>
                      {lead.status}
                    </span>
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
    </div>
  );
}
