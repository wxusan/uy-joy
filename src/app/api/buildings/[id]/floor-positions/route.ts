import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PUT - Batch update floor positions for a building
export async function PUT(
  request: NextRequest,
  _context: { params: { id: string } }
) {
  try {
    const { floorPositions } = await request.json();

    if (!Array.isArray(floorPositions)) {
      return NextResponse.json(
        { error: "floorPositions must be an array" },
        { status: 400 }
      );
    }

    // Update each floor's position
    const updates = floorPositions.map(
      (fp: { floorId: string; positionData: string }) =>
        prisma.floor.update({
          where: { id: fp.floorId },
          data: { positionData: fp.positionData },
        })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true, updated: floorPositions.length });
  } catch (error) {
    console.error("Error updating floor positions:", error);
    return NextResponse.json(
      { error: "Failed to update floor positions" },
      { status: 500 }
    );
  }
}
