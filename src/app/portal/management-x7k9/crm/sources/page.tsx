import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureDefaultLeadSources } from "@/lib/lead-sources";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import SourcesClient from "./SourcesClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function LeadSourcesPage() {
  await requireAdmin(PLATFORM_PERMISSIONS.managePublicContent);
  const t = await getTranslations("admin");
  await ensureDefaultLeadSources();
  const sources = await prisma.leadSource.findMany({ orderBy: [{ isSystem: "desc" }, { key: "asc" }] });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("sourcesTitle")}</h1>
        <p className="a-page-sub">{t("sourcesSubtitle")}</p>
      </div>
      <SourcesClient sources={JSON.parse(JSON.stringify(sources))} />
    </div>
  );
}
