import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  DEFAULT_PUBLIC_PAGE_COLORS,
  ensurePublicPageConfig,
  getDefaultProject,
  getPublicPageConfig,
  publicPageColorWarnings,
  publicPageFontWarnings,
} from "@/lib/public-page";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { invalidInput } from "@/lib/schemas/common";
import { PublicPageConfigPatchSchema } from "@/lib/schemas/public-page";

function configResponse(config: Awaited<ReturnType<typeof ensurePublicPageConfig>>) {
  const colors = {
    primaryColor: config.primaryColor || DEFAULT_PUBLIC_PAGE_COLORS.primaryColor,
    backgroundColor: config.backgroundColor || DEFAULT_PUBLIC_PAGE_COLORS.backgroundColor,
    textColor: config.textColor || DEFAULT_PUBLIC_PAGE_COLORS.textColor,
  };
  const warnings = [
    ...publicPageColorWarnings(colors),
    ...publicPageFontWarnings({
      fontMode: config.fontMode,
      heroTitleJson: config.heroTitleJson,
      heroSubtitleJson: config.heroSubtitleJson,
    }),
  ];
  return { config, warnings };
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("publicPage", "managePublicContent");
  if (auth.response) return auth.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  const result = await getPublicPageConfig(projectId);
  if (!result) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const config = await ensurePublicPageConfig(result.project);
  const failedTelegram = await prisma.telegramNotificationLog.findMany({
    where: { status: "failed" },
    include: { lead: { select: { id: true, name: true, phone: true, source: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    ...configResponse(config),
    telegram: {
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      failed: failedTelegram,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePlatformApiFeature("publicPage", "managePublicContent");
  if (auth.response) return auth.response;
  const body = await request.json();
  const parsed = PublicPageConfigPatchSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const project = input.projectId ? await prisma.project.findUnique({ where: { id: input.projectId } }) : await getDefaultProject();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const existing = await ensurePublicPageConfig(project);
  const config = await prisma.publicPageConfig.update({
    where: { id: existing.id },
    data: {
      ...(input.brandName !== undefined && { brandName: input.brandName || null }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl || null }),
      ...(input.faviconUrl !== undefined && { faviconUrl: input.faviconUrl || null }),
      ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
      ...(input.secondaryColor !== undefined && { secondaryColor: input.secondaryColor }),
      ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
      ...(input.backgroundColor !== undefined && { backgroundColor: input.backgroundColor }),
      ...(input.textColor !== undefined && { textColor: input.textColor }),
      ...(input.fontMode !== undefined && { fontMode: input.fontMode }),
      ...(input.heroTitleJson !== undefined && { heroTitleJson: jsonInput(input.heroTitleJson) }),
      ...(input.heroSubtitleJson !== undefined && { heroSubtitleJson: jsonInput(input.heroSubtitleJson) }),
      ...(input.heroImageUrl !== undefined && { heroImageUrl: input.heroImageUrl || null }),
      ...(input.heroVideoUrl !== undefined && { heroVideoUrl: input.heroVideoUrl || null }),
      ...(input.primaryCtaLabelJson !== undefined && { primaryCtaLabelJson: jsonInput(input.primaryCtaLabelJson) }),
      ...(input.secondaryCtaLabelJson !== undefined && { secondaryCtaLabelJson: jsonInput(input.secondaryCtaLabelJson) }),
      ...(input.formTitleJson !== undefined && { formTitleJson: jsonInput(input.formTitleJson) }),
      ...(input.formSubtitleJson !== undefined && { formSubtitleJson: jsonInput(input.formSubtitleJson) }),
      ...(input.thankYouTitleJson !== undefined && { thankYouTitleJson: jsonInput(input.thankYouTitleJson) }),
      ...(input.thankYouMessageJson !== undefined && { thankYouMessageJson: jsonInput(input.thankYouMessageJson) }),
      ...(input.enabledSections !== undefined && { enabledSections: jsonInput(input.enabledSections) }),
      ...(input.designTokens !== undefined && { designTokens: jsonInput(input.designTokens) }),
      ...(input.embedAllowedOrigins !== undefined && { embedAllowedOrigins: jsonInput(input.embedAllowedOrigins) }),
      ...(input.redirectAfterSubmit !== undefined && { redirectAfterSubmit: input.redirectAfterSubmit || null }),
    },
  });

  return NextResponse.json(configResponse(config));
}
