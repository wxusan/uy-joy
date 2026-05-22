import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { attachUnitDisplayNumber, publicUnitWithLocationSelect } from "@/lib/public-selects";
import { invalidateProject } from "@/lib/cache";
import { UnitUpdateSchema } from "@/lib/schemas/unit";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const featureResponse = requirePlatformFeature("inventory");
  if (featureResponse) return featureResponse;
  const { id } = await params;

  const unit = await prisma.unit.findUnique({
    where: { id },
    select: publicUnitWithLocationSelect,
  });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(attachUnitDisplayNumber(unit));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlatformApiFeature("inventory", "manageInventory");
  if (guard.response) return guard.response;
  const { id } = await params;

  const body = await req.json();
  const parsed = UnitUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const data: Prisma.UnitUpdateInput = {};

  if (input.status === "reserved" || input.status === "sold") {
    return NextResponse.json(
      { error: "Use the deal workflow to reserve or sell units" },
      { status: 400 }
    );
  }

  if (input.unitNumber !== undefined) data.unitNumber = input.unitNumber;
  if (input.rooms !== undefined) data.rooms = input.rooms;
  if (input.area !== undefined) data.area = input.area;
  if (input.status !== undefined) {
    data.status = input.status;
    data.statusChangedAt = new Date();
  }
  if (input.pricePerM2 !== undefined) data.pricePerM2 = input.pricePerM2;
  if (input.totalPrice !== undefined) data.totalPrice = input.totalPrice;
  if (input.description !== undefined) data.description = input.description;
  if (input.polygonData !== undefined) data.polygonData = input.polygonData ?? Prisma.JsonNull;
  if (input.labelX !== undefined) data.labelX = input.labelX;
  if (input.labelY !== undefined) data.labelY = input.labelY;
  if (input.features !== undefined) data.features = input.features ?? Prisma.JsonNull;
  if (input.sketchImage  !== undefined) data.sketchImage  = input.sketchImage;
  if (input.sketchImage2 !== undefined) data.sketchImage2 = input.sketchImage2;
  if (input.sketchImage3 !== undefined) data.sketchImage3 = input.sketchImage3;
  if (input.sketchImage4 !== undefined) data.sketchImage4 = input.sketchImage4;
  // Customer details for reservations/sales
  if (input.customerName !== undefined) data.customerName = input.customerName;
  if (input.customerPhone !== undefined) data.customerPhone = input.customerPhone;
  if (input.customerNotes !== undefined) data.customerNotes = input.customerNotes;

  const unit = await prisma.unit.update({
    where: { id },
    data,
    include: {
      floor: {
        include: { building: true },
      },
    },
  });

  // Immediately bust the public site cache so users see the update in real time
  invalidateProject();

  return NextResponse.json(unit);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePlatformApiFeature("inventory", "manageInventory");
  if (guard.response) return guard.response;
  const { id } = await params;

  await prisma.unit.delete({ where: { id } });
  invalidateProject();
  return NextResponse.json({ success: true });
}
