import { z } from "zod";
import { PUBLIC_PAGE_SECTIONS, isHexColor } from "@/lib/public-page";

const TranslationJson = z
  .object({
    uz: z.string().trim().max(500).optional(),
    ru: z.string().trim().max(500).optional(),
    en: z.string().trim().max(500).optional(),
  })
  .strict();

const UrlString = z.string().trim().max(1000).url().nullable().optional();
const HexColor = z.string().trim().refine((value) => isHexColor(value), "Use a #RRGGBB color");

export const PublicPageConfigPatchSchema = z
  .object({
    projectId: z.string().trim().min(1).max(120).optional(),
    brandName: z.string().trim().min(1).max(140).nullable().optional(),
    logoUrl: UrlString,
    faviconUrl: UrlString,
    primaryColor: HexColor.optional(),
    secondaryColor: HexColor.optional(),
    accentColor: HexColor.optional(),
    backgroundColor: HexColor.optional(),
    textColor: HexColor.optional(),
    fontMode: z.enum(["default", "modern", "premium"]).optional(),
    heroTitleJson: TranslationJson.optional(),
    heroSubtitleJson: TranslationJson.optional(),
    heroImageUrl: UrlString,
    heroVideoUrl: UrlString,
    primaryCtaLabelJson: TranslationJson.optional(),
    secondaryCtaLabelJson: TranslationJson.optional(),
    formTitleJson: TranslationJson.optional(),
    formSubtitleJson: TranslationJson.optional(),
    thankYouTitleJson: TranslationJson.optional(),
    thankYouMessageJson: TranslationJson.optional(),
    enabledSections: z.array(z.enum(PUBLIC_PAGE_SECTIONS)).optional(),
    designTokens: z.record(z.string(), z.unknown()).optional(),
    embedAllowedOrigins: z.array(z.string().trim().url()).max(20).optional(),
    redirectAfterSubmit: z.string().trim().url().nullable().optional(),
    customCss: z.never().optional(),
  })
  .strict();

export const LeadSourceUpdateSchema = z
  .object({
    labelJson: TranslationJson.optional(),
    isActive: z.boolean().optional(),
    defaultAssignedAgentId: z.string().trim().max(120).nullable().optional(),
    defaultPipelineStageKey: z.string().trim().max(80).nullable().optional(),
  })
  .strict();

export const LeadSourceCreateSchema = LeadSourceUpdateSchema.extend({
  key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_-]+$/),
});
