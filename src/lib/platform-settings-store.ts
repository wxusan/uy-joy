import type { PlatformSettingsRecord, Prisma } from "@prisma/client";
import prisma from "./prisma";
import { type FeatureEntitlement, type PlatformFeature, isFeatureEntitlement, isPlatformFeature, isPlatformPlanKey } from "./platform-plans";
import { type PlatformSettingsInput, createPlatformSettings, resetPlatformSettingsCache } from "./platform-settings";
import { locales, type Locale } from "./locales";

export const PLATFORM_SETTINGS_RECORD_ID = "default";

let cachedStoredSettings:
  | {
      settings: ReturnType<typeof createPlatformSettings>;
      record: PlatformSettingsRecord | null;
      fetchedAt: number;
    }
  | null = null;

function storedSettingsCacheTtlMs() {
  const parsed = Number.parseInt(process.env.PLATFORM_SETTINGS_DB_CACHE_TTL_MS || process.env.PLATFORM_SETTINGS_CACHE_TTL_MS || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 60_000;
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function enabledLocalesFromJson(value: Prisma.JsonValue | null | undefined): readonly Locale[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value.filter((locale): locale is Locale => typeof locale === "string" && (locales as readonly string[]).includes(locale));
  return parsed.length > 0 ? parsed : undefined;
}

function featureFlagsFromJson(value: Prisma.JsonValue | null | undefined) {
  const flags = jsonObject(value);
  if (!flags) return undefined;

  return Object.entries(flags).reduce<Partial<Record<PlatformFeature, FeatureEntitlement>>>((result, [feature, entitlement]) => {
    if (isPlatformFeature(feature) && isFeatureEntitlement(entitlement)) {
      result[feature] = entitlement;
    }
    return result;
  }, {});
}

export async function getPlatformSettingsRecord() {
  return prisma.platformSettingsRecord.findUnique({
    where: { id: PLATFORM_SETTINGS_RECORD_ID },
    include: {
      updatedBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}

export function platformSettingsRecordToInput(record: PlatformSettingsRecord | null): PlatformSettingsInput {
  if (!record) return {};

  return {
    clientSlug: record.clientSlug ?? undefined,
    companyLegalName: record.companyLegalName ?? undefined,
    publicBrandName: record.publicBrandName ?? undefined,
    showPoweredByUyJoy: record.showPoweredByUyJoy ?? undefined,
    branding: {
      logoUrl: record.logoUrl ?? undefined,
      faviconUrl: record.faviconUrl ?? undefined,
      colors: {
        primary: record.primaryColor ?? undefined,
        secondary: record.secondaryColor ?? undefined,
        accent: record.accentColor ?? undefined,
      },
    },
    defaultLocale:
      record.defaultLocale && (locales as readonly string[]).includes(record.defaultLocale)
        ? (record.defaultLocale as Locale)
        : undefined,
    enabledLocales: enabledLocalesFromJson(record.enabledLocalesJson),
    contact: {
      publicPhoneNumber: record.publicPhoneNumber ?? undefined,
      publicTelegramUrl: record.publicTelegramUrl ?? undefined,
      publicInstagramUrl: record.publicInstagramUrl ?? undefined,
      salesOfficeAddress: record.salesOfficeAddress ?? undefined,
      salesHoursLabel: record.salesHoursLabel ?? undefined,
    },
    plan: record.plan && isPlatformPlanKey(record.plan) ? record.plan : undefined,
    featureFlags: featureFlagsFromJson(record.featureFlags),
    limits: {
      users: record.userLimit ?? undefined,
      projects: record.projectLimit ?? undefined,
      storageLabel: record.storageLabel ?? undefined,
    },
    allowAgentClaim: record.allowAgentClaim ?? undefined,
  };
}

export async function getStoredPlatformSettings() {
  const now = Date.now();
  if (cachedStoredSettings && now - cachedStoredSettings.fetchedAt <= storedSettingsCacheTtlMs()) {
    return cachedStoredSettings.settings;
  }

  const record = await getPlatformSettingsRecord();
  const settings = createPlatformSettings(platformSettingsRecordToInput(record));
  cachedStoredSettings = { settings, record, fetchedAt: now };
  return settings;
}

export function resetStoredPlatformSettingsCache() {
  cachedStoredSettings = null;
}

export async function upsertPlatformSettingsRecord(input: PlatformSettingsInput, updatedById?: string | null) {
  const featureFlags = input.featureFlags ? JSON.parse(JSON.stringify(input.featureFlags)) : undefined;
  const enabledLocalesJson = input.enabledLocales ? [...input.enabledLocales] : undefined;
  const data = {
    clientSlug: input.clientSlug,
    companyLegalName: input.companyLegalName,
    publicBrandName: input.publicBrandName,
    showPoweredByUyJoy: input.showPoweredByUyJoy,
    logoUrl: input.branding?.logoUrl,
    faviconUrl: input.branding?.faviconUrl,
    primaryColor: input.branding?.colors?.primary,
    secondaryColor: input.branding?.colors?.secondary,
    accentColor: input.branding?.colors?.accent,
    defaultLocale: input.defaultLocale,
    enabledLocalesJson,
    publicPhoneNumber: input.contact?.publicPhoneNumber,
    publicTelegramUrl: input.contact?.publicTelegramUrl,
    publicInstagramUrl: input.contact?.publicInstagramUrl,
    salesOfficeAddress: input.contact?.salesOfficeAddress,
    salesHoursLabel: input.contact?.salesHoursLabel,
    plan: input.plan,
    featureFlags,
    userLimit: input.limits?.users,
    projectLimit: input.limits?.projects,
    storageLabel: input.limits?.storageLabel,
    allowAgentClaim: input.allowAgentClaim,
    updatedById: updatedById || undefined,
  };

  const record = await prisma.platformSettingsRecord.upsert({
    where: { id: PLATFORM_SETTINGS_RECORD_ID },
    create: { id: PLATFORM_SETTINGS_RECORD_ID, ...data },
    update: data,
  });

  resetPlatformSettingsCache();
  resetStoredPlatformSettingsCache();
  return record;
}
