export const PLATFORM_FEATURES = [
  "publicPage",
  "leadBot",
  "crm",
  "pipeline",
  "salesAgents",
  "tasks",
  "reports",
  "inventory",
  "deals",
  "calculator",
  "paymentPlans",
  "documents",
  "financeReports",
  "sms",
  "instagram",
  "calling",
  "aiAssistant",
  "customerPortal",
  "brokerPortal",
] as const;

export type PlatformFeature = (typeof PLATFORM_FEATURES)[number];

export const PLATFORM_PLAN_KEYS = [
  "lead_page_bot",
  "crm_starter",
  "real_estate_crm_growth",
  "full_sales_platform",
  "enterprise_custom",
] as const;

export type PlatformPlanKey = (typeof PLATFORM_PLAN_KEYS)[number];

export const FEATURE_LEVELS = [
  "none",
  "lead_count",
  "basic",
  "standard",
  "advanced",
  "included",
  "add_on",
  "optional_display",
  "call_log",
  "custom",
] as const;

export type FeatureLevel = (typeof FEATURE_LEVELS)[number];

export type FeatureEntitlement = boolean | FeatureLevel;

export type PlatformPlanDefinition = {
  key: PlatformPlanKey;
  label: string;
  summary: string;
  defaultUserLimit: number | null;
  defaultProjectLimit: number | null;
  setupUsdRange: readonly [number, number | null];
  monthlyUsdRange: readonly [number, number | null];
  features: Record<PlatformFeature, FeatureEntitlement>;
};

const noFeatures = Object.fromEntries(PLATFORM_FEATURES.map((feature) => [feature, false])) as Record<
  PlatformFeature,
  FeatureEntitlement
>;

function features(overrides: Partial<Record<PlatformFeature, FeatureEntitlement>>) {
  return { ...noFeatures, ...overrides };
}

export const PLATFORM_PLANS = {
  lead_page_bot: {
    key: "lead_page_bot",
    label: "Lead Page + Bot",
    summary: "Branded public lead page with Telegram delivery and simple lead capture.",
    defaultUserLimit: 1,
    defaultProjectLimit: 1,
    setupUsdRange: [700, 1500],
    monthlyUsdRange: [79, 149],
    features: features({
      publicPage: true,
      leadBot: true,
      reports: "lead_count",
      inventory: "optional_display",
      sms: "add_on",
      instagram: "add_on",
    }),
  },
  crm_starter: {
    key: "crm_starter",
    label: "CRM Starter",
    summary: "Lead capture, CRM pipeline, clients, sales agents, tasks, and basic reporting.",
    defaultUserLimit: 3,
    defaultProjectLimit: 1,
    setupUsdRange: [2500, 5000],
    monthlyUsdRange: [249, 499],
    features: features({
      publicPage: true,
      leadBot: true,
      crm: true,
      pipeline: true,
      salesAgents: true,
      tasks: true,
      reports: "basic",
      inventory: "optional_display",
      sms: "add_on",
      instagram: "add_on",
      calling: "call_log",
    }),
  },
  real_estate_crm_growth: {
    key: "real_estate_crm_growth",
    label: "Real Estate CRM Growth",
    summary: "Real-estate CRM with inventory, deals, calculator, payment plans, documents, and reports.",
    defaultUserLimit: 10,
    defaultProjectLimit: 2,
    setupUsdRange: [6000, 12000],
    monthlyUsdRange: [699, 1200],
    features: features({
      publicPage: true,
      leadBot: true,
      crm: true,
      pipeline: true,
      salesAgents: true,
      tasks: true,
      reports: "standard",
      inventory: true,
      deals: true,
      calculator: true,
      paymentPlans: true,
      documents: true,
      financeReports: "basic",
      sms: "add_on",
      instagram: "add_on",
      calling: "call_log",
      aiAssistant: "add_on",
    }),
  },
  full_sales_platform: {
    key: "full_sales_platform",
    label: "Full Sales Platform",
    summary: "Full branded digital sales office with advanced reports, integrations, and AI basics.",
    defaultUserLimit: 20,
    defaultProjectLimit: 5,
    setupUsdRange: [15000, 30000],
    monthlyUsdRange: [1500, 3000],
    features: features({
      publicPage: true,
      leadBot: true,
      crm: true,
      pipeline: true,
      salesAgents: true,
      tasks: true,
      reports: "advanced",
      inventory: true,
      deals: true,
      calculator: true,
      paymentPlans: true,
      documents: true,
      financeReports: true,
      sms: true,
      instagram: "add_on",
      calling: "add_on",
      aiAssistant: "basic",
      customerPortal: "add_on",
      brokerPortal: "add_on",
    }),
  },
  enterprise_custom: {
    key: "enterprise_custom",
    label: "Enterprise Custom",
    summary: "Custom white-label platform for large developers with negotiated integrations and support.",
    defaultUserLimit: null,
    defaultProjectLimit: null,
    setupUsdRange: [30000, null],
    monthlyUsdRange: [3000, null],
    features: features({
      publicPage: true,
      leadBot: true,
      crm: true,
      pipeline: true,
      salesAgents: true,
      tasks: true,
      reports: "custom",
      inventory: true,
      deals: true,
      calculator: true,
      paymentPlans: true,
      documents: true,
      financeReports: "custom",
      sms: "custom",
      instagram: "custom",
      calling: "custom",
      aiAssistant: "custom",
      customerPortal: "custom",
      brokerPortal: "custom",
    }),
  },
} as const satisfies Record<PlatformPlanKey, PlatformPlanDefinition>;

