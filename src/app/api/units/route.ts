import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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

  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  // Paginate only when page param is explicitly provided
  if (pageParam !== null) {
    const page = Math.max(1, parseInt(pageParam || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(limitParam || "50")));
    const skip = (page - 1) * limit;

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        include: { floor: { include: { building: true } } },
        orderBy: [{ floor: { number: "asc" } }, { unitNumber: "asc" }],
        take: limit,
        skip,
      }),
      prisma.unit.count({ where }),
    ]);

    return NextResponse.json({ data: units, total, page, pages: Math.ceil(total / limit) });
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

// Bulk update units
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { unitIds, data } = body;

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json({ error: "No unit IDs provided" }, { status: 400 });
    }

    const updateData: any = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
      updateData.statusChangedAt = new Date();
    }
    if (data.pricePerM2 !== undefined) updateData.pricePerM2 = data.pricePerM2;
    if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice;

    // We use Prisma's updateMany for bulk operations
    const result = await prisma.unit.updateMany({
      where: {
        id: { in: unitIds }
      },
      data: updateData
    });

    revalidateTag("project");

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Failed to update units" }, { status: 500 });
  }
}
