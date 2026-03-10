import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import BuildingsClient from "./BuildingsClient";

export const dynamic = "force-dynamic";

export default async function BuildingsPage({ params }: { params: { projectId: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: {
      id: true,
      name: true,
      buildings: {
        select: {
          id: true,
          name: true,
          sortOrder: true,
          frontViewImage: true,
          backViewImage: true,
          leftViewImage: true,
          rightViewImage: true,
          floors: {
            select: {
              id: true,
              number: true,
              units: { select: { id: true } },
            },
            orderBy: { number: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) notFound();

  return <BuildingsClient initialProject={project} projectId={params.projectId} />;
}
