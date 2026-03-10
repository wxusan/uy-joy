"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useState, useTransition } from "react";
import { locales, localeNames, Locale } from "@/lib/locales";
import { BarChart3, Building2, Users, Activity } from "lucide-react";

const navItemsConfig = [
  { href: "/portal/management-x7k9", labelKey: "dashboard", icon: "dashboard" },
  { href: "/portal/management-x7k9/projects", labelKey: "projects", icon: "projects" },
  { href: "/portal/management-x7k9/users", labelKey: "users", icon: "users", superadminOnly: true },
  { href: "/portal/management-x7k9/analytics", labelKey: "analytics", icon: "analytics", developerOnly: true },
];

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <BarChart3 className="w-4 h-4" />,
  projects: <Building2 className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  analytics: <Activity className="w-4 h-4" />,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50
        w-56 bg-slate-900 text-slate-400 h-screen flex flex-col overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      {/* Logo + mobile close */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <Link
          href="/portal/management-x7k9"
          onClick={onClose}
          className="px-6 py-4 text-lg font-bold text-white block flex-1"
        >
          UyJoy Admin
        </Link>
        <button
          onClick={onClose}
          className="md:hidden px-4 py-4 text-slate-400 hover:text-white"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {navItemsConfig
          .filter((item) => {
            if (item.superadminOnly && role !== "superadmin" && role !== "developer") return false;
            if (item.developerOnly && role !== "developer") return false;
            return true;
          })
          .map((item) => {
            const isActive =
              item.href === "/portal/management-x7k9"
                ? pathname === "/portal/management-x7k9"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 pl-3 pr-4 py-2.5 mx-2 rounded-lg text-sm transition-all border-l-2 ${isActive
                  ? "border-amber-400 bg-slate-800 text-white font-medium"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
              >
                <span>{iconMap[item.icon]}</span>
                {t(item.labelKey)}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4 space-y-3">
        <select
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value)}
          disabled={isPending}
          className="w-full bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded border border-slate-700 focus:outline-none cursor-pointer disabled:opacity-50"
        >
          {locales.map((loc) => (
            <option key={loc} value={loc} className="bg-slate-800">
              {localeNames[loc as Locale]}
            </option>
          ))}
        </select>

        <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/portal/management-x7k9/login" })}
          className="w-full text-left text-xs text-slate-500 hover:text-white py-1 transition"
        >
          {tc("signOut")}
        </button>
      </div>
    </aside>
  );
}
