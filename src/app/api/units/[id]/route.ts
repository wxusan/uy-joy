import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const unit = await prisma.unit.findUnique({
    where: { id: params.id },
    include: {
      floor: {
        include: { building: true },
      },
    },
  });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(unit);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};

  if (body.unitNumber !== undefined) data.unitNumber = body.unitNumber;
  if (body.rooms !== undefined) data.rooms = body.rooms;
  if (body.area !== undefined) data.area = body.area;
  if (body.status !== undefined) {
    data.status = body.status;
    data.statusChangedAt = new Date();
  }
  if (body.pricePerM2 !== undefined) data.pricePerM2 = body.pricePerM2;
  if (body.totalPrice !== undefined) data.totalPrice = body.totalPrice;
  if (body.description !== undefined) data.description = body.description;
  if (body.polygonData !== undefined) data.polygonData = body.polygonData;
  if (body.labelX !== undefined) data.labelX = body.labelX;
  if (body.labelY !== undefined) data.labelY = body.labelY;
  if (body.features !== undefined) data.features = body.features;
  if (body.sketchImage  !== undefined) data.sketchImage  = body.sketchImage;
  if (body.sketchImage2 !== undefined) data.sketchImage2 = body.sketchImage2;
  if (body.sketchImage3 !== undefined) data.sketchImage3 = body.sketchImage3;
  if (body.sketchImage4 !== undefined) data.sketchImage4 = body.sketchImage4;
  // Customer details for reservations/sales
  if (body.customerName !== undefined) data.customerName = body.customerName;
  if (body.customerPhone !== undefined) data.customerPhone = body.customerPhone;
  if (body.customerNotes !== undefined) data.customerNotes = body.customerNotes;

  const unit = await prisma.unit.update({
    where: { id: params.id },
    data,
    include: {
      floor: {
        include: { building: true },
      },
    },
  });

  return NextResponse.json(unit);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.unit.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
