import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureDefaultPipelineStages } from "@/lib/crm";
import { leadVisibilityWhere } from "@/lib/crm-access";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { normalizePlatformRole } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import PipelineBoard from "./PipelineBoard";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.manageLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;
  const t = await getTranslations("admin");

  await ensureDefaultPipelineStages();
  const user = session.user as { id?: string; role?: string };
  const [stages, leads] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.lead.findMany({
      where: leadVisibilityWhere(user, settings.allowAgentClaim),
      include: {
        client: { select: { id: true, fullName: true, phone: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        tasks: { where: { status: "open" }, orderBy: { dueAt: "asc" }, take: 1 },
      },
      orderBy: [{ stageEnteredAt: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const serializedLeads = leads.map((lead) => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.toISOString() : null,
    lastActivityAt: lead.lastActivityAt ? lead.lastActivityAt.toISOString() : null,
    lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.toISOString() : null,
    nextActionAt: lead.nextActionAt ? lead.nextActionAt.toISOString() : null,
    closedAt: lead.closedAt ? lead.closedAt.toISOString() : null,
    convertedAt: lead.convertedAt ? lead.convertedAt.toISOString() : null,
    stageEnteredAt: lead.stageEnteredAt.toISOString(),
    firstResponseAt: lead.firstResponseAt ? lead.firstResponseAt.toISOString() : null,
    tasks: lead.tasks.map((task) => ({
      ...task,
      dueAt: task.dueAt ? task.dueAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    })),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("pipeline")}</h1>
        <p className="a-page-sub">{t("pipelineSubtitle")}</p>
      </div>
      <PipelineBoard
        initialStages={stages}
        initialLeads={serializedLeads}
        canClaim={["sales_agent", "external_agent"].includes(normalizePlatformRole(user.role) || "")}
      />
    </div>
  );
}
