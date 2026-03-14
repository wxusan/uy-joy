import Link from "next/link";
import { getTranslations } from "next-intl/server";
import StatsCard from "@/components/StatsCard";
import prisma from "@/lib/prisma";
import { Home, CheckCircle2, Clock, XCircle, MessageSquare, ImageIcon, HelpCircle, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const t = await getTranslations("admin");

  const [total, available, reserved, sold, leadsTotal, leadsNew] = await Promise.all([
    prisma.unit.count(),
    prisma.unit.count({ where: { status: "available" } }),
    prisma.unit.count({ where: { status: "reserved" } }),
    prisma.unit.count({ where: { status: "sold" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "new" } }),
  ]);

  const quickLinks = [
    {
      title: t("leadsInquiries"),
      sub: `${leadsNew} yangi • ${leadsTotal} jami`,
      href: "/portal/management-x7k9/leads",
      icon: <MessageSquare className="w-5 h-5" />,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      badge: leadsNew > 0 ? leadsNew : null,
    },
    {
      title: "Loyiha",
      sub: "Binolar, qavatlar va xonadonlar",
      href: "/portal/management-x7k9/projects",
      icon: <Building2 className="w-5 h-5" />,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      badge: null,
    },
    {
      title: "Bosh sahifa info",
      sub: "Loyiha ma'lumotlari va rasmlar",
      href: "/portal/management-x7k9/hero-images",
      icon: <ImageIcon className="w-5 h-5" />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      badge: null,
    },
    {
      title: "FAQ",
      sub: "Ko'p beriladigan savollar",
      href: "/portal/management-x7k9/faqs",
      icon: <HelpCircle className="w-5 h-5" />,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      badge: null,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">UyJoy Admin</h1>
        <p className="text-slate-500 text-sm">{t("dashboard")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t("totalUnits")}
          value={total}
          color="text-slate-900"
          bgColor="bg-slate-100"
          icon={<Home className="w-4 h-4" />}
        />
        <StatsCard
          title={t("available")}
          value={available}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatsCard
          title={t("reserved")}
          value={reserved}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatsCard
          title={t("sold")}
          value={sold}
          color="text-red-500"
          bgColor="bg-red-100"
          icon={<XCircle className="w-4 h-4" />}
        />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Tezkor kirish</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                  <span className={item.iconColor}>{item.icon}</span>
                </div>
                {item.badge != null && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm group-hover:text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
              </div>
              <p className="text-xs text-slate-400 group-hover:text-emerald-600 transition-colors font-medium">
                Ochish →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
