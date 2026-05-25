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
  const [sources, leadsBySource, unansweredBySource, reservationsBySource, soldBySource] = await Promise.all([
    prisma.leadSource.findMany({ orderBy: [{ isSystem: "desc" }, { key: "asc" }] }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { status: { notIn: ["sold", "lost"] }, firstResponseAt: null },
      _count: { _all: true },
    }),
    prisma.deal.groupBy({ by: ["source"], where: { status: "reserved" }, _count: { _all: true } }),
    prisma.deal.groupBy({ by: ["source"], where: { status: "sold" }, _count: { _all: true } }),
  ]);

  const countMap = (rows: Array<{ source: string | null; _count: { _all: number } }>) =>
    new Map(rows.map((row) => [row.source || "unknown", row._count._all]));
  const leadCounts = countMap(leadsBySource);
  const unansweredCounts = countMap(unansweredBySource);
  const reservationCounts = countMap(reservationsBySource);
  const soldCounts = countMap(soldBySource);
  const metrics = sources.map((source) => ({
    key: source.key,
    leads: leadCounts.get(source.key) || 0,
    unanswered: unansweredCounts.get(source.key) || 0,
    reservations: reservationCounts.get(source.key) || 0,
    sold: soldCounts.get(source.key) || 0,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("sourcesTitle")}</h1>
        <p className="a-page-sub">{t("sourcesSubtitle")}</p>
      </div>
      <SourcesClient sources={JSON.parse(JSON.stringify(sources))} metrics={metrics} />
    </div>
  );
}
