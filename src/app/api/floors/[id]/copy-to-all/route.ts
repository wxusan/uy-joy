import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  // Get the source floor with its units
  const sourceFloor = await prisma.floor.findUnique({
    where: { id: params.id },
    include: { units: true, building: true },
  });

  if (!sourceFloor) {
    return NextResponse.json({ error: "Floor not found" }, { status: 404 });
  }

  // Get all other floors in the same building
  const otherFloors = await prisma.floor.findMany({
    where: {
      buildingId: sourceFloor.buildingId,
      id: { not: sourceFloor.id },
    },
    include: { units: true },
  });

  let copiedCount = 0;

  for (const targetFloor of otherFloors) {
    // Delete existing units on target floor
    await prisma.unit.deleteMany({
      where: { floorId: targetFloor.id },
    });

    // Copy floor plan image
    await prisma.floor.update({
      where: { id: targetFloor.id },
      data: { floorPlanImage: sourceFloor.floorPlanImage },
    });

    // Copy units with adjusted unit numbers
    for (const unit of sourceFloor.units) {
      // Replace floor number in unit number (e.g., "101" -> "201" for floor 2)
      const newUnitNumber = unit.unitNumber.replace(
        /^\d+/,
        targetFloor.number.toString()
      );

      await prisma.unit.create({
        data: {
          unitNumber: newUnitNumber,
          floorId: targetFloor.id,
          rooms: unit.rooms,
          area: unit.area,
          status: "available", // Reset status for new floors
          pricePerM2: unit.pricePerM2,
          polygonData: unit.polygonData,
          labelX: unit.labelX,
          labelY: unit.labelY,
          sketchImage:  unit.sketchImage,
          sketchImage2: unit.sketchImage2,
          sketchImage3: unit.sketchImage3,
          sketchImage4: unit.sketchImage4,
          description: unit.description,
          descriptionTranslations: unit.descriptionTranslations,
          features: unit.features,
        },
      });
    }

    copiedCount++;
  }

  return NextResponse.json({
    success: true,
    message: `Layout copied to ${copiedCount} floors`,
    copiedCount,
  });
}
