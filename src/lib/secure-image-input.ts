import { promises as fs } from "fs";
import path from "path";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PUBLIC_UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads");
const ALLOWED_EXTERNAL_HOSTS = new Set(["res.cloudinary.com"]);
const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXT));

export class ImageInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ImageInputError";
    this.status = status;
  }
}

function getMimeFromPath(filePath: string) {
  const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()];
  if (!mimeType) {
    throw new ImageInputError("Unsupported image type");
  }
  return mimeType;
}

async function readLocalUpload(imageUrl: string) {
  const relativePath = imageUrl.replace(/^\/+/, "");
  if (!relativePath.startsWith("uploads/") || relativePath.includes("\0")) {
    throw new ImageInputError("Invalid upload path");
  }

  const resolved = path.resolve(process.cwd(), "public", relativePath);
  if (resolved !== PUBLIC_UPLOADS_DIR && !resolved.startsWith(`${PUBLIC_UPLOADS_DIR}${path.sep}`)) {
    throw new ImageInputError("Invalid upload path");
  }

  const stat = await fs.stat(resolved);
  if (!stat.isFile()) {
    throw new ImageInputError("Image not found", 404);
  }
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new ImageInputError("Image is too large");
  }

  const fileBuffer = await fs.readFile(resolved);
  return {
    base64: fileBuffer.toString("base64"),
    mimeType: getMimeFromPath(resolved),
  };
}

async function fetchCloudinaryImage(imageUrl: string) {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new ImageInputError("Invalid image URL");
  }

  if (url.protocol !== "https:" || !ALLOWED_EXTERNAL_HOSTS.has(url.hostname)) {
    throw new ImageInputError("External images must come from Cloudinary");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;

  try {
    response = await fetch(url, { signal: controller.signal });
  } catch {
    throw new ImageInputError("Unable to fetch image");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ImageInputError("Unable to fetch image");
  }

  const lengthHeader = Number(response.headers.get("content-length") || 0);
  if (lengthHeader > MAX_IMAGE_BYTES) {
    throw new ImageInputError("Image is too large");
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ImageInputError("Unsupported image type");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageInputError("Image is too large");
  }

  return {
    base64: Buffer.from(arrayBuffer).toString("base64"),
    mimeType,
  };
}

export async function readSafeImageInput(imageUrl: unknown) {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new ImageInputError("Image URL is required");
  }

  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    return readLocalUpload(trimmed);
  }

  return fetchCloudinaryImage(trimmed);
}
