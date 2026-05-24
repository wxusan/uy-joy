import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealInclude } from "@/lib/deal-include";
import { canMarkDealSold } from "@/lib/real-estate";
import { DealCancelSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("deals", "manageDeals");
  if (auth.response) return auth.response;
  if (!canMarkDealSold(auth.user)) return NextResponse.json({ error: "Only director/admin can cancel deals" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const parsed = DealCancelSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const deal = await prisma.$transaction(async (tx) => {
    const existing = await tx.deal.findUnique({ where: { id }, include: { payments: true } });
    if (!existing) throw new Error("NOT_FOUND");

    const paidAmount = existing.payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const updated = await tx.deal.update({
      where: { id },
      data: { status: "cancelled", lostAt: new Date(), lostReason: input.reason },
    });
    await tx.paymentPlan.updateMany({ where: { dealId: id, status: { not: "cancelled" } }, data: { status: "cancelled" } });
    await tx.payment.updateMany({ where: { dealId: id, status: { notIn: ["paid", "partial"] } }, data: { status: "cancelled" } });
    await tx.task.updateMany({ where: { dealId: id, status: "open" }, data: { status: "cancelled" } });

    if (updated.primaryUnitId && existing.status !== "sold" && !input.keepUnitReserved) {
      await tx.unit.update({
        where: { id: updated.primaryUnitId },
        data: {
          status: "available",
          currentDealId: null,
          reservedByClientId: null,
          reservedAt: null,
          reservationExpiresAt: null,
          statusChangedAt: new Date(),
        },
      });
    }

    if (paidAmount > 0) {
      await tx.refund.create({
        data: {
          dealId: id,
          clientId: updated.clientId,
          amount: paidAmount,
          currency: updated.currency,
          reason: input.reason,
          requestedById: auth.user?.id || null,
        },
      });
    }

    await createActivity(
      {
        type: "deal",
        title: "Bitim bekor qilindi",
        clientId: updated.clientId,
        leadId: updated.leadId,
        dealId: updated.id,
        unitId: updated.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: { reason: input.reason, paidAmount, refundRequested: paidAmount > 0 },
      },
      tx
    );
    return tx.deal.findUniqueOrThrow({ where: { id }, include: dealInclude() });
  }).catch((error) => {
    if (error instanceof Error && error.message === "NOT_FOUND") return null;
    throw error;
  });

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}
