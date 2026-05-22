import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { publicBuildingSelect } from "@/lib/public-selects";
import { invalidateProject } from "@/lib/cache";
import { BuildingCreateSchema } from "@/lib/schemas/building";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(req: Request) {
  const featureResponse = requirePlatformFeature("inventory");
  if (featureResponse) return featureResponse;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where: Prisma.BuildingWhereInput = {};
  if (projectId) where.projectId = projectId;

  const buildings = await prisma.building.findMany({
    where,
    select: publicBuildingSelect,
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(buildings);
}

export async function POST(req: Request) {
  const guard = await requirePlatformApiFeature("inventory", "manageInventory");
  if (guard.response) return guard.response;

  const body = await req.json();
  const parsed = BuildingCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);

  const input = parsed.data;
  const building = await prisma.building.create({
    data: {
      name: input.name,
      projectId: input.projectId,
      sortOrder: input.sortOrder || 0,
      polygonData: input.polygonData ?? Prisma.JsonNull,
    },
  });
  invalidateProject();
  return NextResponse.json(building);
}
