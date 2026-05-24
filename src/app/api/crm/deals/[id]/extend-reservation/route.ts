import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealInclude } from "@/lib/deal-include";
import { canMarkDealSold } from "@/lib/real-estate";
import { DealExtendReservationSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("deals", "manageDeals");
  if (auth.response) return auth.response;
  if (!canMarkDealSold(auth.user)) return NextResponse.json({ error: "Only director/admin can extend reservations" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const parsed = DealExtendReservationSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const deal = await prisma.$transaction(async (tx) => {
    const updated = await tx.deal.update({
      where: { id },
      data: { reservationExpiresAt: new Date(input.reservationExpiresAt) },
    });
    if (updated.primaryUnitId) {
      await tx.unit.update({
        where: { id: updated.primaryUnitId },
        data: { reservationExpiresAt: new Date(input.reservationExpiresAt) },
      });
    }
    await createActivity(
      {
        type: "deal",
        title: "Bron muddati uzaytirildi",
        clientId: updated.clientId,
        leadId: updated.leadId,
        dealId: updated.id,
        unitId: updated.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: { reason: input.reason, reservationExpiresAt: input.reservationExpiresAt },
      },
      tx
    );
    return tx.deal.findUniqueOrThrow({ where: { id }, include: dealInclude() });
  });

  return NextResponse.json(deal);
}
