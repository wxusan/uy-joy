import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";

// Max dimensions for different upload types
const MAX_DIMENSIONS = {
  project: { width: 1200, height: 800 },
  building: { width: 1200, height: 800 },
  floor: { width: 2000, height: 1500 },
  sketch: { width: 1200, height: 1200 },
};

// Quality settings
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const PNG_COMPRESSION = 9;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // 'project', 'building', 'floor', 'sketch'
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

    // Create upload directory structure
    const uploadDir = path.join(process.cwd(), "public", "uploads", type);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Get file bytes
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);

    // Get max dimensions for this type
    const dimensions = MAX_DIMENSIONS[type as keyof typeof MAX_DIMENSIONS] || MAX_DIMENSIONS.project;

    // Optimize image if not SVG
    let outputExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    
    if (file.type !== "image/svg+xml") {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if larger than max dimensions
      if (metadata.width && metadata.height) {
        if (metadata.width > dimensions.width || metadata.height > dimensions.height) {
          image.resize(dimensions.width, dimensions.height, {
            fit: "inside",
            withoutEnlargement: true,
          });
        }
      }

      // Convert and compress based on original format
      if (file.type === "image/jpeg") {
        buffer = await image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
        outputExt = "jpg";
      } else if (file.type === "image/png") {
        buffer = await image.png({ compressionLevel: PNG_COMPRESSION }).toBuffer();
        outputExt = "png";
      } else if (file.type === "image/webp") {
        buffer = await image.webp({ quality: WEBP_QUALITY }).toBuffer();
        outputExt = "webp";
      }
    }

    // Generate unique filename with optimized extension
    const timestamp = Date.now();
    const filename = `${id}-${timestamp}.${outputExt}`;
    const filepath = path.join(uploadDir, filename);

    // Write optimized file
    await writeFile(filepath, buffer);

    // Return public URL
    const publicUrl = `/uploads/${type}/${filename}`;

    return NextResponse.json({ url: publicUrl, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
