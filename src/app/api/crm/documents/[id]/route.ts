import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentUpdateSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("documents", "manageDocuments");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = DocumentUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const document = await prisma.document.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.fileUrl !== undefined && { fileUrl: input.fileUrl }),
      ...(input.fileName !== undefined && { fileName: input.fileName || null }),
      ...(input.fileSize !== undefined && { fileSize: input.fileSize || null }),
      ...(input.mimeType !== undefined && { mimeType: input.mimeType || null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }),
    },
  });
  return NextResponse.json(document);
}

export const PUT = PATCH;
