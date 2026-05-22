import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDefaultPipelineStages } from "@/lib/crm";
import { leadVisibilityWhere } from "@/lib/crm-access";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;

  await ensureDefaultPipelineStages();
  const settings = getPlatformSettings();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const stages = await prisma.pipelineStage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const leads = await prisma.lead.findMany({
    where: {
      AND: [
        leadVisibilityWhere(auth.user, settings.allowAgentClaim),
        projectId ? { projectId } : {},
        { status: { in: stages.map((stage) => stage.key) } },
      ],
    },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      assignedToUser: { select: { id: true, name: true, email: true } },
      tasks: { where: { status: "open" }, orderBy: { dueAt: "asc" }, take: 1 },
    },
    orderBy: [{ stageEnteredAt: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ stages, leads });
}
