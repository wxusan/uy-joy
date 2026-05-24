import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { calculateDealFinancials, dealVisibilityWhere, discountReviewPatch, generatePaymentSchedule } from "@/lib/real-estate";
import { PaymentPlanCreateSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("paymentPlans", "manageDeals");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = PaymentPlanCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const deal = await prisma.deal.findFirst({ where: { AND: [{ id }, dealVisibilityWhere(auth.user)] } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const financials = calculateDealFinancials({
    listPrice: input.listPrice || deal.listPrice,
    discountAmount: input.discountAmount ?? deal.discountAmount,
    discountPercent: input.discountPercent ?? deal.discountPercent,
    initialPaymentAmount: input.initialPaymentAmount ?? deal.initialPaymentAmount,
    initialPaymentPercent: input.initialPaymentPercent ?? deal.initialPaymentPercent,
    termMonths: input.termMonths ?? deal.paymentTermMonths,
  });
  const startsAt = input.startDate ? new Date(input.startDate) : new Date();
  const discountTermsChanged =
    input.listPrice !== deal.listPrice ||
    (input.discountAmount ?? deal.discountAmount) !== deal.discountAmount ||
    (input.discountPercent ?? deal.discountPercent) !== deal.discountPercent;
  const scheduleRows = generatePaymentSchedule({
    salePrice: financials.salePrice,
    initialPaymentAmount: financials.initialPaymentAmount,
    remainingAmount: financials.remainingAmount,
    termMonths: financials.paymentTermMonths,
    startsAt,
    currency: deal.currency,
    customSchedule: input.customSchedule,
  });

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentPlan.create({
      data: {
        dealId: id,
        name: input.name,
        type: input.type,
        totalAmount: financials.salePrice,
        initialPaymentAmount: financials.initialPaymentAmount,
        remainingAmount: financials.remainingAmount,
        termMonths: financials.paymentTermMonths,
        startsAt,
        scheduleJson: input.customSchedule ? input.customSchedule : undefined,
        notes: input.notes || null,
        createdById: auth.user?.id || null,
      },
    });
    await tx.deal.update({
      where: { id },
      data: {
        ...financials,
        ...discountReviewPatch({
          discountRequiresApproval: financials.discountRequiresApproval,
          existingFlaggedAt: deal.discountFlaggedAt,
          discountTermsChanged,
        }),
      },
    });
    await createActivity(
      {
        type: "payment",
        title: "To'lov rejasi tayyorlandi",
        clientId: deal.clientId,
        leadId: deal.leadId,
        dealId: id,
        unitId: deal.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: { planId: created.id, rows: scheduleRows.length },
      },
      tx
    );
    if (discountTermsChanged && financials.discountRequiresApproval) {
      await createActivity(
        {
          type: "deal",
          title: "Chegirma tasdiq talab qiladi",
          clientId: deal.clientId,
          leadId: deal.leadId,
          dealId: id,
          unitId: deal.primaryUnitId,
          actorId: auth.user?.id || null,
          metadata: { discountPercent: financials.discountPercent, source: "payment_plan" },
        },
        tx
      );
    }
    return tx.paymentPlan.findUniqueOrThrow({ where: { id: created.id }, include: { payments: true } });
  });

  return NextResponse.json({ ...plan, previewRows: scheduleRows }, { status: 201 });
}
