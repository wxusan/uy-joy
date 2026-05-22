import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { canManagePayments, generatePaymentSchedule } from "@/lib/real-estate";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("paymentPlans", "viewDeals");
  if (auth.response) return auth.response;
  if (!canManagePayments(auth.user)) return NextResponse.json({ error: "Only finance/admin can activate payment plans" }, { status: 403 });
  const { id } = await params;
  const plan = await prisma.paymentPlan.findUnique({ where: { id }, include: { deal: true } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.status !== "draft") return NextResponse.json({ error: "Only draft plans can be activated" }, { status: 400 });
  const active = await prisma.paymentPlan.findFirst({ where: { dealId: plan.dealId, status: "active", NOT: { id } } });
  if (active) return NextResponse.json({ error: "Deal already has an active payment plan" }, { status: 409 });

  const customSchedule = Array.isArray(plan.scheduleJson) ? (plan.scheduleJson as Parameters<typeof generatePaymentSchedule>[0]["customSchedule"]) : null;
  const rows = generatePaymentSchedule({
    salePrice: plan.totalAmount,
    initialPaymentAmount: plan.initialPaymentAmount,
    remainingAmount: plan.remainingAmount,
    termMonths: plan.termMonths,
    startsAt: plan.startsAt || new Date(),
    currency: plan.deal.currency,
    customSchedule,
  });

  const activated = await prisma.$transaction(async (tx) => {
    await tx.paymentPlan.update({ where: { id }, data: { status: "active" } });
    await tx.deal.update({
      where: { id: plan.dealId },
      data: { status: plan.deal.status === "sold" ? "sold" : "payment_active" },
    });
    await tx.payment.createMany({
      data: rows.map((row) => ({
        paymentPlanId: id,
        dealId: plan.dealId,
        clientId: plan.deal.clientId,
        sequence: row.sequence,
        label: row.label,
        dueDate: row.dueDate,
        expectedAmount: row.expectedAmount,
        expectedAmountPaymentCurrency: plan.deal.exchangeRateToPaymentCurrency
          ? row.expectedAmount * plan.deal.exchangeRateToPaymentCurrency
          : null,
        exchangeRate: plan.deal.exchangeRateToPaymentCurrency || null,
      })),
    });
    await createActivity(
      {
        type: "payment",
        title: "Payment plan activated",
        clientId: plan.deal.clientId,
        leadId: plan.deal.leadId,
        dealId: plan.dealId,
        unitId: plan.deal.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: { planId: id, rows: rows.length },
      },
      tx
    );
    return tx.paymentPlan.findUniqueOrThrow({ where: { id }, include: { payments: { orderBy: { sequence: "asc" } } } });
  });

  return NextResponse.json(activated);
}
