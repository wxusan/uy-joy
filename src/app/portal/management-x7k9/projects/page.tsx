import prisma from "@/lib/prisma";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function AdminProjects() {
  const project = await prisma.project.findFirst({
    select: {
      id: true,
      name: true,
      topViewImage: true,
      expectedYear: true,
      buildings: {
        select: {
          id: true,
          name: true,
          polygonData: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return <ProjectsClient initialProject={project as any} />;
}
