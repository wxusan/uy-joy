import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealInclude } from "@/lib/deal-include";
import { canMarkDealSold, canOverrideReservedDealSold, syncLeadStageForDeal } from "@/lib/real-estate";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("deals", "manageDeals");
  if (auth.response) return auth.response;
  if (!canMarkDealSold(auth.user)) return NextResponse.json({ error: "Only owner/admin/director can mark sold" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const overrideReserved = body && typeof body === "object" && "overrideReserved" in body ? Boolean(body.overrideReserved) : false;
  const overrideReason =
    body && typeof body === "object" && typeof body.overrideReason === "string" ? body.overrideReason.trim().slice(0, 500) : null;
  const { id } = await params;
  const existing = await prisma.deal.findUnique({
    where: { id },
    include: { paymentPlans: { where: { status: "active" } }, primaryUnit: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "reserved") {
    if (!overrideReserved || !canOverrideReservedDealSold(auth.user)) {
      return NextResponse.json(
        { error: "Reserved deals require an explicit owner/admin override before sold" },
        { status: 409 }
      );
    }
  } else if (!["contract_signed", "payment_active"].includes(existing.status)) {
    return NextResponse.json({ error: "Deal must be contract signed or payment active before sold" }, { status: 400 });
  }
  if (existing.discountFlaggedAt && !existing.discountApprovedAt) {
    return NextResponse.json({ error: "Discount requires approval before sold" }, { status: 409 });
  }
  if (existing.paymentTermMonths > 0 && existing.paymentPlans.length === 0) {
    return NextResponse.json({ error: "Active payment plan is required before sold" }, { status: 400 });
  }

  const now = new Date();
  const deal = await prisma.$transaction(async (tx) => {
    const updated = await tx.deal.update({ where: { id }, data: { status: "sold", soldAt: now } });
    if (updated.primaryUnitId) {
      await tx.unit.update({
        where: { id: updated.primaryUnitId },
        data: {
          status: "sold",
          currentDealId: updated.id,
          soldToClientId: updated.clientId,
          soldAt: now,
          statusChangedAt: now,
        },
      });
    }
    await syncLeadStageForDeal(updated.leadId, "sold", auth.user?.id || null, tx);
    await createActivity(
      {
        type: "deal",
        title: "Xonadon sotildi",
        clientId: updated.clientId,
        leadId: updated.leadId,
        dealId: updated.id,
        unitId: updated.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: existing.status === "reserved" ? { reservedStatusOverride: true, overrideReason } : undefined,
      },
      tx
    );
    return tx.deal.findUniqueOrThrow({ where: { id }, include: dealInclude() });
  });

  return NextResponse.json(deal);
}
