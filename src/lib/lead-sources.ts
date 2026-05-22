import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export const STANDARD_LEAD_SOURCES = [
  "public_page",
  "contact_form",
  "apartment_page",
  "visual_explorer",
  "floating_contact",
  "waitlist",
  "telegram",
  "instagram",
  "campaign",
  "client_site",
  "manual",
] as const;

export type StandardLeadSource = (typeof STANDARD_LEAD_SOURCES)[number];

export const LEGACY_LEAD_SOURCE_ALIASES: Record<string, StandardLeadSource> = {
  "bosh-sahifa": "public_page",
  kvartiralar: "apartment_page",
  vizual: "visual_explorer",
  "interactive-floor": "visual_explorer",
  "apartment-card": "apartment_page",
  floating_matchmaker: "floating_contact",
  intent_popup: "floating_contact",
  "3D Visualizer": "visual_explorer",
};

export const DEFAULT_LEAD_SOURCE_LABELS: Record<StandardLeadSource, Record<"uz" | "ru" | "en", string>> = {
  public_page: { uz: "Ommaviy sahifa", ru: "Публичная страница", en: "Public page" },
  contact_form: { uz: "Aloqa formasi", ru: "Форма контакта", en: "Contact form" },
  apartment_page: { uz: "Xonadon sahifasi", ru: "Страница квартиры", en: "Apartment page" },
  visual_explorer: { uz: "Vizual tanlov", ru: "Визуальный выбор", en: "Visual explorer" },
  floating_contact: { uz: "Tez aloqa", ru: "Быстрый контакт", en: "Floating contact" },
  waitlist: { uz: "Kutish ro'yxati", ru: "Лист ожидания", en: "Waitlist" },
  telegram: { uz: "Telegram", ru: "Telegram", en: "Telegram" },
  instagram: { uz: "Instagram", ru: "Instagram", en: "Instagram" },
  campaign: { uz: "Kampaniya", ru: "Кампания", en: "Campaign" },
  client_site: { uz: "Mijoz sayti", ru: "Сайт клиента", en: "Client site" },
  manual: { uz: "Qo'lda", ru: "Вручную", en: "Manual" },
};

export function normalizeLeadSource(source: string | null | undefined): string | null {
  const trimmed = source?.trim();
  if (!trimmed) return null;
  if (LEGACY_LEAD_SOURCE_ALIASES[trimmed]) return LEGACY_LEAD_SOURCE_ALIASES[trimmed];
  if ((STANDARD_LEAD_SOURCES as readonly string[]).includes(trimmed)) return trimmed;
  const safe = trimmed.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
  return safe || "manual";
}

export function leadSourceLabel(source: string | null | undefined, locale = "uz") {
  const normalized = normalizeLeadSource(source) as StandardLeadSource | null;
  if (normalized && DEFAULT_LEAD_SOURCE_LABELS[normalized]) {
    const labels = DEFAULT_LEAD_SOURCE_LABELS[normalized];
    return labels[locale as "uz" | "ru" | "en"] || labels.uz || labels.en;
  }
  return source || "-";
}

export async function ensureDefaultLeadSources(db: Db = prisma) {
  await db.leadSource.createMany({
    data: STANDARD_LEAD_SOURCES.map((key) => ({
      key,
      labelJson: DEFAULT_LEAD_SOURCE_LABELS[key],
      isSystem: true,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}
