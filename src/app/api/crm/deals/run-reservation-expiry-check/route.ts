import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { requireCronSecret } from "@/lib/platform-guards";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const cron = requireCronSecret(request);
  if (cron) return cron;
  const now = new Date();
  const expired = await prisma.deal.findMany({
    where: {
      status: "reserved",
      reservationExpiresAt: { lt: now },
    },
  });
  await prisma.$transaction(async (tx) => {
    for (const deal of expired) {
      await createActivity(
        {
          type: "system",
          title: "Reservation expired",
          clientId: deal.clientId,
          leadId: deal.leadId,
          dealId: deal.id,
          unitId: deal.primaryUnitId,
          channel: "system",
          metadata: { reservationExpiresAt: deal.reservationExpiresAt?.toISOString() },
        },
        tx
      );
      if (deal.assignedToId) {
        await tx.task.create({
          data: {
            title: "Expired reservation needs review",
            type: "other",
            priority: "urgent",
            clientId: deal.clientId,
            leadId: deal.leadId,
            dealId: deal.id,
            unitId: deal.primaryUnitId,
            assignedToId: deal.assignedToId,
            dueAt: now,
          },
        });
      }
    }
  });
  logger.info("reservation_expiry_check_processed", { expired: expired.length });
  return NextResponse.json({ expired: expired.length });
}
