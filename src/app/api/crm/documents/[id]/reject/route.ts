import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { DocumentRejectSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("documents", "manageDocuments");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = DocumentRejectSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const document = await prisma.document.update({
    where: { id },
    data: { status: "rejected", reviewedById: auth.user?.id || null, rejectionReason: parsed.data.rejectionReason },
  });
  await createActivity({
    type: "document",
    title: "Document rejected",
    clientId: document.clientId,
    leadId: document.leadId,
    dealId: document.dealId,
    unitId: document.unitId,
    actorId: auth.user?.id || null,
    metadata: { documentId: document.id, rejectionReason: parsed.data.rejectionReason },
  });
  return NextResponse.json(document);
}
