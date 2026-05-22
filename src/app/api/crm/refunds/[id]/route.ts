import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { invalidInput } from "@/lib/schemas/common";
import { RefundUpdateSchema } from "@/lib/schemas/real-estate";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("paymentPlans", "managePayments");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = RefundUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const existing = await prisma.refund.findUnique({ where: { id }, include: { deal: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (input.status === "paid" && existing.status !== "approved") {
    return NextResponse.json({ error: "Refund must be approved before it can be marked paid" }, { status: 400 });
  }

  const now = new Date();
  const refund = await prisma.$transaction(async (tx) => {
    const updated = await tx.refund.update({
      where: { id },
      data: {
        status: input.status,
        notes: input.notes ?? existing.notes,
        ...(input.status === "approved" || input.status === "rejected"
          ? { approvedById: auth.user?.id || null }
          : {}),
        ...(input.status === "paid" ? { paidAt: now } : {}),
      },
      include: { deal: true, payment: true, requestedBy: true, approvedBy: true },
    });

    await createActivity(
      {
        type: "payment",
        title: `Refund ${input.status}`,
        clientId: updated.clientId,
        dealId: updated.dealId,
        unitId: updated.deal.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: { refundId: updated.id, amount: updated.amount, currency: updated.currency, status: input.status },
      },
      tx
    );

    return updated;
  });

  return NextResponse.json(refund);
}

export const PUT = PATCH;
