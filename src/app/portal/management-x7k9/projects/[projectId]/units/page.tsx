import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { computeDisplayNumber } from "@/lib/unit-display";
import UnitsClient from "./UnitsClient";

export const dynamic = "force-dynamic";

export default async function AdminUnits({ params }: { params: { projectId: string } }) {
  await requireAdmin(PLATFORM_PERMISSIONS.manageInventory);
  if (!platformSettingsHasFeature(getPlatformSettings(), "inventory")) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: {
      id: true,
      buildings: {
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) notFound();

  const units = await prisma.unit.findMany({
    where: { floor: { building: { projectId: params.projectId } } },
    select: {
      id: true,
      unitNumber: true,
      rooms: true,
      area: true,
      status: true,
      pricePerM2: true,
      totalPrice: true,
      customerName: true,
      customerPhone: true,
      customerNotes: true,
      reservedAt: true,
      soldAt: true,
      reservationExpiresAt: true,
      currentDeal: {
        select: {
          id: true,
          dealNumber: true,
          status: true,
          salePrice: true,
          currency: true,
          client: { select: { fullName: true, phone: true } },
          assignedTo: { select: { name: true, email: true } },
          paymentPlans: {
            where: { status: "active" },
            select: {
              id: true,
              status: true,
              payments: {
                select: { id: true, status: true, dueDate: true, expectedAmount: true, paidAmount: true },
                orderBy: { dueDate: "asc" },
              },
            },
            take: 1,
          },
          documents: { select: { id: true, status: true }, take: 20 },
        },
      },
      floor: {
        select: {
          id: true,
          number: true,
          basePricePerM2: true,
          building: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { floor: { building: { sortOrder: "asc" } } },
      { floor: { number: "asc" } },
      { unitNumber: "asc" },
    ],
  });

  return (
    <UnitsClient
      initialUnits={units.map((unit) => ({
        ...unit,
        displayNumber: computeDisplayNumber(unit.unitNumber, unit.floor.number),
        reservedAt: unit.reservedAt ? unit.reservedAt.toISOString() : null,
        soldAt: unit.soldAt ? unit.soldAt.toISOString() : null,
        reservationExpiresAt: unit.reservationExpiresAt ? unit.reservationExpiresAt.toISOString() : null,
        currentDeal: unit.currentDeal
          ? {
              ...unit.currentDeal,
              paymentPlans: unit.currentDeal.paymentPlans.map((plan) => ({
                ...plan,
                payments: plan.payments.map((payment) => ({
                  ...payment,
                  dueDate: payment.dueDate.toISOString(),
                })),
              })),
            }
          : null,
      }))}
      initialBuildings={project.buildings}
      projectId={params.projectId}
    />
  );
}
