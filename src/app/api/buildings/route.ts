import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where: any = {};
  if (projectId) where.projectId = projectId;

  const buildings = await prisma.building.findMany({
    where,
    include: {
      floors: {
        include: { units: true },
        orderBy: { number: "asc" },
      },
    },
  });
  return NextResponse.json(buildings);
}

export async function POST(req: Request) {
  const body = await req.json();
  const building = await prisma.building.create({
    data: {
      name: body.name,
      projectId: body.projectId,
      sortOrder: body.sortOrder || 0,
      polygonData: body.polygonData || null,
    },
  });
  return NextResponse.json(building);
}
