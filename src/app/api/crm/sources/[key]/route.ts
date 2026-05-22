import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { invalidInput } from "@/lib/schemas/common";
import { LeadSourceUpdateSchema } from "@/lib/schemas/public-page";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requirePlatformApiFeature("publicPage", "managePublicContent");
  if (auth.response) return auth.response;
  const { key } = await params;
  const body = await request.json();
  const parsed = LeadSourceUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const existing = await prisma.leadSource.findUnique({ where: { key } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const source = await prisma.leadSource.update({
    where: { key },
    data: {
      ...(input.labelJson !== undefined && { labelJson: input.labelJson as Prisma.InputJsonObject }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.defaultAssignedAgentId !== undefined && { defaultAssignedAgentId: input.defaultAssignedAgentId || null }),
      ...(input.defaultPipelineStageKey !== undefined && { defaultPipelineStageKey: input.defaultPipelineStageKey || null }),
    },
  });
  return NextResponse.json(source);
}

export const PUT = PATCH;
