import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ApartmentsClient from "./ApartmentsClient";
import { getTranslation, Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApartmentsPage() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "uz") as Locale;

  const project = await prisma.project.findFirst({
    include: {
      buildings: {
        include: {
          floors: {
            include: {
              units: {
                where: {
                  polygonData: { not: null }, // Only units with drawn polygons
                },
              },
            },
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

  // Transform data for client
  const units = project.buildings.flatMap((building) =>
    building.floors.flatMap((floor) =>
      floor.units.map((unit) => ({
        ...unit,
        floor: {
          number: floor.number,
          basePricePerM2: floor.basePricePerM2,
          building: {
            name: building.name,
          },
        },
      }))
    )
  );

  // Get dynamic filter ranges
  const roomsSet = new Set(units.map((u) => u.rooms));
  const rooms = Array.from(roomsSet).sort((a, b) => a - b);
  
  const areas = units.map((u) => u.area);
  const areaRange = {
    min: areas.length ? Math.floor(Math.min(...areas)) : 0,
    max: areas.length ? Math.ceil(Math.max(...areas)) : 200,
  };

  const prices = units.map((u) => {
    const pp = u.pricePerM2 || u.floor.basePricePerM2 || 0;
    return u.totalPrice || pp * u.area;
  }).filter(p => p > 0);
  
  const priceRange = {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 1000000000,
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="bg-slate-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-2xl font-bold">{t("apartments.allApartments")}</h1>
            <p className="text-slate-400 text-sm">{projectName} · {units.length} {t("apartments.units")}</p>
          </div>
        </div>
        <ApartmentsClient
          units={JSON.parse(JSON.stringify(units))}
          filterOptions={{
            rooms,
            areaRange,
            priceRange,
          }}
        />
      </main>
      <Footer />
    </>
  );
}
