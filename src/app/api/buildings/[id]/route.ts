import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const building = await prisma.building.findUnique({
    where: { id: params.id },
    include: {
      floors: {
        include: { units: true },
        orderBy: { number: "asc" },
      },
    },
  });
  if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(building);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.frontViewImage !== undefined) data.frontViewImage = body.frontViewImage;
  if (body.backViewImage !== undefined) data.backViewImage = body.backViewImage;
  if (body.leftViewImage !== undefined) data.leftViewImage = body.leftViewImage;
  if (body.rightViewImage !== undefined) data.rightViewImage = body.rightViewImage;
  if (body.positionData !== undefined) data.positionData = body.positionData;
  if (body.polygonData !== undefined) data.polygonData = body.polygonData;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const building = await prisma.building.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(building);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.building.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
