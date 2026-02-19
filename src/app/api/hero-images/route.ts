import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET all hero images
export async function GET() {
  try {
    const images = await prisma.heroImage.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error fetching hero images:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST new hero image (max 3)
export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    
    // Check current count
    const count = await prisma.heroImage.count();
    if (count >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 images allowed" },
        { status: 400 }
      );
    }

    const image = await prisma.heroImage.create({
      data: {
        imageUrl,
        sortOrder: count,
      },
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error("Error creating hero image:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
