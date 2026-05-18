import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { publicFloorSelect } from "@/lib/public-selects";
import { invalidateProject } from "@/lib/cache";
import { FloorCreateSchema } from "@/lib/schemas/floor";
import { invalidInput } from "@/lib/schemas/common";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const buildingId = searchParams.get("buildingId");

  const where: Prisma.FloorWhereInput = {};
  if (buildingId) where.buildingId = buildingId;

  const floors = await prisma.floor.findMany({
    where,
    select: publicFloorSelect,
    orderBy: { number: "asc" },
  });
  return NextResponse.json(floors);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = FloorCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const floor = await prisma.floor.create({
    data: {
      number: input.number,
      buildingId: input.buildingId,
      basePricePerM2: input.basePricePerM2,
    },
  });
  invalidateProject();
  return NextResponse.json(floor);
}
