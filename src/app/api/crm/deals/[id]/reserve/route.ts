import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealInclude } from "@/lib/deal-include";
import { canReserveDeal, DEFAULT_RESERVATION_HOURS, syncLeadStageForDeal } from "@/lib/real-estate";
import { DealReserveSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { createTelegramAlertLog } from "@/lib/telegram";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("deals", "manageDeals");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = DealReserveSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const deal = await prisma.deal.findUnique({ where: { id }, include: { primaryUnit: true } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!deal.primaryUnitId) return NextResponse.json({ error: "Deal must have a unit before reservation" }, { status: 400 });
  if (!canReserveDeal(auth.user, deal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const expiresAt =
    input.reservationExpiresAt ||
    new Date(now.getTime() + (input.reservationHours || DEFAULT_RESERVATION_HOURS) * 60 * 60 * 1000).toISOString();

  const reserved = await prisma.$transaction(async (tx) => {
    const unitId = deal.primaryUnitId;
    if (!unitId) throw new Error("UNIT_NOT_AVAILABLE");
    const updatedUnit = await tx.unit.updateMany({
      where: {
        id: unitId,
        status: "available",
        OR: [{ currentDealId: null }, { currentDealId: deal.id }],
      },
      data: {
        status: "reserved",
        currentDealId: deal.id,
        reservedByClientId: deal.clientId,
        reservedAt: now,
        reservationExpiresAt: new Date(expiresAt),
        statusChangedAt: now,
      },
    });
    if (updatedUnit.count !== 1) throw new Error("UNIT_NOT_AVAILABLE");

    const updatedDeal = await tx.deal.update({
      where: { id },
      data: {
        status: "reserved",
        reservedAt: now,
        reservationExpiresAt: new Date(expiresAt),
        exchangeRateLockedAt: deal.exchangeRateToPaymentCurrency ? now : null,
        notes: input.notes ?? deal.notes,
      },
    });

    await syncLeadStageForDeal(updatedDeal.leadId, "reserved", auth.user?.id || null, tx);
    await createActivity(
      {
        type: "deal",
        title: "Xonadon bron qilindi",
        clientId: updatedDeal.clientId,
        leadId: updatedDeal.leadId,
        dealId: updatedDeal.id,
        unitId: updatedDeal.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: { reservationExpiresAt: expiresAt },
      },
      tx
    );
    if (updatedDeal.assignedToId) {
      await tx.task.create({
        data: {
          title: "Bron muddati tugayapti",
          type: "other",
          priority: "high",
          clientId: updatedDeal.clientId,
          leadId: updatedDeal.leadId,
          dealId: updatedDeal.id,
          unitId: updatedDeal.primaryUnitId,
          assignedToId: updatedDeal.assignedToId,
          createdById: auth.user?.id || null,
          dueAt: new Date(new Date(expiresAt).getTime() - 4 * 60 * 60 * 1000),
        },
      });
    }

    return tx.deal.findUniqueOrThrow({ where: { id }, include: dealInclude() });
  }).catch((error) => {
    if (error instanceof Error && error.message === "UNIT_NOT_AVAILABLE") return null;
    throw error;
  });

  if (!reserved) return NextResponse.json({ error: "Unit is no longer available" }, { status: 409 });
  await createTelegramAlertLog({
    type: "reservation_created",
    leadId: reserved.leadId,
    clientId: reserved.clientId,
    clientName: reserved.client.fullName,
    clientPhone: reserved.client.phone,
    managerName: reserved.assignedTo?.name || reserved.assignedTo?.email,
    dealNumber: reserved.dealNumber,
    unitLabel: reserved.primaryUnit ? `${reserved.primaryUnit.floor.building.name} / ${reserved.primaryUnit.unitNumber}` : null,
    expiresAt: reserved.reservationExpiresAt,
    crmPath: `/portal/management-x7k9/crm/deals/${reserved.id}`,
    locale: reserved.lead?.id ? undefined : null,
    ref: `reservation_created_${reserved.id}_${reserved.reservationExpiresAt?.toISOString()}`,
  }, { crmBaseUrl: process.env.NEXTAUTH_URL || null }).catch((error) => {
    console.error("Failed to queue Telegram reservation alert:", error);
  });
  return NextResponse.json(reserved);
}
