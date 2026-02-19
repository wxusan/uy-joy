import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // 'project', 'building', 'floor', 'unit', 'hero'
    const id = formData.get("id") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WebP, SVG" },
        { status: 400 }
      );
    }

    // Convert file to base64 data URI
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary with automatic optimization
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `uy-joy/${type}`,
      public_id: `${id}-${Date.now()}`,
      transformation: [
        { width: 2000, height: 1500, crop: "limit" }, // Max dimensions
        { quality: "auto:good" }, // Automatic quality optimization
        { fetch_format: "auto" }, // Serve best format (WebP, AVIF, etc.)
      ],
    });

    return NextResponse.json({ url: result.secure_url, filename: result.public_id });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
