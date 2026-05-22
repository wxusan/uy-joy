import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import FloorsClient from "./FloorsClient";

export const dynamic = "force-dynamic";

export default async function FloorsPage({ params }: { params: { projectId: string; buildingId: string } }) {
  await requireAdmin(PLATFORM_PERMISSIONS.manageInventory);
  if (!platformSettingsHasFeature(getPlatformSettings(), "inventory")) {
    notFound();
  }

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
      initialBuilding={building as React.ComponentProps<typeof FloorsClient>["initialBuilding"]}
      buildingId={params.buildingId}
      projectId={params.projectId}
    />
  );
}
