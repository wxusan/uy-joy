import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import sharp, { type Metadata } from "sharp";
import { UploadFormSchema } from "@/lib/schemas/upload";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiAccess, requirePlatformApiFeature } from "@/lib/platform-guards";

const UPLOAD_RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const UPLOAD_RATE_LIMIT_MAX = 20;
const uploadAttempts = new Map<string, { count: number; resetAt: number }>();
const mimeBySharpFormat: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"]);
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

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

function extensionFromName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension && extension !== name.toLowerCase() ? extension : "";
}

function safePublicId(id: string | undefined, fallback: string) {
  return `${String(id || fallback).replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}`;
}

function startsWithMagic(buffer: Buffer, magic: Buffer | string) {
  const bytes = typeof magic === "string" ? Buffer.from(magic) : magic;
  return buffer.subarray(0, bytes.length).equals(bytes);
}

async function validateDocumentContent(buffer: Buffer, extension: string, mimeType: string) {
  if (extension === "pdf") return startsWithMagic(buffer, "%PDF-");
  if (extension === "doc" || extension === "xls") return startsWithMagic(buffer, OLE_MAGIC);
  if (extension === "docx" || extension === "xlsx") return startsWithMagic(buffer, "PK\x03\x04");
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    try {
      const metadata = await sharp(buffer).metadata();
      const detectedMime = metadata.format ? mimeBySharpFormat[metadata.format] : undefined;
      return detectedMime === mimeType;
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requirePlatformApiAccess();
    if (guard.response) return guard.response;

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

    if (type === "document") {
      const documentGuard = await requirePlatformApiFeature("documents", "viewDeals");
      if (documentGuard.response) return documentGuard.response;

      const extension = extensionFromName(file.name);
      if (!DOCUMENT_MIME_TYPES.has(file.type) || !DOCUMENT_EXTENSIONS.has(extension)) {
        return NextResponse.json(
          { error: "Invalid document type. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX, XLS, XLSX" },
          { status: 400 }
        );
      }
      const contentMatchesType = await validateDocumentContent(buffer, extension, file.type);
      if (!contentMatchesType) {
        return NextResponse.json({ error: "Document content does not match its file type" }, { status: 400 });
      }

      const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "uy-joy/documents",
        public_id: safePublicId(id, "document"),
        resource_type: "auto",
        use_filename: true,
        unique_filename: false,
      });

      return NextResponse.json({
        url: result.secure_url,
        filename: result.public_id,
        originalFilename: file.name,
        size: file.size,
        mimeType: file.type,
      });
    }

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
      public_id: safePublicId(id, "upload"),
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
