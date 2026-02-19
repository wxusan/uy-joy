import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const floorId = searchParams.get("floorId");
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const rooms = searchParams.get("rooms");

  const where: any = {};
  if (floorId) where.floorId = floorId;
  if (status) where.status = status;
  if (rooms) where.rooms = parseInt(rooms);
  if (projectId) {
    where.floor = {
      building: {
        projectId,
      },
    };
  }

  const units = await prisma.unit.findMany({
    where,
    include: {
      floor: {
        include: {
          building: true,
        },
      },
    },
    orderBy: [{ floor: { number: "asc" } }, { unitNumber: "asc" }],
  });

  return NextResponse.json(units);
}

export async function POST(req: Request) {
  const body = await req.json();

  const unit = await prisma.unit.create({
    data: {
      unitNumber: body.unitNumber,
      floorId: body.floorId,
      rooms: body.rooms || 1,
      area: body.area || 0,
      status: body.status || "available",
      pricePerM2: body.pricePerM2 || null,
      totalPrice: body.totalPrice || null,
      polygonData: body.polygonData || null,
      labelX: body.labelX || null,
      labelY: body.labelY || null,
      description: body.description || null,
      features: body.features || null,
    },
  });

  return NextResponse.json(unit);
}
