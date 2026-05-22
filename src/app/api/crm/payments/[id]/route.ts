import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { canManagePayments, paymentStatusFromAmounts } from "@/lib/real-estate";
import { PaymentUpdateSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("paymentPlans", "viewDeals");
  if (auth.response) return auth.response;
  if (!canManagePayments(auth.user)) return NextResponse.json({ error: "Only finance/admin can update payments" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const parsed = PaymentUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const existing = await prisma.payment.findUnique({ where: { id }, include: { deal: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const paidAmount = input.paidAmount ?? existing.paidAmount;
  const status = input.status || paymentStatusFromAmounts(existing.expectedAmount, paidAmount, existing.status);
  const payment = await prisma.payment.update({
    where: { id },
    data: {
      paidAmount,
      ...(input.paidAmountPaymentCurrency !== undefined && { paidAmountPaymentCurrency: input.paidAmountPaymentCurrency }),
      status,
      paidAt: status === "paid" ? (input.paidAt ? new Date(input.paidAt) : existing.paidAt || new Date()) : input.paidAt === null ? null : undefined,
      ...(input.method !== undefined && { method: input.method || null }),
      ...(input.receiptDocumentId !== undefined && { receiptDocumentId: input.receiptDocumentId || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
    include: { deal: true, client: true, receiptDocument: true },
  });
  await createActivity({
    type: "payment",
    title: status === "paid" ? "Payment marked paid" : "Payment updated",
    clientId: payment.clientId,
    dealId: payment.dealId,
    unitId: payment.deal.primaryUnitId,
    actorId: auth.user?.id || null,
    metadata: { paymentId: payment.id, status, paidAmount },
  });
  return NextResponse.json(payment);
}

export const PUT = PATCH;
