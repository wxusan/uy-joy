import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExploreClient from "./ExploreClient";
import { getTranslation, Locale } from "@/lib/translations";

// ISR: Revalidate every 60 seconds for faster loading
export const revalidate = 60;

export default async function KvartiralarniKorishPage() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "uz") as Locale;

  // Get the first (and only) project - no cache
  const project = await prisma.project.findFirst({
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

  if (!project) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center min-h-screen">
          <p className="text-slate-500">{t("common.loading")}</p>
        </main>
        <Footer />
      </>
    );
  }

  const projectName = getTranslation(project.nameTranslations, project.name, locale);
  const projectAddress = getTranslation(project.addressTranslations, project.address || "", locale);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="bg-slate-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-2xl font-bold">{projectName}</h1>
            <p className="text-slate-400 text-sm">{projectAddress}</p>
          </div>
        </div>
        <ExploreClient project={JSON.parse(JSON.stringify(project))} />
      </main>
      <Footer />
    </>
  );
}
