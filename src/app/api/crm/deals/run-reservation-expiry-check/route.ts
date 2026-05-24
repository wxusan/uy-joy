import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCronSecret } from "@/lib/platform-guards";
import { logger } from "@/lib/logger";
import { createTelegramAlertLog } from "@/lib/telegram";
import { automationRefExists, createAutomationActivity } from "@/lib/automation-rules";

export async function POST(request: Request) {
  const cron = requireCronSecret(request);
  if (cron) return cron;
  const now = new Date();
  const warningBy = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const expiring = await prisma.deal.findMany({
    where: {
      status: "reserved",
      reservationExpiresAt: { gte: now, lte: warningBy },
    },
    include: {
      client: { select: { fullName: true, phone: true } },
      assignedTo: { select: { name: true, email: true } },
      primaryUnit: { include: { floor: { include: { building: true } } } },
    },
  });
  const expired = await prisma.deal.findMany({
    where: {
      status: "reserved",
      reservationExpiresAt: { lt: now },
    },
    include: {
      client: { select: { fullName: true, phone: true } },
      assignedTo: { select: { name: true, email: true } },
      primaryUnit: { include: { floor: { include: { building: true } } } },
    },
  });
  let warned = 0;
  let expiredLogged = 0;

  await prisma.$transaction(async (tx) => {
    for (const deal of expiring) {
      const ref = `reservation_warning_${deal.id}_${deal.reservationExpiresAt?.toISOString()}`;
      if (await automationRefExists(ref, tx)) continue;

      await createAutomationActivity(
        {
          ref,
          title: "Bron muddati tugayapti",
          body: deal.reservationExpiresAt
            ? `Bron muddati ${deal.reservationExpiresAt.toLocaleString()} da tugaydi. Klient bilan qayta aloqa qiling.`
            : "Bron muddati tugash arafasida. Klient bilan qayta aloqa qiling.",
          clientId: deal.clientId,
          leadId: deal.leadId,
          dealId: deal.id,
          unitId: deal.primaryUnitId,
          assignedToId: deal.assignedToId,
          extraMetadata: { reservationExpiresAt: deal.reservationExpiresAt?.toISOString(), warningWindowHours: 24 },
        },
        tx
      );
      warned++;
    }

    for (const deal of expired) {
      const ref = `reservation_expired_${deal.id}_${deal.reservationExpiresAt?.toISOString()}`;
      if (await automationRefExists(ref, tx)) continue;

      await createAutomationActivity(
        {
          ref,
          title: "Bron muddati tugadi",
          clientId: deal.clientId,
          leadId: deal.leadId,
          dealId: deal.id,
          unitId: deal.primaryUnitId,
          assignedToId: deal.assignedToId,
          extraMetadata: { reservationExpiresAt: deal.reservationExpiresAt?.toISOString() },
        },
        tx
      );
      if (deal.assignedToId) {
        await tx.task.create({
          data: {
            title: "Muddati tugagan bronni ko'rib chiqing",
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
      await createTelegramAlertLog(
        {
          type: "reservation_expired",
          leadId: deal.leadId,
          clientId: deal.clientId,
          clientName: deal.client.fullName,
          clientPhone: deal.client.phone,
          managerName: deal.assignedTo?.name || deal.assignedTo?.email,
          dealNumber: deal.dealNumber,
          unitLabel: deal.primaryUnit ? `${deal.primaryUnit.floor.building.name} / ${deal.primaryUnit.unitNumber}` : null,
          expiresAt: deal.reservationExpiresAt,
          crmPath: `/portal/management-x7k9/crm/deals/${deal.id}`,
          ref,
        },
        { crmBaseUrl: process.env.NEXTAUTH_URL || null },
        tx
      ).catch((error) => {
        console.error("Failed to queue Telegram expired reservation alert:", error);
      });
      expiredLogged++;
    }
  });
  logger.info("reservation_expiry_check_processed", { warned, expired: expiredLogged, scannedExpired: expired.length });
  return NextResponse.json({ warned, expired: expiredLogged, scannedExpired: expired.length });
}

export const GET = POST;
