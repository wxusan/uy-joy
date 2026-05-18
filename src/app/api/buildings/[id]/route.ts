import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { publicBuildingSelect } from "@/lib/public-selects";
import { invalidateProject } from "@/lib/cache";
import { BuildingUpdateSchema } from "@/lib/schemas/building";
import { invalidInput } from "@/lib/schemas/common";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const building = await prisma.building.findUnique({
    where: { id: params.id },
    select: publicBuildingSelect,
  });
  if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(building);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = BuildingUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);

  const input = parsed.data;
  const data: Prisma.BuildingUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.frontViewImage !== undefined) data.frontViewImage = input.frontViewImage;
  if (input.backViewImage !== undefined) data.backViewImage = input.backViewImage;
  if (input.leftViewImage !== undefined) data.leftViewImage = input.leftViewImage;
  if (input.rightViewImage !== undefined) data.rightViewImage = input.rightViewImage;
  if (input.polygonData !== undefined) data.polygonData = input.polygonData ?? Prisma.JsonNull;
  if (input.labelX !== undefined) data.labelX = input.labelX;
  if (input.labelY !== undefined) data.labelY = input.labelY;
  if (input.pointX !== undefined) data.pointX = input.pointX;
  if (input.pointY !== undefined) data.pointY = input.pointY;
  if (input.labelScale !== undefined) data.labelScale = input.labelScale;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  const building = await prisma.building.update({
    where: { id: params.id },
    data,
  });
  invalidateProject();
  return NextResponse.json(building);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.building.delete({ where: { id: params.id } });
  invalidateProject();
  return NextResponse.json({ success: true });
}
