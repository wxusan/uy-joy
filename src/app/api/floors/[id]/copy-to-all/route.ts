import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { invalidateProject } from "@/lib/cache";

type Point = { x: number; y: number };

const parsePolygon = (value: Prisma.JsonValue | null): Point[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((point): point is Point => {
    if (!point || typeof point !== "object" || Array.isArray(point)) return false;
    const maybePoint = point as Record<string, unknown>;
    return typeof maybePoint.x === "number" && typeof maybePoint.y === "number";
  });
};

const getPolygonCenter = (value: Prisma.JsonValue | null) => {
  const points = parsePolygon(value);
  if (points.length === 0) return { x: 0, y: 0 };

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
};

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

  // Source floor is the source of truth — do not mutate its units.
  // Order source units by their polygon center (top→bottom, left→right) so
  // their position in the array is stable across target floors.
  const sourceUnits = [...sourceFloor.units]
    .map((unit) => ({ unit, center: getPolygonCenter(unit.polygonData) }))
    .sort((a, b) => a.center.y - b.center.y || a.center.x - b.center.x)
    .map(({ unit }) => unit);

  // Build the full set of operations as one interactive transaction. If any
  // step fails, no floor is left half-updated.
  await prisma.$transaction(async (tx) => {
    for (const targetFloor of otherFloors) {
      // Snapshot the existing units on the target floor so we can preserve
      // reserved/sold ones (and their customer PII) at the same position.
      const existingTargetUnits = [...targetFloor.units]
        .map((unit) => ({ unit, center: getPolygonCenter(unit.polygonData) }))
        .sort((a, b) => a.center.y - b.center.y || a.center.x - b.center.x)
        .map(({ unit }) => unit);

      // Copy the floor plan image
      await tx.floor.update({
        where: { id: targetFloor.id },
        data: { floorPlanImage: sourceFloor.floorPlanImage },
      });

      for (let index = 0; index < sourceUnits.length; index++) {
        const sourceUnit = sourceUnits[index];
        const existingAtPosition = existingTargetUnits[index];

        // Preserve reserved/sold units at this position: keep their status,
        // customer PII, pricing — only refresh the layout-related fields if
        // we wanted to (we don't, to avoid surprising the sales team).
        if (
          existingAtPosition &&
          (existingAtPosition.status === "reserved" ||
            existingAtPosition.status === "sold")
        ) {
          continue;
        }

        const newUnitNumber = `${targetFloor.number}${String(index + 1).padStart(2, "0")}`;

        if (existingAtPosition) {
          // Overwrite an existing available unit in-place so we keep the same row.
          await tx.unit.update({
            where: { id: existingAtPosition.id },
            data: {
              unitNumber: newUnitNumber,
              rooms: sourceUnit.rooms,
              area: sourceUnit.area,
              status: "available",
              pricePerM2: sourceUnit.pricePerM2,
              polygonData: sourceUnit.polygonData ?? Prisma.JsonNull,
              labelX: sourceUnit.labelX,
              labelY: sourceUnit.labelY,
              sketchImage: sourceUnit.sketchImage,
              sketchImage2: sourceUnit.sketchImage2,
              sketchImage3: sourceUnit.sketchImage3,
              sketchImage4: sourceUnit.sketchImage4,
              description: sourceUnit.description,
              descriptionTranslations: sourceUnit.descriptionTranslations,
              features: sourceUnit.features ?? Prisma.JsonNull,
              customerName: null,
              customerPhone: null,
              customerNotes: null,
            },
          });
        } else {
          // No existing unit at this position — create a fresh available one.
          await tx.unit.create({
            data: {
              unitNumber: newUnitNumber,
              floorId: targetFloor.id,
              rooms: sourceUnit.rooms,
              area: sourceUnit.area,
              status: "available",
              pricePerM2: sourceUnit.pricePerM2,
              polygonData: sourceUnit.polygonData ?? Prisma.JsonNull,
              labelX: sourceUnit.labelX,
              labelY: sourceUnit.labelY,
              sketchImage: sourceUnit.sketchImage,
              sketchImage2: sourceUnit.sketchImage2,
              sketchImage3: sourceUnit.sketchImage3,
              sketchImage4: sourceUnit.sketchImage4,
              description: sourceUnit.description,
              descriptionTranslations: sourceUnit.descriptionTranslations,
              features: sourceUnit.features ?? Prisma.JsonNull,
            },
          });
        }
      }

      // Remove any leftover available units on the target floor that go past
      // the source unit count (they don't match the new layout). Reserved/sold
      // units are kept regardless of position.
      const leftoverAvailable = existingTargetUnits
        .slice(sourceUnits.length)
        .filter((unit) => unit.status !== "reserved" && unit.status !== "sold");

      if (leftoverAvailable.length > 0) {
        await tx.unit.deleteMany({
          where: { id: { in: leftoverAvailable.map((unit) => unit.id) } },
        });
      }
    }
  });

  // Count preserved (reserved/sold) units per target floor so the UI can
  // surface this in the confirmation modal too.
  const preservedByFloor = otherFloors.map((floor) => ({
    floorId: floor.id,
    floorNumber: floor.number,
    preservedCount: floor.units.filter(
      (unit) => unit.status === "reserved" || unit.status === "sold"
    ).length,
  }));

  invalidateProject();

  return NextResponse.json({
    success: true,
    copiedCount: otherFloors.length,
    preservedByFloor,
  });
}
