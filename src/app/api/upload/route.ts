import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import sharp, { type Metadata } from "sharp";
import { UploadFormSchema } from "@/lib/schemas/upload";
import { invalidInput } from "@/lib/schemas/common";

const UPLOAD_RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const UPLOAD_RATE_LIMIT_MAX = 20;
const uploadAttempts = new Map<string, { count: number; resetAt: number }>();
const mimeBySharpFormat: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  for (const [ip, entry] of Array.from(uploadAttempts.entries())) {
    if (entry.resetAt <= now) uploadAttempts.delete(ip);
  }

  const entry = uploadAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    uploadAttempts.set(key, { count: 1, resetAt: now + UPLOAD_RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > UPLOAD_RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  try {
    if (isRateLimited(getClientIp(req))) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again shortly." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const parsed = UploadFormSchema.safeParse({
      file: formData.get("file"),
      type: formData.get("type"),
      id: formData.get("id"),
    });
    if (!parsed.success) return invalidInput(parsed.error);
    const { file, type, id } = parsed.data;

    if (file.size > 10_000_000) {
      return NextResponse.json({ error: "File is too large. Max size is 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let metadata: Metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WebP" },
        { status: 400 }
      );
    }
    const detectedMime = metadata.format ? mimeBySharpFormat[metadata.format] : undefined;

    if (!metadata.width || !metadata.height || !detectedMime) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Convert file to base64 data URI
    const base64 = buffer.toString("base64");
    const dataUri = `data:${detectedMime};base64,${base64}`;

    // Upload to Cloudinary with automatic optimization
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `uy-joy/${type}`,
      public_id: `${String(id || "upload").replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}`,
      resource_type: "image",
      flags: "strip_profile",
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
