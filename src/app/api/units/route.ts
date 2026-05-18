import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { attachUnitDisplayNumber, publicUnitWithLocationSelect } from "@/lib/public-selects";
import { invalidateProject } from "@/lib/cache";
import { UnitBulkUpdateSchema, UnitCreateSchema } from "@/lib/schemas/unit";
import { invalidInput } from "@/lib/schemas/common";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const floorId = searchParams.get("floorId");
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const rooms = searchParams.get("rooms");
  const all = searchParams.get("all") === "true";

  const where: Prisma.UnitWhereInput = {};
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

  if (all) {
    // The unbounded inventory dump is admin-only — it's the full price /
    // availability list of every unit in one response, which is a prime
    // scraping target for competitors.
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const units = await prisma.unit.findMany({
      where,
      select: publicUnitWithLocationSelect,
      orderBy: [{ floor: { number: "asc" } }, { unitNumber: "asc" }],
    });

    return NextResponse.json(units.map(attachUnitDisplayNumber));
  }

  const page = Math.max(1, parseInt(pageParam || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(limitParam || "50")));
  const skip = (page - 1) * limit;

  const [units, total] = await Promise.all([
    prisma.unit.findMany({
      where,
      select: publicUnitWithLocationSelect,
      orderBy: [{ floor: { number: "asc" } }, { unitNumber: "asc" }],
      take: limit,
      skip,
    }),
    prisma.unit.count({ where }),
  ]);

  return NextResponse.json({ data: units.map(attachUnitDisplayNumber), total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = UnitCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const unit = await prisma.unit.create({
    data: {
      unitNumber: input.unitNumber,
      floorId: input.floorId,
      rooms: input.rooms || 1,
      area: input.area || 0,
      status: input.status || "available",
      pricePerM2: input.pricePerM2 || null,
      totalPrice: input.totalPrice || null,
      polygonData: input.polygonData ?? Prisma.JsonNull,
      labelX: input.labelX || null,
      labelY: input.labelY || null,
      description: input.description || null,
      features: input.features ?? Prisma.JsonNull,
    },
  });

  invalidateProject();
  return NextResponse.json(unit);
}

// Bulk update units
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = UnitBulkUpdateSchema.safeParse(body);
    if (!parsed.success) return invalidInput(parsed.error);
    const { unitIds, data } = parsed.data;

    const updateData: Prisma.UnitUpdateManyMutationInput = {};
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

    invalidateProject();

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Failed to update units" }, { status: 500 });
  }
}
