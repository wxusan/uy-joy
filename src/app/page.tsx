import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LocationInfrastructure from "@/components/LocationInfrastructure";
import ContactForm from "@/components/ContactForm";
import FAQ from "@/components/FAQ";
import HomeStats from "@/components/HomeStats";
import FeaturedApartments from "@/components/FeaturedApartments";
import ScrollReveal from "@/components/ScrollReveal";
import ExploreClient from "@/components/ExploreClient";
import { getCachedProject, getCachedHeroImages, getCachedFAQs } from "@/lib/cached-queries";
import { getTranslation, Locale } from "@/lib/translations";
import { getHeroImageUrl, getCardImageUrl } from "@/lib/cloudinary";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

// ISR: Revalidate every 60 seconds for faster loading
export const revalidate = 60;

export default async function Home() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "uz") as Locale;

  // Get cached data for faster loading
  const [heroImages, faqs, project] = await Promise.all([
    getCachedHeroImages(),
    getCachedFAQs(),
    getCachedProject(),
  ]);

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

  // Get translated content
  const projectName = getTranslation(project.nameTranslations, project.name, locale);
  const projectDescription = getTranslation(project.descriptionTranslations, project.description || "", locale);
  const projectAddress = getTranslation(project.addressTranslations, project.address || "", locale);

  const allUnits = project.buildings.flatMap((b) => b.floors.flatMap((f) => f.units));
  const available = allUnits.filter((u) => u.status === "available").length;
  const reserved = allUnits.filter((u) => u.status === "reserved").length;
  const sold = allUnits.filter((u) => u.status === "sold").length;

  const roomTypes = Array.from(new Set(allUnits.map((u) => u.rooms))).sort();
  const areaRange = allUnits.length > 0 ? {
    min: Math.min(...allUnits.map((u) => u.area)),
    max: Math.max(...allUnits.map((u) => u.area)),
  } : { min: 0, max: 0 };

  const totalFloors = project.buildings.reduce((a, b) => a + b.floors.length, 0);

  // Transform units for featured apartments (only with polygons)
  const featuredUnitsData = project.buildings.flatMap((building) =>
    building.floors.flatMap((floor) =>
      floor.units
        .filter((u) => u.polygonData)
        .map((unit) => ({
          id: unit.id,
          unitNumber: unit.unitNumber,
          rooms: unit.rooms,
          area: unit.area,
          status: unit.status,
          pricePerM2: unit.pricePerM2,
          totalPrice: unit.totalPrice,
          sketchImage: unit.sketchImage,
          sketchImage2: unit.sketchImage2,
          sketchImage3: unit.sketchImage3,
          sketchImage4: unit.sketchImage4,
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

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero — navy tokens instead of raw slate */}
        <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-emerald-900 text-white py-20">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <ScrollReveal>
              <div className="inline-block bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-500/30">
                {t("landing.premiumResidential")}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
                {projectName}
              </h1>
              <p className="text-lg text-navy-200 mb-2">{projectAddress}</p>
              <p className="text-sm text-navy-300 mb-8 max-w-2xl mx-auto">{projectDescription}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/#explore"
                  className="bg-shine inline-block bg-emerald-500 text-emerald-100 px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base rounded-lg font-semibold hover:bg-emerald-400 transition"
                >
                  {t("landing.exploreApartments")}
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Quick Stats with Animated Counters + Progress Bars */}
        <HomeStats
          total={allUnits.length}
          available={available}
          reserved={reserved}
          sold={sold}
          labels={{
            total: t("project.totalUnits"),
            available: t("project.available"),
            reserved: t("project.reserved"),
            sold: t("project.sold"),
          }}
        />

        {/* Interactive Master Plan / Visual Tour — pt-12 for balanced rhythm after stat overlap */}
        <section id="explore" className="bg-slate-50 border-t border-slate-200 pt-12 pb-16">
          <div className="max-w-7xl mx-auto">
            <ExploreClient project={JSON.parse(JSON.stringify(project))} />
          </div>
        </section>

        {/* About */}
        <section id="about" className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <ScrollReveal direction="left">
              <h2 className="text-3xl font-bold text-navy-900 mb-6">{t("project.aboutComplex")}</h2>
              <p className="text-slate-600 leading-relaxed mb-6">{projectDescription}</p>

              <div className="space-y-3">
                {[
                  `${project.buildings.length} ${t("admin.buildings")}, ${totalFloors} ${t("explore.floors")}`,
                  `${t("unit.area")}: ${areaRange.min}–${areaRange.max} m²`,
                  `${t("unit.rooms")}: ${roomTypes.join(", ")} ${t("explore.room")}`,
                  t("project.parkingSecurity"),
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Gallery */}
            <ScrollReveal direction="right" className="space-y-3">
              {heroImages.length === 0 ? (
                <div className="bg-slate-100 rounded-2xl h-72 flex items-center justify-center">
                  <p className="text-slate-400">Rasm yuklanmagan</p>
                </div>
              ) : heroImages.length === 1 ? (
                <div className="relative rounded-2xl overflow-hidden h-80">
                  <Image src={getHeroImageUrl(heroImages[0].imageUrl)} alt="Building" fill className="object-cover" loading="lazy" />
                </div>
              ) : heroImages.length === 2 ? (
                <div className="grid grid-cols-2 gap-3">
                  {heroImages.map((img, i) => (
                    <div key={img.id} className="relative rounded-xl overflow-hidden h-64">
                      <Image src={getCardImageUrl(img.imageUrl)} alt={`Building ${i + 1}`} fill className="object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="relative rounded-2xl overflow-hidden h-56">
                    <Image src={getHeroImageUrl(heroImages[0].imageUrl)} alt="Building" fill className="object-cover" loading="lazy" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {heroImages.slice(1).map((img, i) => (
                      <div key={img.id} className="relative rounded-xl overflow-hidden h-28">
                        <Image src={getCardImageUrl(img.imageUrl)} alt={`Building ${i + 2}`} fill className="object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ScrollReveal>
          </div>
        </section>

        {/* Featured Apartments */}
        <FeaturedApartments
          units={featuredUnitsData}
          projectName={projectName}
          expectedYear={project.expectedYear}
        />



        {/* Location & Infrastructure */}
        {project.latitude && project.longitude ? (
          <LocationInfrastructure
            latitude={project.latitude}
            longitude={project.longitude}
            infrastructure={project.infrastructure as any ?? undefined}
            address={projectAddress}
          />
        ) : (
          <section className="bg-slate-800 text-white py-16">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">{t("project.location")}</h2>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <p className="text-slate-300 mb-4">{t("project.locationDescription")}</p>
                  <div className="flex items-start gap-3 text-white bg-slate-700/50 rounded-lg p-4">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    <div>
                      <p className="font-medium">{projectName}</p>
                      <p className="text-sm text-slate-400">{projectAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-700 rounded-2xl h-64 flex items-center justify-center">
                  <span className="text-slate-500 text-sm">{t("common.loading")}...</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQ & Contact Form */}
        <section className="bg-slate-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12">
              <FAQ items={faqs} locale={locale} />
              <ContactForm projectId={project.id} projectName={projectName} />
            </div>
          </div>
        </section>

        {/* CTA — navy keeps brand coherent, emerald as accent button */}
        <section className="bg-navy-900 text-white py-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <ScrollReveal>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t("project.findPerfectApartment")}</h2>
              <p className="text-navy-300 mb-8 text-sm sm:text-base">{t("project.useInteractiveFloorPlan")}</p>
              <Link
                href="/#explore"
                className="bg-shine inline-block bg-emerald-500 text-white px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base rounded-lg font-semibold hover:bg-emerald-400 transition"
              >
                {t("project.exploreFloorPlans")} →
              </Link>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
