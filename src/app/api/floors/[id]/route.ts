import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const floor = await prisma.floor.findUnique({
    where: { id: params.id },
    include: {
      units: true,
      building: {
        select: { id: true, name: true, projectId: true },
      },
    },
  });
  if (!floor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(floor);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};

  if (body.number !== undefined) data.number = body.number;
  if (body.basePricePerM2 !== undefined) data.basePricePerM2 = body.basePricePerM2;
  if (body.floorPlanImage !== undefined) data.floorPlanImage = body.floorPlanImage;
  if (body.positionData !== undefined) data.positionData = body.positionData;

  const floor = await prisma.floor.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(floor);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.floor.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
