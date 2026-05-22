import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidateProject } from "@/lib/cache";
import { HeroImageCreateSchema } from "@/lib/schemas/hero-image";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature, requirePlatformFeature } from "@/lib/platform-guards";

// GET all hero images
export async function GET() {
  try {
    const featureResponse = requirePlatformFeature("publicPage");
    if (featureResponse) return featureResponse;

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
    const guard = await requirePlatformApiFeature("publicPage", "managePublicContent");
    if (guard.response) return guard.response;

    const body = await req.json();
    const parsed = HeroImageCreateSchema.safeParse(body);
    if (!parsed.success) return invalidInput(parsed.error);
    const { imageUrl } = parsed.data;
    
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

    invalidateProject();
    return NextResponse.json(image);
  } catch (error) {
    console.error("Error creating hero image:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
