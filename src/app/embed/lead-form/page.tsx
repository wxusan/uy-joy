import prisma from "@/lib/prisma";
import { getDefaultProject, getPublicPageConfig, translatePublicText } from "@/lib/public-page";
import EmbedLeadFormClient from "./EmbedLeadFormClient";
import { locales, defaultLocale, type Locale } from "@/lib/locales";

export const dynamic = "force-dynamic";

type EmbedLocale = Locale;

function resolveLocale(input: string | undefined): EmbedLocale {
  if (input && (locales as readonly string[]).includes(input)) {
    return input as EmbedLocale;
  }
  return defaultLocale;
}

export default async function EmbedLeadFormPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; source?: string; locale?: string }>;
}) {
  const params = await searchParams;
  const locale = resolveLocale(params.locale);
  const project = params.projectId
    ? await prisma.project.findUnique({ where: { id: params.projectId } })
    : await getDefaultProject();
  if (!project) return null;
  const publicPage = await getPublicPageConfig(project.id);
  const messages = (await import(`../../../../messages/${locale}.json`)).default as {
    embed: { leadForm: Record<string, string> };
  };
  const leadFormStrings = messages.embed.leadForm;
  const thankYouMessage =
    translatePublicText(publicPage?.config?.thankYouMessageJson, locale, "") ||
    leadFormStrings.thankYouFallback;

  return (
    <EmbedLeadFormClient
      projectId={project.id}
      projectName={publicPage?.config?.brandName || project.name}
      source={params.source || "client_site"}
      thankYouMessage={thankYouMessage}
      strings={{
        title: leadFormStrings.title,
        namePlaceholder: leadFormStrings.namePlaceholder,
        phonePlaceholder: leadFormStrings.phonePlaceholder,
        errorRetry: leadFormStrings.errorRetry,
        sending: leadFormStrings.sending,
        send: leadFormStrings.send,
      }}
    />
  );
}
