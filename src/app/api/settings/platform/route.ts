import { NextResponse } from "next/server";
import { z } from "zod";
import { FEATURE_LEVELS, PLATFORM_FEATURES, PLATFORM_PLAN_KEYS } from "@/lib/platform-plans";
import { requirePlatformApiAccess } from "@/lib/platform-guards";
import {
  getPlatformSettingsRecord,
  getStoredPlatformSettings,
  platformSettingsRecordToInput,
  upsertPlatformSettingsRecord,
} from "@/lib/platform-settings-store";
import { locales } from "@/lib/locales";

export const dynamic = "force-dynamic";

const FeatureEntitlementSchema = z.union([z.boolean(), z.enum(FEATURE_LEVELS)]);
const NullableStringSchema = z.string().trim().min(1).optional();

const PlatformSettingsPatchSchema = z.object({
  clientSlug: NullableStringSchema,
  companyLegalName: NullableStringSchema,
  publicBrandName: NullableStringSchema,
  showPoweredByUyJoy: z.boolean().optional(),
  branding: z
    .object({
      logoUrl: NullableStringSchema,
      faviconUrl: NullableStringSchema,
      colors: z
        .object({
          primary: NullableStringSchema,
          secondary: NullableStringSchema,
          accent: NullableStringSchema,
        })
        .optional(),
    })
    .optional(),
  defaultLocale: z.enum(locales).optional(),
  enabledLocales: z.array(z.enum(locales)).min(1).optional(),
  contact: z
    .object({
      publicPhoneNumber: NullableStringSchema,
      publicTelegramUrl: NullableStringSchema,
      publicInstagramUrl: NullableStringSchema,
      salesOfficeAddress: NullableStringSchema,
      salesHoursLabel: NullableStringSchema,
    })
    .optional(),
  plan: z.enum(PLATFORM_PLAN_KEYS).optional(),
  featureFlags: z.partialRecord(z.enum(PLATFORM_FEATURES), FeatureEntitlementSchema).optional(),
  limits: z
    .object({
      users: z.number().int().positive().nullable().optional(),
      projects: z.number().int().positive().nullable().optional(),
      storageLabel: NullableStringSchema,
    })
    .optional(),
  allowAgentClaim: z.boolean().optional(),
});

export async function GET() {
  const auth = await requirePlatformApiAccess("technicalSettings");
  if (auth.response) return auth.response;

  const [record, settings] = await Promise.all([getPlatformSettingsRecord(), getStoredPlatformSettings()]);
  return NextResponse.json({
    settings,
    record: record ? platformSettingsRecordToInput(record) : null,
    updatedBy: record?.updatedBy ?? null,
    updatedAt: record?.updatedAt ?? null,
  });
}

export async function PATCH(req: Request) {
  const auth = await requirePlatformApiAccess("technicalSettings");
  if (auth.response) return auth.response;

  const parsed = PlatformSettingsPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await upsertPlatformSettingsRecord(parsed.data, auth.user?.id);
  const settings = await getStoredPlatformSettings();
  return NextResponse.json({ success: true, settings, record: platformSettingsRecordToInput(record) });
}
