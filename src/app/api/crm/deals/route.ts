import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealInclude } from "@/lib/deal-include";
import { calculateDealFinancials, dealVisibilityWhere, nextDealNumber } from "@/lib/real-estate";
import { DealCreateSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("deals", "viewDeals");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const q = searchParams.get("q")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const assignedToId = searchParams.get("assignedToId");
  const projectId = searchParams.get("projectId");
  const source = searchParams.get("source");
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = new Date(from);
  if (to) createdAt.lte = new Date(to);
  const unitId = searchParams.get("unitId");
  const where: Prisma.DealWhereInput = {
    AND: [
      dealVisibilityWhere(auth.user),
      status ? { status } : {},
      clientId ? { clientId } : {},
      assignedToId ? { assignedToId } : {},
      projectId ? { projectId } : {},
      unitId ? { OR: [{ primaryUnitId: unitId }, { dealUnits: { some: { unitId } } }] } : {},
      source ? { source } : {},
      Object.keys(createdAt).length > 0 ? { createdAt } : {},
      q
        ? {
            OR: [
              { dealNumber: { contains: q, mode: "insensitive" } },
              { client: { fullName: { contains: q, mode: "insensitive" } } },
              { client: { phone: { contains: q, mode: "insensitive" } } },
              { primaryUnit: { unitNumber: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: dealInclude(),
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return NextResponse.json({ data: deals, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("deals", "manageDeals");
  if (auth.response) return auth.response;

  const body = await request.json();
  const parsed = DealCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;

  const unit = input.primaryUnitId
    ? await prisma.unit.findUnique({
        where: { id: input.primaryUnitId },
        include: { floor: { include: { building: true } } },
      })
    : null;
  const listPrice = input.listPrice || unit?.totalPrice || (unit?.pricePerM2 ? unit.pricePerM2 * unit.area : 0);
  const financials = calculateDealFinancials({ ...input, listPrice });
  const discountFlaggedAt = financials.discountRequiresApproval ? new Date() : null;

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        dealNumber: await nextDealNumber(tx),
        clientId: input.clientId,
        leadId: input.leadId || null,
        projectId: input.projectId || unit?.floor.building.projectId || null,
        primaryUnitId: input.primaryUnitId || null,
        assignedToId: input.assignedToId || auth.user?.id || null,
        createdById: auth.user?.id || null,
        source: input.source || null,
        currency: input.currency,
        displayCurrency: input.displayCurrency,
        paymentCurrency: input.paymentCurrency,
        exchangeRateToPaymentCurrency: input.exchangeRateToPaymentCurrency || null,
        ...financials,
        discountFlaggedAt,
        expectedCloseAt: input.expectedCloseAt ? new Date(input.expectedCloseAt) : null,
        notes: input.notes || null,
      },
    });

    if (input.primaryUnitId) {
      await tx.dealUnit.create({
        data: {
          dealId: created.id,
          unitId: input.primaryUnitId,
          priceAtDeal: financials.listPrice,
          isPrimary: true,
        },
      });
    }

    await createActivity(
      {
        type: "deal",
        title: "Bitim yaratildi",
        clientId: created.clientId,
        leadId: created.leadId,
        dealId: created.id,
        unitId: created.primaryUnitId,
        actorId: auth.user?.id || null,
        metadata: { dealNumber: created.dealNumber, discountRequiresApproval: financials.discountRequiresApproval },
      },
      tx
    );

    if (financials.discountRequiresApproval) {
      await createActivity(
        {
          type: "deal",
          title: "Chegirma tasdiq talab qiladi",
          clientId: created.clientId,
          leadId: created.leadId,
          dealId: created.id,
          unitId: created.primaryUnitId,
          actorId: auth.user?.id || null,
          metadata: { discountPercent: financials.discountPercent },
        },
        tx
      );
    }

    return tx.deal.findUniqueOrThrow({ where: { id: created.id }, include: dealInclude() });
  });

  return NextResponse.json(deal, { status: 201 });
}
