import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExploreClient from "./ExploreClient";

export const dynamic = "force-dynamic";

export default async function ExplorePage({ params }: { params: { projectId: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      buildings: {
        include: {
          floors: {
            include: { units: true },
            orderBy: { number: "asc" },
          },
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="bg-slate-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-slate-400 text-sm">{project.address}</p>
          </div>
        </div>
        <ExploreClient project={JSON.parse(JSON.stringify(project))} />
      </main>
      <Footer />
    </>
  );
}
