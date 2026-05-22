import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { canManageDocuments, dealVisibilityWhere } from "@/lib/real-estate";
import { DocumentCreateSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

function documentInclude() {
  return {
    client: { select: { id: true, fullName: true } },
    lead: { select: { id: true, name: true } },
    deal: { select: { id: true, dealNumber: true, status: true } },
    unit: { select: { id: true, unitNumber: true } },
    payment: { select: { id: true, label: true, status: true } },
    uploadedBy: { select: { id: true, name: true, email: true } },
    reviewedBy: { select: { id: true, name: true, email: true } },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("documents", "viewDeals");
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const leadId = searchParams.get("leadId");
  const dealId = searchParams.get("dealId");
  const unitId = searchParams.get("unitId");
  const paymentId = searchParams.get("paymentId");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const documentScope: Prisma.DocumentWhereInput = canManageDocuments(auth.user)
    ? {}
    : {
        OR: [
          { deal: { is: dealVisibilityWhere(auth.user) } },
          { payment: { is: { deal: { is: dealVisibilityWhere(auth.user) } } } },
        ],
      };
  const where: Prisma.DocumentWhereInput = {
    AND: [
      documentScope,
      clientId ? { clientId } : {},
      leadId ? { leadId } : {},
      dealId ? { dealId } : {},
      unitId ? { unitId } : {},
      paymentId ? { paymentId } : {},
      type ? { type } : {},
      status ? { status } : {},
    ],
  };
  const documents = await prisma.document.findMany({
    where,
    include: documentInclude(),
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: documents });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("documents", "viewDeals");
  if (auth.response) return auth.response;
  const body = await request.json();
  const parsed = DocumentCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  if (!canManageDocuments(auth.user)) {
    const linkedDealId = input.dealId || (input.paymentId ? (await prisma.payment.findUnique({ where: { id: input.paymentId } }))?.dealId : null);
    if (!linkedDealId) return NextResponse.json({ error: "Document must be linked to a visible deal" }, { status: 403 });
    const visibleDeal = await prisma.deal.findFirst({
      where: { AND: [{ id: linkedDealId }, dealVisibilityWhere(auth.user)] },
      select: { id: true },
    });
    if (!visibleDeal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const document = await prisma.document.create({
    data: {
      clientId: input.clientId || null,
      leadId: input.leadId || null,
      dealId: input.dealId || null,
      unitId: input.unitId || null,
      paymentId: input.paymentId || null,
      uploadedById: auth.user?.id || null,
      type: input.type,
      title: input.title,
      fileUrl: input.fileUrl,
      fileName: input.fileName || null,
      fileSize: input.fileSize || null,
      mimeType: input.mimeType || null,
      status: input.status,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
    include: documentInclude(),
  });

  await createActivity({
    type: "document",
    title: "Document uploaded",
    clientId: document.clientId,
    leadId: document.leadId,
    dealId: document.dealId,
    unitId: document.unitId,
    actorId: auth.user?.id || null,
    metadata: { documentId: document.id, documentType: document.type },
  });

  return NextResponse.json(document, { status: 201 });
}
