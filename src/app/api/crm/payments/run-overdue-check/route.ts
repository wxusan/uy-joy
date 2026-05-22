import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { requireCronSecret } from "@/lib/platform-guards";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const cron = requireCronSecret(request);
  if (cron) return cron;

  const now = new Date();
  const overdue = await prisma.payment.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ["scheduled", "partial"] },
      paidAmount: { lt: prisma.payment.fields.expectedAmount },
    },
    include: { deal: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const payment of overdue) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "overdue" } });
      await createActivity(
        {
          type: "payment",
          title: "Payment marked overdue",
          clientId: payment.clientId,
          dealId: payment.dealId,
          unitId: payment.deal.primaryUnitId,
          channel: "system",
          metadata: { paymentId: payment.id, dueDate: payment.dueDate.toISOString() },
        },
        tx
      );
    }
  });

  logger.info("payment_overdue_check_processed", { updated: overdue.length });
  return NextResponse.json({ updated: overdue.length });
}
