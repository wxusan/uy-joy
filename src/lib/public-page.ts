import { Prisma, PrismaClient, PublicPageConfig, Project } from "@prisma/client";
import prisma from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export const PUBLIC_PAGE_SECTIONS = [
  "hero",
  "project_overview",
  "apartment_highlights",
  "faq",
  "location",
  "gallery",
  "visual_explorer",
  "contact_form",
] as const;

export type PublicPageSection = (typeof PUBLIC_PAGE_SECTIONS)[number];
export type TranslationMap = Partial<Record<"uz" | "ru" | "en", string>>;

export const DEFAULT_ENABLED_PUBLIC_PAGE_SECTIONS: PublicPageSection[] = [
  "hero",
  "project_overview",
  "apartment_highlights",
  "faq",
  "location",
  "gallery",
  "visual_explorer",
  "contact_form",
];

export const DEFAULT_PUBLIC_PAGE_COLORS = {
  primaryColor: "#c66348",
  secondaryColor: "#15120f",
  accentColor: "#f0a383",
  backgroundColor: "#f4efe7",
  textColor: "#15120f",
};

export function isHexColor(value: string | null | undefined) {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function channelLuminance(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function colorContrastRatio(foreground: string, background: string) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  const fgLum = 0.2126 * channelLuminance(fg.r) + 0.7152 * channelLuminance(fg.g) + 0.0722 * channelLuminance(fg.b);
  const bgLum = 0.2126 * channelLuminance(bg.r) + 0.7152 * channelLuminance(bg.g) + 0.0722 * channelLuminance(bg.b);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function publicPageColorWarnings(input: { primaryColor: string; backgroundColor: string; textColor: string }) {
  const warnings: string[] = [];
  if (colorContrastRatio(input.textColor, input.backgroundColor) < 4.5) {
    warnings.push("Text and background contrast is below WCAG AA.");
  }
  if (colorContrastRatio("#ffffff", input.primaryColor) < 3) {
    warnings.push("White text on the primary color may be hard to read.");
  }
  return warnings;
}

/**
 * Returns warnings about font mode / locale compatibility.
 * "premium" mode is flagged when Russian content is present, because not all
 * premium display fonts include full Cyrillic glyph coverage.
 */
export function publicPageFontWarnings(input: {
  fontMode: string;
  heroTitleJson?: unknown;
  heroSubtitleJson?: unknown;
}) {
  const warnings: string[] = [];
  if (input.fontMode !== "premium") return warnings;

  // Check whether any Russian translation content exists across the key text fields
  const hasRussianContent = [input.heroTitleJson, input.heroSubtitleJson].some((field) => {
    if (!field || typeof field !== "object") return false;
    const ru = (field as Record<string, unknown>).ru;
    return typeof ru === "string" && ru.trim().length > 0;
  });

  if (hasRussianContent) {
    warnings.push(
      "Premium font mode is active with Russian (Cyrillic) content. Verify that the selected font renders Russian text correctly before publishing."
    );
  } else {
    // Warn proactively — Russian content may be added later
    warnings.push(
      "Premium font mode may not render Russian/Cyrillic text cleanly. Check all locale copy before publishing."
    );
  }
  return warnings;
}

export function translatePublicText(value: unknown, locale = "uz", fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value || fallback;
  if (typeof value !== "object") return fallback;
  const record = value as Record<string, unknown>;
  const direct = record[locale];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  for (const key of ["uz", "ru", "en"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return fallback;
}

export function parseSectionList(value: unknown): PublicPageSection[] {
  if (!Array.isArray(value)) return DEFAULT_ENABLED_PUBLIC_PAGE_SECTIONS;
  const sections = value.filter((section): section is PublicPageSection =>
    (PUBLIC_PAGE_SECTIONS as readonly string[]).includes(String(section))
  );
  return sections.length ? sections : DEFAULT_ENABLED_PUBLIC_PAGE_SECTIONS;
}

export function sectionEnabled(config: PublicPageConfig | null | undefined, section: PublicPageSection) {
  return parseSectionList(config?.enabledSections).includes(section);
}

export function defaultPublicPageConfig(project: Pick<Project, "id" | "name" | "brandLogo" | "coverImage">) {
  return {
    projectId: project.id,
    brandName: project.name,
    logoUrl: project.brandLogo,
    heroImageUrl: project.coverImage,
    ...DEFAULT_PUBLIC_PAGE_COLORS,
    fontMode: "default",
    heroTitleJson: { uz: project.name, ru: project.name, en: project.name },
    heroSubtitleJson: {},
    primaryCtaLabelJson: { uz: "Bog'lanish", ru: "Связаться", en: "Contact us" },
    secondaryCtaLabelJson: { uz: "Xonadonlar", ru: "Квартиры", en: "Apartments" },
    formTitleJson: {},
    formSubtitleJson: {},
    thankYouTitleJson: { uz: "Rahmat", ru: "Спасибо", en: "Thank you" },
    thankYouMessageJson: {
      uz: "Menejerimiz tez orada siz bilan bog'lanadi.",
      ru: "Наш менеджер скоро свяжется с вами.",
      en: "Our manager will contact you shortly.",
    },
    enabledSections: DEFAULT_ENABLED_PUBLIC_PAGE_SECTIONS,
    designTokens: { radius: 6, buttonStyle: "solid" },
    embedAllowedOrigins: [],
  };
}

export async function getDefaultProject(db: Db = prisma) {
  return db.project.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function getPublicPageConfig(projectId?: string | null, db: Db = prisma) {
  const project = projectId ? await db.project.findUnique({ where: { id: projectId } }) : await getDefaultProject(db);
  if (!project) return null;
  const config = await db.publicPageConfig.findUnique({ where: { projectId: project.id } });
  return { project, config };
}

export async function ensurePublicPageConfig(project: Pick<Project, "id" | "name" | "brandLogo" | "coverImage">, db: Db = prisma) {
  const existing = await db.publicPageConfig.findUnique({ where: { projectId: project.id } });
  if (existing) return existing;
  return db.publicPageConfig.create({
    data: defaultPublicPageConfig(project) as Prisma.PublicPageConfigUncheckedCreateInput,
  });
}
