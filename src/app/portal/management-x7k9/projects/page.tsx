import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function AdminProjects() {
  await requireAdmin(PLATFORM_PERMISSIONS.managePublicContent);
  if (!platformSettingsHasFeature(getPlatformSettings(), "publicPage")) {
    return null;
  }

  const [project, heroImages] = await Promise.all([
    prisma.project.findFirst({
      select: {
        id: true,
        name: true,
        topViewImage: true,
        buildings: {
          select: {
            id: true,
            name: true,
            frontViewImage: true,
            backViewImage: true,
            leftViewImage: true,
            rightViewImage: true,
            polygonData: true,
            floors: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.heroImage.findMany({
      select: {
        id: true,
        imageUrl: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <ProjectsClient
      initialProject={project as React.ComponentProps<typeof ProjectsClient>["initialProject"]}
      initialHeroImages={heroImages}
    />
  );
}
