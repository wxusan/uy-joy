import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { publicUnitSelect } from "@/lib/public-selects";
import { invalidateProject } from "@/lib/cache";
import { FloorUpdateSchema } from "@/lib/schemas/floor";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const featureResponse = requirePlatformFeature("inventory");
  if (featureResponse) return featureResponse;

  const floor = await prisma.floor.findUnique({
    where: { id: params.id },
    include: {
      units: {
        select: publicUnitSelect,
      },
      building: {
        select: { id: true, name: true, projectId: true },
      },
    },
  });
  if (!floor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(floor);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requirePlatformApiFeature("inventory", "manageInventory");
  if (guard.response) return guard.response;

  const body = await req.json();
  const parsed = FloorUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const data: Prisma.FloorUpdateInput = {};

  if (input.number !== undefined) data.number = input.number;
  if (input.basePricePerM2 !== undefined) data.basePricePerM2 = input.basePricePerM2;
  if (input.floorPlanImage !== undefined) data.floorPlanImage = input.floorPlanImage;
  if (input.positionData !== undefined) data.positionData = input.positionData ?? Prisma.JsonNull;

  const floor = await prisma.floor.update({
    where: { id: params.id },
    data,
  });
  invalidateProject();
  return NextResponse.json(floor);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requirePlatformApiFeature("inventory", "manageInventory");
  if (guard.response) return guard.response;

  await prisma.floor.delete({ where: { id: params.id } });
  invalidateProject();
  return NextResponse.json({ success: true });
}
