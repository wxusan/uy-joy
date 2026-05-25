"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useTransition } from "react";
import { locales, localeNames, Locale } from "@/lib/locales";
import { platformRoleLabel } from "@/lib/crm-labels";
import {
  type FeatureEntitlement,
  type PlatformFeature,
  type PlatformPermission,
  type PlatformRole,
  featureEntitlementIsEnabled,
  normalizePlatformRole,
  roleCanSeeNavigationAudience,
  roleHasPlatformPermission,
} from "@/lib/platform-plans";
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Home,
  HelpCircle,
  Images,
  Users,
  Activity,
  LogOut,
  KanbanSquare,
  ClipboardList,
  Contact,
  BarChart3,
  UserRoundCheck,
  Handshake,
  FileText,
  Globe2,
  Tags,
  Settings,
} from "lucide-react";

type NavItem = {
  href: string;
  labelKey?: string;
  label?: string;
  icon: React.ReactNode;
  permission?: PlatformPermission;
  feature?: PlatformFeature;
  exact?: boolean;
  audiences?: PlatformRole[];
};

type NavGroup = { labelKey: string; items: NavItem[] };
type SessionUserWithRole = { role?: string };

const navGroups: NavGroup[] = [
  {
    labelKey: "overview",
    items: [
      {
        href: "/portal/management-x7k9",
        labelKey: "dashboard",
        icon: <LayoutDashboard className="w-[14px] h-[14px]" />,
        exact: true,
      },
      {
        href: "/portal/management-x7k9/crm",
        labelKey: "crm",
        icon: <Contact className="w-[14px] h-[14px]" />,
        permission: "viewLeads",
        feature: "crm",
        audiences: ["sales_director", "sales_agent", "external_agent"],
      },
      {
        href: "/portal/management-x7k9/crm/leads",
        labelKey: "leads",
        icon: <MessageSquare className="w-[14px] h-[14px]" />,
        permission: "viewLeads",
        feature: "crm",
        audiences: ["sales_director", "sales_agent", "external_agent"],
      },
      {
        href: "/portal/management-x7k9/crm/pipeline",
        labelKey: "pipeline",
        icon: <KanbanSquare className="w-[14px] h-[14px]" />,
        permission: "manageLeads",
        feature: "pipeline",
        audiences: ["sales_director", "sales_agent", "external_agent"],
      },
      {
        href: "/portal/management-x7k9/crm/clients",
        labelKey: "clients",
        icon: <Users className="w-[14px] h-[14px]" />,
        permission: "viewLeads",
        feature: "crm",
        audiences: ["sales_director", "sales_agent", "external_agent"],
      },
      {
        href: "/portal/management-x7k9/crm/deals",
        labelKey: "deals",
        icon: <Handshake className="w-[14px] h-[14px]" />,
        permission: "viewDeals",
        feature: "deals",
        audiences: ["owner", "sales_director", "sales_agent", "external_agent", "finance"],
      },
      {
        href: "/portal/management-x7k9/crm/tasks",
        labelKey: "tasksNav",
        icon: <ClipboardList className="w-[14px] h-[14px]" />,
        permission: "manageLeads",
        feature: "tasks",
        audiences: ["sales_director", "sales_agent", "external_agent"],
      },
      {
        href: "/portal/management-x7k9/crm/documents",
        labelKey: "documentsNav",
        icon: <FileText className="w-[14px] h-[14px]" />,
        permission: "viewDeals",
        feature: "documents",
        audiences: ["sales_director", "finance"],
      },
      {
        href: "/portal/management-x7k9/crm/agents",
        labelKey: "salesAgents",
        icon: <UserRoundCheck className="w-[14px] h-[14px]" />,
        permission: "viewReports",
        feature: "crm",
        audiences: ["sales_director"],
      },
      {
        href: "/portal/management-x7k9/crm/director",
        labelKey: "directorPanel",
        icon: <Activity className="w-[14px] h-[14px]" />,
        permission: "viewReports",
        feature: "crm",
        audiences: ["owner", "sales_director"],
      },
      {
        href: "/portal/management-x7k9/reports/my",
        labelKey: "myReport",
        icon: <BarChart3 className="w-[14px] h-[14px]" />,
        feature: "reports",
        audiences: ["sales_agent", "external_agent"],
      },
      {
        href: "/portal/management-x7k9/reports",
        labelKey: "executiveReports",
        icon: <BarChart3 className="w-[14px] h-[14px]" />,
        permission: "viewReports",
        feature: "reports",
        audiences: ["owner", "sales_director"],
      },
      {
        href: "/portal/management-x7k9/reports/sales",
        labelKey: "salesReport",
        icon: <BarChart3 className="w-[14px] h-[14px]" />,
        permission: "viewReports",
        feature: "reports",
        audiences: ["sales_director"],
      },
      {
        href: "/portal/management-x7k9/reports/inventory",
        labelKey: "inventoryReport",
        icon: <BarChart3 className="w-[14px] h-[14px]" />,
        permission: "viewReports",
        feature: "inventory",
        audiences: ["sales_director"],
      },
      {
        href: "/portal/management-x7k9/reports/marketing",
        labelKey: "marketingReport",
        icon: <BarChart3 className="w-[14px] h-[14px]" />,
        permission: "viewMarketingReports",
        feature: "reports",
        audiences: ["sales_director", "marketing"],
      },
      {
        href: "/portal/management-x7k9/reports/finance",
        labelKey: "financeReport",
        icon: <BarChart3 className="w-[14px] h-[14px]" />,
        permission: "viewFinance",
        feature: "financeReports",
        audiences: ["owner", "finance"],
      },
      {
        href: "/portal/management-x7k9/crm/sources",
        labelKey: "sourcesNav",
        icon: <Tags className="w-[14px] h-[14px]" />,
        permission: "managePublicContent",
        feature: "publicPage",
        audiences: ["marketing"],
      },
    ],
  },
  {
    labelKey: "content",
    items: [
      {
        href: "/portal/management-x7k9/public-page",
        labelKey: "publicPageNav",
        icon: <Globe2 className="w-[14px] h-[14px]" />,
        permission: "managePublicContent",
        feature: "publicPage",
        audiences: ["marketing"],
      },
      {
        href: "/portal/management-x7k9/projects",
        labelKey: "projects",
        icon: <Building2 className="w-[14px] h-[14px]" />,
        permission: "managePublicContent",
        feature: "publicPage",
        audiences: ["marketing"],
      },
      {
        href: "/portal/management-x7k9/faqs",
        labelKey: "faq",
        icon: <HelpCircle className="w-[14px] h-[14px]" />,
        permission: "managePublicContent",
        feature: "publicPage",
        audiences: ["marketing"],
      },
    ],
  },
  {
    labelKey: "system",
    items: [
      {
        href: "/portal/management-x7k9/settings",
        labelKey: "settingsNav",
        icon: <Settings className="w-[14px] h-[14px]" />,
        permission: "manageDeploymentSettings",
        audiences: ["developer", "owner"],
      },
      {
        href: "/portal/management-x7k9/users",
        labelKey: "users",
        icon: <Users className="w-[14px] h-[14px]" />,
        permission: "manageUsers",
        audiences: ["developer", "owner"],
      },
      {
        href: "/portal/management-x7k9/analytics",
        labelKey: "analytics",
        icon: <Activity className="w-[14px] h-[14px]" />,
        permission: "technicalSettings",
        audiences: ["developer"],
      },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  featureFlags: Record<PlatformFeature, FeatureEntitlement>;
  brandName: string;
}

export default function AdminSidebar({ featureFlags, isOpen, onClose, brandName }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const role = (session?.user as SessionUserWithRole | undefined)?.role;
  const normalizedRole = normalizePlatformRole(role);
  const [isPending, startTransition] = useTransition();
  const currentProjectId = pathname.match(/\/projects\/([^/]+)/)?.[1] ?? null;
  const projectNavItems: NavItem[] = currentProjectId
    ? [
        {
          href: `/portal/management-x7k9/projects/${currentProjectId}/buildings`,
          labelKey: "buildings",
          icon: <Building2 className="w-[14px] h-[14px]" />,
          permission: "manageInventory",
          feature: "inventory",
        },
        {
          href: `/portal/management-x7k9/projects/${currentProjectId}/images`,
          labelKey: "buildingImages",
          icon: <Images className="w-[14px] h-[14px]" />,
          permission: "manageInventory",
          feature: "inventory",
        },
        {
          href: `/portal/management-x7k9/projects/${currentProjectId}/units`,
          labelKey: "units",
          icon: <Home className="w-[14px] h-[14px]" />,
          permission: "manageInventory",
          feature: "inventory",
        },
      ]
    : [];

  const handleLocaleChange = (newLocale: string) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    startTransition(() => router.refresh());
  };

  const isItemVisible = (item: NavItem) => {
    if (item.permission && !roleHasPlatformPermission(role, item.permission)) return false;
    if (item.feature && !featureEntitlementIsEnabled(featureFlags[item.feature])) return false;
    if (!roleCanSeeNavigationAudience(normalizedRole, item.audiences)) return false;
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
          {brandName}
        </Link>
        <button
          onClick={onClose}
          className="md:hidden text-[16px] leading-none px-1"
          style={{ color: "var(--a-text-secondary)" }}
          aria-label={t("closeMenu")}
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
            <div key={group.labelKey} className="mb-2">
              <div className="a-nav-group">{t(group.labelKey)}</div>
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
        {projectNavItems.length > 0 && (
          <div className="mb-2">
            <div className="a-nav-group">{t("inventory")}</div>
            <div className="flex flex-col gap-[1px]">
              {projectNavItems.map((item) => {
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
        )}
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
              {platformRoleLabel(t, role)}
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
