import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import UnitsClient from "./UnitsClient";

export const dynamic = "force-dynamic";

export default async function AdminUnits({ params }: { params: { projectId: string } }) {
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
      initialUnits={units}
      initialBuildings={project.buildings}
      projectId={params.projectId}
    />
  );
}
