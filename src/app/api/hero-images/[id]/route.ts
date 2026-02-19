import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DELETE hero image
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.heroImage.delete({
      where: { id },
    });

    // Reorder remaining images
    const remaining = await prisma.heroImage.findMany({
      orderBy: { sortOrder: "asc" },
    });
    
    for (let i = 0; i < remaining.length; i++) {
      await prisma.heroImage.update({
        where: { id: remaining[i].id },
        data: { sortOrder: i },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hero image:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
