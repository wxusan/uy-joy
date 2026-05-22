import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealInclude } from "@/lib/deal-include";
import { calculateDealFinancials, canMarkDealSold, dealVisibilityWhere, discountReviewPatch } from "@/lib/real-estate";
import { DealUpdateSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("deals", "viewDeals");
  if (auth.response) return auth.response;
  const { id } = await params;
  const deal = await prisma.deal.findFirst({
    where: { AND: [{ id }, dealVisibilityWhere(auth.user)] },
    include: dealInclude(),
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("deals", "manageDeals");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = DealUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const existing = await prisma.deal.findFirst({ where: { AND: [{ id }, dealVisibilityWhere(auth.user)] } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (input.discountApproved && !canMarkDealSold(auth.user)) {
    return NextResponse.json({ error: "Only owner/admin/director can approve discounts" }, { status: 403 });
  }

  const financials =
    input.listPrice !== undefined ||
    input.discountAmount !== undefined ||
    input.discountPercent !== undefined ||
    input.initialPaymentAmount !== undefined ||
    input.initialPaymentPercent !== undefined ||
    input.paymentTermMonths !== undefined
      ? calculateDealFinancials({
          listPrice: input.listPrice ?? existing.listPrice,
          discountAmount: input.discountAmount ?? existing.discountAmount,
          discountPercent: input.discountPercent ?? existing.discountPercent,
          initialPaymentAmount: input.initialPaymentAmount ?? existing.initialPaymentAmount,
          initialPaymentPercent: input.initialPaymentPercent ?? existing.initialPaymentPercent,
          termMonths: input.paymentTermMonths ?? existing.paymentTermMonths,
        })
      : null;
  const discountTermsChanged =
    input.listPrice !== undefined || input.discountAmount !== undefined || input.discountPercent !== undefined;
  const now = new Date();
  const discountPatch = financials
    ? discountReviewPatch({
        discountRequiresApproval: financials.discountRequiresApproval,
        existingFlaggedAt: existing.discountFlaggedAt,
        discountTermsChanged,
        approved: input.discountApproved,
        approvedById: auth.user?.id || null,
        now,
      })
    : {};
  const shouldLogDiscountRequiresApproval = Boolean(
    financials && discountTermsChanged && financials.discountRequiresApproval && !existing.discountFlaggedAt
  );

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...(input.clientId !== undefined && { clientId: input.clientId }),
      ...(input.leadId !== undefined && { leadId: input.leadId || null }),
      ...(input.projectId !== undefined && { projectId: input.projectId || null }),
      ...(input.primaryUnitId !== undefined && { primaryUnitId: input.primaryUnitId || null }),
      ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId || null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.source !== undefined && { source: input.source || null }),
      ...(input.exchangeRateToPaymentCurrency !== undefined && { exchangeRateToPaymentCurrency: input.exchangeRateToPaymentCurrency || null }),
      ...(financials && { ...financials }),
      ...discountPatch,
      ...(input.discountApproved &&
        !financials &&
        existing.discountFlaggedAt && { discountApprovedById: auth.user?.id || null, discountApprovedAt: now }),
      ...(input.expectedCloseAt !== undefined && { expectedCloseAt: input.expectedCloseAt ? new Date(input.expectedCloseAt) : null }),
      ...(input.lostReason !== undefined && { lostReason: input.lostReason || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
    include: dealInclude(),
  });

  await createActivity({
    type: "deal",
    title: "Deal updated",
    clientId: deal.clientId,
    leadId: deal.leadId,
    dealId: deal.id,
    unitId: deal.primaryUnitId,
    actorId: auth.user?.id || null,
  });

  if (shouldLogDiscountRequiresApproval && financials) {
    await createActivity({
      type: "deal",
      title: "Discount requires approval",
      clientId: deal.clientId,
      leadId: deal.leadId,
      dealId: deal.id,
      unitId: deal.primaryUnitId,
      actorId: auth.user?.id || null,
      metadata: { discountPercent: financials.discountPercent, source: "deal_update" },
    });
  }

  return NextResponse.json(deal);
}

export const PUT = PATCH;
