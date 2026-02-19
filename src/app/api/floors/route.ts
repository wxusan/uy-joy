import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const buildingId = searchParams.get("buildingId");

  const where: any = {};
  if (buildingId) where.buildingId = buildingId;

  const floors = await prisma.floor.findMany({
    where,
    include: { units: true },
    orderBy: { number: "asc" },
  });
  return NextResponse.json(floors);
}

export async function POST(req: Request) {
  const body = await req.json();
  const floor = await prisma.floor.create({
    data: {
      number: body.number,
      buildingId: body.buildingId,
      basePricePerM2: body.basePricePerM2,
    },
  });
  return NextResponse.json(floor);
}
