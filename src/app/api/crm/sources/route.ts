import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ensureDefaultLeadSources, normalizeLeadSource } from "@/lib/lead-sources";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { invalidInput } from "@/lib/schemas/common";
import { LeadSourceCreateSchema } from "@/lib/schemas/public-page";

export async function GET() {
  const auth = await requirePlatformApiFeature("publicPage", "managePublicContent");
  if (auth.response) return auth.response;
  await ensureDefaultLeadSources();
  const sources = await prisma.leadSource.findMany({ orderBy: [{ isSystem: "desc" }, { key: "asc" }] });
  return NextResponse.json({ data: sources });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("publicPage", "managePublicContent");
  if (auth.response) return auth.response;
  const body = await request.json();
  const parsed = LeadSourceCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const key = normalizeLeadSource(input.key) || input.key;
  const source = await prisma.leadSource.upsert({
    where: { key },
    create: {
      key,
      labelJson: input.labelJson ? (input.labelJson as Prisma.InputJsonObject) : Prisma.JsonNull,
      isSystem: false,
      isActive: input.isActive ?? true,
      defaultAssignedAgentId: input.defaultAssignedAgentId || null,
      defaultPipelineStageKey: input.defaultPipelineStageKey || null,
    },
    update: {
      ...(input.labelJson !== undefined && { labelJson: input.labelJson as Prisma.InputJsonObject }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.defaultAssignedAgentId !== undefined && { defaultAssignedAgentId: input.defaultAssignedAgentId || null }),
      ...(input.defaultPipelineStageKey !== undefined && { defaultPipelineStageKey: input.defaultPipelineStageKey || null }),
    },
  });
  return NextResponse.json(source, { status: 201 });
}
