import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { canViewAllLeads } from "@/lib/crm-access";
import { dealInclude } from "@/lib/deal-include";
import { normalizePhone } from "@/lib/phone";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { calculateDealFinancials, DEFAULT_RESERVATION_HOURS, nextDealNumber, syncLeadStageForDeal } from "@/lib/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { createTelegramAlertLog } from "@/lib/telegram";

const ReservationCreateSchema = z.object({
  unitId: z.string().trim().min(1).max(120),
  clientId: z.string().trim().min(1).max(120).nullable().optional(),
  clientName: z.string().trim().max(120).nullable().optional(),
  clientPhone: z.string().trim().max(32).nullable().optional(),
  leadId: z.string().trim().min(1).max(120).nullable().optional(),
  projectId: z.string().trim().min(1).max(120).nullable().optional(),
  assignedToId: z.string().trim().min(1).max(120).nullable().optional(),
  source: z.string().trim().max(80).nullable().optional(),
  reservationHours: z.number().int().positive().max(720).optional(),
  reservationExpiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

function reservationTaskDueAt(expiresAt: Date) {
  const fourHoursBefore = new Date(expiresAt.getTime() - 4 * 60 * 60 * 1000);
  const now = new Date();
  return fourHoursBefore.getTime() > now.getTime() ? fourHoursBefore : now;
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("deals", "manageDeals");
  if (auth.response) return auth.response;

  const parsed = ReservationCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const canAssign = canViewAllLeads(auth.user);
  const lead = input.leadId
    ? await prisma.lead.findUnique({ where: { id: input.leadId }, select: { id: true, clientId: true, assignedToId: true, source: true, projectId: true } })
    : null;

  const phone = input.clientPhone ? normalizePhone(input.clientPhone) : null;
  const clientById = input.clientId ? await prisma.client.findUnique({ where: { id: input.clientId } }) : null;
  const clientByLead = !clientById && lead?.clientId ? await prisma.client.findUnique({ where: { id: lead.clientId } }) : null;
  const clientByPhone =
    !clientById && !clientByLead && phone?.normalized
      ? await prisma.client.findFirst({ where: { phoneNormalized: phone.normalized } })
      : null;

  const existingClient = clientById || clientByLead || clientByPhone;
  const assignedToId = canAssign
    ? input.assignedToId || lead?.assignedToId || existingClient?.assignedToId || auth.user?.id || null
    : auth.user?.id || null;

  if (!existingClient && (!input.clientName?.trim() || !phone?.display)) {
    return NextResponse.json({ error: "Klient ismi va telefon raqami kerak" }, { status: 400 });
  }

  const unit = await prisma.unit.findUnique({
    where: { id: input.unitId },
    include: {
      floor: { include: { building: true } },
      currentDeal: { include: dealInclude() },
    },
  });
  if (!unit) return NextResponse.json({ error: "Xonadon topilmadi" }, { status: 404 });

  if (unit.status !== "available" && unit.currentDeal) {
    const sameClient =
      (existingClient?.id && unit.currentDeal.clientId === existingClient.id) ||
      (input.clientId && unit.currentDeal.clientId === input.clientId);
    if (sameClient) {
      return NextResponse.json({ deal: unit.currentDeal, existing: true });
    }
    return NextResponse.json({ error: "Bu xonadon allaqachon bron qilingan yoki sotilgan" }, { status: 409 });
  }
  if (unit.status !== "available") {
    return NextResponse.json({ error: "Bu xonadon allaqachon bron qilingan yoki sotilgan" }, { status: 409 });
  }

  const now = new Date();
  const expiresAt = input.reservationExpiresAt
    ? new Date(input.reservationExpiresAt)
    : new Date(now.getTime() + (input.reservationHours || DEFAULT_RESERVATION_HOURS) * 60 * 60 * 1000);
  const listPrice = unit.totalPrice || (unit.pricePerM2 || unit.floor.basePricePerM2 || 0) * unit.area;
  const financials = calculateDealFinancials({ listPrice, termMonths: 0 });

  const reserved = await prisma
    .$transaction(async (tx) => {
      const client =
        existingClient ||
        (await tx.client.create({
          data: {
            fullName: input.clientName?.trim() || phone?.display || "Klient",
            phone: phone?.display || input.clientPhone || "",
            phoneNormalized: phone?.normalized || null,
            source: input.source || lead?.source || "bron",
            notes: input.notes || null,
            assignedToId,
            createdById: auth.user?.id || null,
          },
        }));

      if (lead && lead.clientId !== client.id) {
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            clientId: client.id,
            assignedToId: lead.assignedToId || assignedToId,
          },
        });
      }
      if (!client.assignedToId && assignedToId) {
        await tx.client.update({ where: { id: client.id }, data: { assignedToId } });
      }

      const existingDeal = await tx.deal.findFirst({
        where: {
          clientId: client.id,
          primaryUnitId: unit.id,
          status: { notIn: ["cancelled", "lost"] },
        },
      });

      const deal =
        existingDeal ||
        (await tx.deal.create({
          data: {
            dealNumber: await nextDealNumber(tx),
            clientId: client.id,
            leadId: lead?.id || null,
            projectId: input.projectId || lead?.projectId || unit.floor.building.projectId || null,
            primaryUnitId: unit.id,
            assignedToId,
            createdById: auth.user?.id || null,
            source: input.source || lead?.source || "bron",
            currency: "USD",
            displayCurrency: "USD",
            paymentCurrency: "UZS",
            ...financials,
            notes: input.notes || null,
          },
        }));

      if (!existingDeal) {
        await tx.dealUnit.create({
          data: {
            dealId: deal.id,
            unitId: unit.id,
            priceAtDeal: financials.listPrice,
            isPrimary: true,
          },
        });
        await createActivity(
          {
            type: "deal",
            title: "Bitim yaratildi",
            clientId: client.id,
            leadId: lead?.id || null,
            dealId: deal.id,
            unitId: unit.id,
            actorId: auth.user?.id || null,
          },
          tx
        );
      }

      const updatedUnit = await tx.unit.updateMany({
        where: {
          id: unit.id,
          status: "available",
          OR: [{ currentDealId: null }, { currentDealId: deal.id }],
        },
        data: {
          status: "reserved",
          currentDealId: deal.id,
          reservedByClientId: client.id,
          reservedAt: now,
          reservationExpiresAt: expiresAt,
          customerName: client.fullName,
          customerPhone: client.phone,
          customerNotes: input.notes || null,
          statusChangedAt: now,
        },
      });
      if (updatedUnit.count !== 1) throw new Error("UNIT_NOT_AVAILABLE");

      const updatedDeal = await tx.deal.update({
        where: { id: deal.id },
        data: {
          status: "reserved",
          reservedAt: now,
          reservationExpiresAt: expiresAt,
          assignedToId,
          notes: input.notes ?? deal.notes,
          exchangeRateLockedAt: deal.exchangeRateToPaymentCurrency ? now : null,
        },
      });

      await syncLeadStageForDeal(updatedDeal.leadId, "reserved", auth.user?.id || null, tx);
      await createActivity(
        {
          type: "deal",
          title: "Xonadon bron qilindi",
          clientId: client.id,
          leadId: updatedDeal.leadId,
          dealId: updatedDeal.id,
          unitId: unit.id,
          actorId: auth.user?.id || null,
          metadata: { reservationExpiresAt: expiresAt.toISOString() },
        },
        tx
      );

      if (assignedToId) {
        await tx.task.create({
          data: {
            title: "Bron muddati tugayapti",
            type: "other",
            priority: "high",
            clientId: client.id,
            leadId: updatedDeal.leadId,
            dealId: updatedDeal.id,
            unitId: unit.id,
            assignedToId,
            createdById: auth.user?.id || null,
            dueAt: reservationTaskDueAt(expiresAt),
          },
        });
      }

      return tx.deal.findUniqueOrThrow({ where: { id: updatedDeal.id }, include: dealInclude() });
    })
    .catch((error) => {
      if (error instanceof Error && error.message === "UNIT_NOT_AVAILABLE") return null;
      throw error;
    });

  if (!reserved) return NextResponse.json({ error: "Bu xonadon allaqachon bron qilingan yoki sotilgan" }, { status: 409 });

  await createTelegramAlertLog(
    {
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
      ref: `reservation_created_${reserved.id}_${reserved.reservationExpiresAt?.toISOString()}`,
    },
    { crmBaseUrl: process.env.NEXTAUTH_URL || null }
  ).catch((error) => {
    console.error("Failed to queue Telegram reservation alert:", error);
  });

  return NextResponse.json({ deal: reserved, existing: false }, { status: 201 });
}