export const PLATFORM_PLAN_OPTIONS = PLATFORM_PLAN_KEYS.map((key) => PLATFORM_PLANS[key]);

export const PLATFORM_ROLES = [
  "developer",
  "owner",
  "admin",
  "sales_director",
  "sales_agent",
  "back_office",
  "marketing",
  "finance",
  "legal",
  "superadmin",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const V1_PLATFORM_ROLES = [
  "developer",
  "owner",
  "admin",
  "sales_director",
  "sales_agent",
  "back_office",
] as const satisfies readonly PlatformRole[];

export const OPTIONAL_PLATFORM_ROLE_ALIASES: Partial<Record<PlatformRole, PlatformRole>> = {
  finance: "back_office",
  legal: "back_office",
};

export const LEGACY_ROLE_ALIASES: Partial<Record<PlatformRole, PlatformRole>> = {
  superadmin: "owner",
};

export const ADMIN_ACCESS_ROLES = [
  "developer",
  "owner",
  "admin",
  "sales_director",
  "sales_agent",
  "back_office",
  "marketing",
  "finance",
  "legal",
  "superadmin",
] as const satisfies readonly PlatformRole[];

export const REQUIRED_CLIENT_ENV_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "CLIENT_SLUG",
  "CLIENT_PLATFORM_PLAN",
  "CRON_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

export const RECOMMENDED_CLIENT_ENV_VARS = [
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "REPORT_DIGEST_EMAIL_FROM",
  "REPORT_DIGEST_EMAIL_TO",
] as const;

export const OPTIONAL_CLIENT_ENV_VARS = [
  "APP_VERSION",
  "NEXT_PUBLIC_APP_VERSION",
  "CLIENT_PUBLIC_DOMAIN",
  "CLIENT_ADMIN_URL",
  "CLIENT_EMBED_FRAME_ANCESTORS",
  "RESEND_API_KEY",
  "ALERT_EMAIL_TO",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "ESKIZ_EMAIL",
  "ESKIZ_PASSWORD",
  "ESKIZ_FROM",
  "META_APP_ID",
  "META_APP_SECRET",
  "INSTAGRAM_BUSINESS_ACCOUNT_ID",
] as const;

export function isPlatformPlanKey(value: string): value is PlatformPlanKey {
  return (PLATFORM_PLAN_KEYS as readonly string[]).includes(value);
}

export function isPlatformFeature(value: string): value is PlatformFeature {
  return (PLATFORM_FEATURES as readonly string[]).includes(value);
}

export function isFeatureEntitlement(value: unknown): value is FeatureEntitlement {
  return typeof value === "boolean" || (typeof value === "string" && (FEATURE_LEVELS as readonly string[]).includes(value));
}

export function getPlatformPlanDefinition(plan: PlatformPlanKey) {
  return PLATFORM_PLANS[plan];
}

export function getPlatformPlanFeatures(plan: PlatformPlanKey) {
  return PLATFORM_PLANS[plan].features;
}

export function resolvePlatformFeatures(
  plan: PlatformPlanKey,
  overrides: Partial<Record<PlatformFeature, FeatureEntitlement>> = {}
) {
  return { ...getPlatformPlanFeatures(plan), ...overrides };
}

export function featureEntitlementIsEnabled(entitlement: FeatureEntitlement | undefined) {
  return entitlement !== undefined && entitlement !== false && entitlement !== "none" && entitlement !== "add_on";
}

export function getFeatureEntitlement(plan: PlatformPlanKey, feature: PlatformFeature) {
  return PLATFORM_PLANS[plan].features[feature];
}

export function hasPlatformFeature(plan: PlatformPlanKey, feature: PlatformFeature) {
  return featureEntitlementIsEnabled(getFeatureEntitlement(plan, feature));
}

export function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

export function normalizePlatformRole(role: string | null | undefined): PlatformRole | null {
  if (!role || !isPlatformRole(role)) return null;
  return LEGACY_ROLE_ALIASES[role] ?? OPTIONAL_PLATFORM_ROLE_ALIASES[role] ?? role;
}

export function platformRoleMatches(role: string | null | undefined, allowedRoles: readonly string[]) {
  if (!role) return false;
  const normalizedRole = normalizePlatformRole(role);
  return allowedRoles.includes(role) || Boolean(normalizedRole && allowedRoles.includes(normalizedRole));
}

export function roleCanAccessAdmin(role: string | null | undefined) {
  return platformRoleMatches(role, ADMIN_ACCESS_ROLES);
}

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  developer: "Developer",
  owner: "Owner",
  admin: "Admin",
  sales_director: "Sales director",
  sales_agent: "Sales agent",
  back_office: "Back office",
  marketing: "Marketing",
  finance: "Finance",
  legal: "Legal",
  superadmin: "Owner",
};

