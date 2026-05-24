import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("documents", "manageDocuments");
  if (auth.response) return auth.response;
  const { id } = await params;
  const document = await prisma.document.update({
    where: { id },
    data: { status: "approved", reviewedById: auth.user?.id || null, rejectionReason: null },
  });
  await createActivity({
    type: "document",
    title: "Hujjat tasdiqlandi",
    clientId: document.clientId,
    leadId: document.leadId,
    dealId: document.dealId,
    unitId: document.unitId,
    actorId: auth.user?.id || null,
    metadata: { documentId: document.id },
  });
  return NextResponse.json(document);
}
