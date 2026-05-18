import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ApartmentsClient from "./ApartmentsClient";
import type { Locale } from "@/lib/translations";
import { getCachedProjectWithPolygonUnits } from "@/lib/cached-queries";
import { getHeroImageUrl } from "@/lib/cloudinary";

// ISR: Revalidate every 60 seconds for faster loading
export const revalidate = 60;

export default async function ApartmentsPage() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "uz") as Locale;

  const project = await getCachedProjectWithPolygonUnits();

  const getTranslated = (json: string | null | undefined, fallback: string) => {
    if (!json) return fallback;
    try {
      const parsed = JSON.parse(json) as Record<string, string>;
      return parsed[locale] ?? parsed["uz"] ?? fallback;
    } catch {
      return fallback;
    }
  };

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

  const projectName = getTranslated(project.nameTranslations, project.name);
  const expectedYear = project.expectedYear ?? new Date().getFullYear() + 2;

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

  const availableCount = units.filter((unit) => unit.status === "available").length;
  const reservedCount = units.filter((unit) => unit.status === "reserved").length;
  const soldCount = units.filter((unit) => unit.status === "sold").length;
  const layoutCount = new Set(units.map((unit) => `${unit.rooms}-${unit.area}`)).size;

  const stats = [
    { value: layoutCount, label: t("apartments.layouts") },
    { value: availableCount, label: t("apartments.available") },
    { value: reservedCount, label: t("apartments.reserved") },
    { value: soldCount, label: t("apartments.sold") },
  ];

  // Get dynamic filter ranges
  const roomsSet = new Set(units.map((u) => u.rooms));
  const rooms = Array.from(roomsSet).sort((a, b) => a - b);

  const areas = units.map((u) => u.area);
  const areaRange = {
    min: areas.length ? Math.floor(Math.min(...areas)) : 0,
    max: areas.length ? Math.ceil(Math.max(...areas)) : 200,
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-[#f4efe7] text-[#15120f]">
        <section className="relative -mt-[77px] overflow-hidden border-b border-[#332820] bg-[#15120f] px-5 pb-14 pt-[133px] text-[#fff8ec] md:pb-20 md:pt-[157px] lg:-mt-[93px] lg:pt-[173px]">
          {project.topViewImage ? (
            <Image
              src={getHeroImageUrl(project.topViewImage)}
              alt={projectName}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-35"
            />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(198,99,72,0.28),transparent_34%),linear-gradient(90deg,rgba(21,18,15,0.98)_0%,rgba(21,18,15,0.78)_46%,rgba(21,18,15,0.9)_100%)]" />

          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-[860px]">
              <div className="mb-5 h-[2px] w-14 bg-[#c66348]" />
              <p className="font-heading text-[13px] font-semibold uppercase tracking-[0.24em] text-[#d78c70]">
                {projectName}
              </p>
              <h1 className="mt-4 max-w-[720px] font-display text-[56px] font-semibold leading-[0.92] tracking-normal md:text-[82px]">
                {t("apartments.allApartments")}
              </h1>
              <p className="mt-6 max-w-[560px] text-[16px] font-medium leading-8 text-[#d8c8b5]">
                {t("apartments.inventorySubtitle")}
              </p>
            </div>

            <div className="mt-9 flex max-w-[920px] flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#f0d7be]/14 pt-5">
              {stats.map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-baseline gap-2 ${index === 0 ? "" : "before:mr-1 before:h-1 before:w-1 before:rounded-full before:bg-[#c66348]/70"}`}
                >
                  <span className="font-display text-[31px] font-semibold leading-none text-[#fff8ec]">
                    {item.value}
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#b9a998]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ApartmentsClient
          units={JSON.parse(JSON.stringify(units))}
          filterOptions={{
            rooms,
            areaRange,
          }}
          projectName={projectName}
          expectedYear={expectedYear}
          telegramUrl={project.telegramUrl}
        />
      </main>
      <Footer />
    </>
  );
}
