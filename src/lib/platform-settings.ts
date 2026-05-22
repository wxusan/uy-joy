import { defaultLocale, locales, type Locale } from "./locales";
import {
  type FeatureEntitlement,
  type PlatformFeature,
  type PlatformPlanKey,
  OPTIONAL_CLIENT_ENV_VARS,
  RECOMMENDED_CLIENT_ENV_VARS,
  REQUIRED_CLIENT_ENV_VARS,
  getPlatformPlanDefinition,
  featureEntitlementIsEnabled,
  isFeatureEntitlement,
  isPlatformFeature,
  isPlatformPlanKey,
  resolvePlatformFeatures,
} from "./platform-plans";

export type PlatformColorSettings = {
  primary: string;
  secondary: string;
  accent: string;
};

export type PlatformBrandingSettings = {
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: PlatformColorSettings;
};

export type PlatformContactSettings = {
  publicPhoneNumber: string | null;
  publicTelegramUrl: string | null;
  publicInstagramUrl: string | null;
  salesOfficeAddress: string | null;
  salesHoursLabel: string | null;
};

export type PlatformLimits = {
  users: number | null;
  projects: number | null;
  storageLabel: string | null;
};

export type PlatformSettings = {
  clientSlug: string;
  companyLegalName: string;
  publicBrandName: string;
  showPoweredByUyJoy: boolean;
  branding: PlatformBrandingSettings;
  defaultLocale: Locale;
  enabledLocales: readonly Locale[];
  contact: PlatformContactSettings;
  plan: PlatformPlanKey;
  featureFlags: Record<PlatformFeature, FeatureEntitlement>;
  limits: PlatformLimits;
  allowAgentClaim: boolean;
  createdBySupportContact: string | null;
};

export type PlatformSettingsInput = Partial<
  Omit<PlatformSettings, "branding" | "contact" | "featureFlags" | "limits">
> & {
  branding?: Partial<Omit<PlatformBrandingSettings, "colors">> & {
    colors?: Partial<PlatformColorSettings>;
  };
  contact?: Partial<PlatformContactSettings>;
  featureFlags?: Partial<Record<PlatformFeature, FeatureEntitlement>>;
  limits?: Partial<PlatformLimits>;
};

const DEFAULT_PLATFORM_PLAN: PlatformPlanKey = "full_sales_platform";
const DEFAULT_CLIENT_SLUG = "uy-joy";
const DEFAULT_BRAND_NAME = "Uy Joy";
const DEFAULT_COLORS: PlatformColorSettings = {
  primary: "#111827",
  secondary: "#f8fafc",
  accent: "#16a34a",
};

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function parsePlan(value: string | null): PlatformPlanKey {
  return value && isPlatformPlanKey(value) ? value : DEFAULT_PLATFORM_PLAN;
}

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

function parseLocale(value: string | null): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

function parseEnabledLocales(value: string | null): readonly Locale[] {
  if (!value) return locales;

  const parsedLocales = value
    .split(",")
    .map((locale) => locale.trim())
    .filter(isLocale);

  return parsedLocales.length > 0 ? parsedLocales : locales;
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseFeatureFlagOverrides(value: string | null): Partial<Record<PlatformFeature, FeatureEntitlement>> {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Partial<Record<PlatformFeature, FeatureEntitlement>>>((flags, [key, flag]) => {
      if (isPlatformFeature(key) && isFeatureEntitlement(flag)) {
        flags[key] = flag;
      }
      return flags;
    }, {});
  } catch {
    return {};
  }
}

