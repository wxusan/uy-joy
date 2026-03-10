import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import FloorsClient from "./FloorsClient";

export const dynamic = "force-dynamic";

export default async function FloorsPage({ params }: { params: { projectId: string; buildingId: string } }) {
  const building = await prisma.building.findUnique({
    where: { id: params.buildingId },
    select: {
      id: true,
      name: true,
      projectId: true,
      frontViewImage: true,
      floors: {
        select: {
          id: true,
          number: true,
          basePricePerM2: true,
          floorPlanImage: true,
          positionData: true,
          units: { select: { id: true, status: true } },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!building) notFound();

  return (
    <FloorsClient
      initialBuilding={building as any}
      buildingId={params.buildingId}
      projectId={params.projectId}
    />
  );
}
