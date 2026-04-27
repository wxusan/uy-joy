"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useTransition } from "react";
import { locales, localeNames, Locale } from "@/lib/locales";
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Image as ImageIcon,
  HelpCircle,
  Users,
  Activity,
  LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  labelKey?: string;
  label?: string;
  icon: React.ReactNode;
  superadminOnly?: boolean;
  developerOnly?: boolean;
  exact?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/portal/management-x7k9",
        labelKey: "dashboard",
        icon: <LayoutDashboard className="w-[14px] h-[14px]" />,
        exact: true,
      },
      {
        href: "/portal/management-x7k9/leads",
        labelKey: "leads",
        icon: <MessageSquare className="w-[14px] h-[14px]" />,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/portal/management-x7k9/projects",
        labelKey: "projects",
        icon: <Building2 className="w-[14px] h-[14px]" />,
      },
      {
        href: "/portal/management-x7k9/hero-images",
        label: "Homepage",
        icon: <ImageIcon className="w-[14px] h-[14px]" />,
      },
      {
        href: "/portal/management-x7k9/faqs",
        label: "FAQ",
        icon: <HelpCircle className="w-[14px] h-[14px]" />,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/portal/management-x7k9/users",
        labelKey: "users",
        icon: <Users className="w-[14px] h-[14px]" />,
        superadminOnly: true,
      },
      {
        href: "/portal/management-x7k9/analytics",
        labelKey: "analytics",
        icon: <Activity className="w-[14px] h-[14px]" />,
        developerOnly: true,
      },
    ],
  },
];

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
    startTransition(() => router.refresh());
  };

  const isItemVisible = (item: NavItem) => {
    if (item.superadminOnly && role !== "superadmin" && role !== "developer") return false;
    if (item.developerOnly && role !== "developer") return false;
    return true;
  };

  const isItemActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const userInitial = (session?.user?.name || session?.user?.email || "A")
    .charAt(0)
    .toUpperCase();

  return (
    <aside
      className={`
        a-side fixed inset-y-0 left-0 z-50 w-[232px]
        flex flex-col h-screen overflow-y-auto
        transition-transform duration-200 ease-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-semibold text-white"
          style={{ background: "var(--a-text)" }}
        >
          U
        </div>
        <Link
          href="/portal/management-x7k9"
          onClick={onClose}
          className="text-[13px] font-semibold flex-1 truncate"
          style={{ color: "var(--a-text)" }}
        >
          UyJoy
        </Link>
        <button
          onClick={onClose}
          className="md:hidden text-[16px] leading-none px-1"
          style={{ color: "var(--a-text-secondary)" }}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <div className="a-divider mx-3" />

      {/* Nav */}
      <nav className="flex-1 py-2">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-2">
              <div className="a-nav-group">{group.label}</div>
              <div className="flex flex-col gap-[1px]">
                {visibleItems.map((item) => {
                  const active = isItemActive(item);
                  const label = item.labelKey ? t(item.labelKey) : item.label;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`a-nav-item ${active ? "active" : ""}`}
                    >
                      <span
                        style={{
                          color: active ? "var(--a-text)" : "var(--a-text-tertiary)",
                          display: "inline-flex",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer: language + user */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--a-border)" }}>
        <select
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value)}
          disabled={isPending}
          className="a-input mb-2"
          style={{ height: 26, fontSize: 12, padding: "0 8px" }}
        >
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {localeNames[loc as Locale]}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
            style={{
              background: "var(--a-bg-active)",
              color: "var(--a-text)",
            }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[12px] truncate"
              style={{ color: "var(--a-text)" }}
              title={session?.user?.email || ""}
            >
              {session?.user?.name || session?.user?.email}
            </div>
            <div className="text-[11px]" style={{ color: "var(--a-text-tertiary)" }}>
              {role || "user"}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/portal/management-x7k9/login" })}
            className="p-1 rounded hover:bg-[var(--a-bg-hover)]"
            title={tc("signOut")}
            aria-label={tc("signOut")}
          >
            <LogOut className="w-[14px] h-[14px]" style={{ color: "var(--a-text-tertiary)" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
