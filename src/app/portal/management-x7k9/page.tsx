"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import StatsCard from "@/components/StatsCard";

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, sold: 0, leads: 0 });

  useEffect(() => {
    // Fetch unit stats
    fetch("/api/units")
      .then((r) => r.json())
      .then((units: { status: string }[]) => {
        setStats((prev) => ({
          ...prev,
          total: units.length,
          available: units.filter((u) => u.status === "available").length,
          reserved: units.filter((u) => u.status === "reserved").length,
          sold: units.filter((u) => u.status === "sold").length,
        }));
      });

    // Fetch leads count
    fetch("/api/leads")
      .then((r) => r.json())
      .then((leads: { id: string }[]) => {
        setStats((prev) => ({ ...prev, leads: leads.length }));
      });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">UyJoy Admin</h1>
        <p className="text-slate-500 text-sm">{t("dashboard")}</p>
      </div>

      {/* Unit Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={t("totalUnits")} value={stats.total} />
        <StatsCard title={t("available")} value={stats.available} color="text-emerald-600" />
        <StatsCard title={t("reserved")} value={stats.reserved} color="text-yellow-600" />
        <StatsCard title={t("sold")} value={stats.sold} color="text-red-600" />
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-700 mb-2">{t("leadsInquiries")}</h3>
          <p className="text-3xl font-bold text-emerald-600 mb-1">{stats.leads}</p>
          <p className="text-xs text-slate-500 mb-4">{t("contactFormSubmissions")}</p>
          <Link
            href="/portal/management-x7k9/leads"
            className="inline-block bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
          >
            {t("viewAllLeads")} →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-700 mb-2">Bosh sahifa info</h3>
          <p className="text-sm text-slate-500 mb-4">Loyiha ma&apos;lumotlari va bosh sahifa rasmlari</p>
          <Link
            href="/portal/management-x7k9/hero-images"
            className="inline-block bg-navy-900 text-white text-xs px-4 py-2 rounded-lg hover:bg-navy-800 transition"
          >
            Boshqarish →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-700 mb-2">FAQ</h3>
          <p className="text-sm text-slate-500 mb-4">Ko&apos;p beriladigan savollarni boshqarish</p>
          <Link
            href="/portal/management-x7k9/faqs"
            className="inline-block bg-navy-900 text-white text-xs px-4 py-2 rounded-lg hover:bg-navy-800 transition"
          >
            Savollar →
          </Link>
        </div>
      </div>
    </div>
  );
}
