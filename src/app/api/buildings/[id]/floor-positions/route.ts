import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { FloorPositionsUpdateSchema } from "@/lib/schemas/building";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

// PUT - Batch update floor positions for a building
export async function PUT(request: NextRequest) {
  try {
    const guard = await requirePlatformApiFeature("inventory", "manageInventory");
    if (guard.response) return guard.response;

    const body = await request.json();
    const parsed = FloorPositionsUpdateSchema.safeParse(body);
    if (!parsed.success) return invalidInput(parsed.error);
    const { floorPositions } = parsed.data;

    // Update each floor's position
    const updates = floorPositions.map(
      (fp: {
        floorId: string;
        positionData: {
          yStart?: number;
          yEnd?: number;
          polygon?: { x: number; y: number }[];
          label?: { x: number; y: number } | null;
        };
      }) =>
        prisma.floor.update({
          where: { id: fp.floorId },
          data: { positionData: fp.positionData },
        })
    );

    await prisma.$transaction(updates);
    revalidateTag("project");

    return NextResponse.json({ success: true, updated: floorPositions.length });
  } catch (error) {
    console.error("Error updating floor positions:", error);
    return NextResponse.json(
      { error: "Failed to update floor positions" },
      { status: 500 }
    );
  }
}
