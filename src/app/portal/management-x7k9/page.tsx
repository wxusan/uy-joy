import Link from "next/link";
import { getTranslations } from "next-intl/server";
import StatsCard from "@/components/StatsCard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const t = await getTranslations("admin");

  const [total, available, reserved, sold, leads] = await Promise.all([
    prisma.unit.count(),
    prisma.unit.count({ where: { status: "available" } }),
    prisma.unit.count({ where: { status: "reserved" } }),
    prisma.unit.count({ where: { status: "sold" } }),
    prisma.lead.count(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">UyJoy Admin</h1>
        <p className="text-slate-500 text-sm">{t("dashboard")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={t("totalUnits")} value={total} />
        <StatsCard title={t("available")} value={available} color="text-emerald-600" />
        <StatsCard title={t("reserved")} value={reserved} color="text-yellow-600" />
        <StatsCard title={t("sold")} value={sold} color="text-red-600" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-700 mb-2">{t("leadsInquiries")}</h3>
          <p className="text-3xl font-bold text-emerald-600 mb-1">{leads}</p>
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