export function createPlatformSettings(input: PlatformSettingsInput = {}): PlatformSettings {
  const plan = input.plan ?? parsePlan(firstEnv("CLIENT_PLATFORM_PLAN", "PLATFORM_PLAN"));
  const planDefinition = getPlatformPlanDefinition(plan);
  const envFeatureFlags = parseFeatureFlagOverrides(firstEnv("CLIENT_FEATURE_FLAGS", "PLATFORM_FEATURE_FLAGS"));
  const featureFlags = resolvePlatformFeatures(plan, { ...envFeatureFlags, ...input.featureFlags });

  return {
    clientSlug: input.clientSlug ?? firstEnv("CLIENT_SLUG") ?? DEFAULT_CLIENT_SLUG,
    companyLegalName:
      input.companyLegalName ?? firstEnv("CLIENT_COMPANY_LEGAL_NAME", "COMPANY_LEGAL_NAME") ?? DEFAULT_BRAND_NAME,
    publicBrandName:
      input.publicBrandName ??
      firstEnv("NEXT_PUBLIC_CLIENT_BRAND_NAME", "CLIENT_PUBLIC_BRAND_NAME", "CLIENT_BRAND_NAME") ??
      DEFAULT_BRAND_NAME,
    showPoweredByUyJoy: input.showPoweredByUyJoy ?? parseBoolean(firstEnv("NEXT_PUBLIC_POWERED_BY_UY_JOY"), false),
    branding: {
      logoUrl: input.branding?.logoUrl ?? firstEnv("NEXT_PUBLIC_CLIENT_LOGO_URL", "CLIENT_LOGO_URL"),
      faviconUrl: input.branding?.faviconUrl ?? firstEnv("NEXT_PUBLIC_CLIENT_FAVICON_URL", "CLIENT_FAVICON_URL"),
      colors: {
        primary: input.branding?.colors?.primary ?? firstEnv("NEXT_PUBLIC_CLIENT_PRIMARY_COLOR") ?? DEFAULT_COLORS.primary,
        secondary:
          input.branding?.colors?.secondary ?? firstEnv("NEXT_PUBLIC_CLIENT_SECONDARY_COLOR") ?? DEFAULT_COLORS.secondary,
        accent: input.branding?.colors?.accent ?? firstEnv("NEXT_PUBLIC_CLIENT_ACCENT_COLOR") ?? DEFAULT_COLORS.accent,
      },
    },
    defaultLocale: input.defaultLocale ?? parseLocale(firstEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "CLIENT_DEFAULT_LOCALE")),
    enabledLocales:
      input.enabledLocales ?? parseEnabledLocales(firstEnv("NEXT_PUBLIC_ENABLED_LOCALES", "CLIENT_ENABLED_LOCALES")),
    contact: {
      publicPhoneNumber:
        input.contact?.publicPhoneNumber ?? firstEnv("NEXT_PUBLIC_CLIENT_PHONE_NUMBER", "CLIENT_PUBLIC_PHONE_NUMBER"),
      publicTelegramUrl:
        input.contact?.publicTelegramUrl ?? firstEnv("NEXT_PUBLIC_CLIENT_TELEGRAM_URL", "CLIENT_PUBLIC_TELEGRAM_URL"),
      publicInstagramUrl:
        input.contact?.publicInstagramUrl ?? firstEnv("NEXT_PUBLIC_CLIENT_INSTAGRAM_URL", "CLIENT_PUBLIC_INSTAGRAM_URL"),
      salesOfficeAddress:
        input.contact?.salesOfficeAddress ??
        firstEnv("NEXT_PUBLIC_CLIENT_SALES_OFFICE_ADDRESS", "CLIENT_SALES_OFFICE_ADDRESS"),
      salesHoursLabel:
        input.contact?.salesHoursLabel ?? firstEnv("NEXT_PUBLIC_CLIENT_SALES_HOURS_LABEL", "CLIENT_SALES_HOURS_LABEL"),
    },
    plan,
    featureFlags,
    limits: {
      users: input.limits?.users ?? parsePositiveInteger(firstEnv("CLIENT_USER_LIMIT")) ?? planDefinition.defaultUserLimit,
      projects:
        input.limits?.projects ?? parsePositiveInteger(firstEnv("CLIENT_PROJECT_LIMIT")) ?? planDefinition.defaultProjectLimit,
      storageLabel: input.limits?.storageLabel ?? firstEnv("CLIENT_STORAGE_LIMIT_LABEL"),
    },
    allowAgentClaim: input.allowAgentClaim ?? parseBoolean(firstEnv("CLIENT_ALLOW_AGENT_CLAIM"), true),
    createdBySupportContact: input.createdBySupportContact ?? firstEnv("UY_JOY_SUPPORT_CONTACT", "CLIENT_SUPPORT_CONTACT"),
  };
}

let cachedPlatformSettings: PlatformSettings | null = null;
let cachedPlatformSettingsAt = 0;

function settingsCacheTtlMs() {
  const parsed = Number.parseInt(process.env.PLATFORM_SETTINGS_CACHE_TTL_MS || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 60_000;
}

export function getPlatformSettings() {
  const now = Date.now();
  if (!cachedPlatformSettings || now - cachedPlatformSettingsAt > settingsCacheTtlMs()) {
    cachedPlatformSettings = createPlatformSettings();
    cachedPlatformSettingsAt = now;
  }
  return cachedPlatformSettings;
}

export function resetPlatformSettingsCache() {
  cachedPlatformSettings = null;
  cachedPlatformSettingsAt = 0;
}

export function getPlatformFeature(settings: PlatformSettings, feature: PlatformFeature) {
  return settings.featureFlags[feature];
}

export function platformSettingsHasFeature(settings: PlatformSettings, feature: PlatformFeature) {
  return featureEntitlementIsEnabled(getPlatformFeature(settings, feature));
}

function missingEnvVars(names: readonly string[]) {
  return names.filter((name) => !process.env[name]?.trim());
}

export function getClientEnvStatus() {
  return {
    missingRequired: missingEnvVars(REQUIRED_CLIENT_ENV_VARS),
    missingRecommended: missingEnvVars(RECOMMENDED_CLIENT_ENV_VARS),
    configuredOptional: OPTIONAL_CLIENT_ENV_VARS.filter((name) => Boolean(process.env[name]?.trim())),
  };
}

export function assertRequiredClientEnv() {
  const { missingRequired } = getClientEnvStatus();
  if (missingRequired.length > 0) {
    throw new Error(`Missing required client env vars: ${missingRequired.join(", ")}`);
  }
}