export const PLATFORM_PERMISSIONS = {
  technicalSettings: ["developer", "admin"],
  manageUsers: ["developer", "owner", "admin", "superadmin"],
  manageDeploymentSettings: ["developer", "owner", "admin", "superadmin"],
  managePublicContent: ["developer", "owner", "admin", "marketing", "superadmin"],
  manageInventory: ["developer", "owner", "admin", "sales_director", "superadmin"],
  viewLeads: [
    "developer",
    "owner",
    "admin",
    "sales_director",
    "sales_agent",
    "back_office",
    "marketing",
    "finance",
    "legal",
    "superadmin",
  ],
  manageLeads: ["developer", "owner", "admin", "sales_director", "sales_agent", "superadmin"],
  viewDeals: ["developer", "owner", "admin", "sales_director", "sales_agent", "back_office", "finance", "legal", "superadmin"],
  manageDeals: ["developer", "owner", "admin", "sales_director", "sales_agent", "superadmin"],
  managePayments: ["developer", "owner", "admin", "back_office", "finance", "superadmin"],
  manageDocuments: ["developer", "owner", "admin", "back_office", "legal", "finance", "superadmin"],
  viewReports: ["developer", "owner", "admin", "sales_director", "superadmin"],
  viewMarketingReports: ["developer", "owner", "admin", "sales_director", "marketing", "superadmin"],
  viewFinance: ["developer", "owner", "admin", "back_office", "finance", "superadmin"],
} as const satisfies Record<string, readonly PlatformRole[]>;

export type PlatformPermission = keyof typeof PLATFORM_PERMISSIONS;

export function roleHasPlatformPermission(role: string | null | undefined, permission: PlatformPermission) {
  return platformRoleMatches(role, PLATFORM_PERMISSIONS[permission]);
}
