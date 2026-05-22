import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
const LocationInfrastructure = dynamic(() => import("@/components/LocationInfrastructure"));
import ContactForm from "@/components/ContactForm";
import FAQ from "@/components/FAQ";
import HomeStats from "@/components/HomeStats";
import FeaturedApartments from "@/components/FeaturedApartments";
import ScrollReveal from "@/components/ScrollReveal";
import ExploreClient from "@/components/ExploreClient";
import PublicPageAnalytics from "@/components/PublicPageAnalytics";
import { getCachedProject, getCachedHeroImages, getCachedFAQs } from "@/lib/cached-queries";
import type { Locale } from "@/lib/translations";
import { getHeroImageUrl, getCardImageUrl } from "@/lib/cloudinary";
import { computeDisplayNumber } from "@/lib/unit-display";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { DEFAULT_PUBLIC_PAGE_COLORS, getPublicPageConfig, sectionEnabled, translatePublicText } from "@/lib/public-page";
import Image from "next/image";
import { ArrowRight, Building2, KeyRound, ShieldCheck, Trees } from "lucide-react";

// ISR: Revalidate every 60 seconds for faster loading
export const revalidate = 60;

export default async function Home() {
  if (!platformSettingsHasFeature(getPlatformSettings(), "publicPage")) {
    notFound();
  }

  const t = await getTranslations();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "uz") as Locale;
  const platformSettings = getPlatformSettings();
  const inventoryEnabled = platformSettingsHasFeature(platformSettings, "inventory");

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

  // Resolve project name / description / address from DB translations or fallback to project.name
  const getTranslated = (json: string | null, fallback: string) => {
    if (!json) return fallback;
    try {
      const parsed = JSON.parse(json) as Record<string, string>;
      return parsed[locale]?.trim() || parsed["uz"]?.trim() || fallback;
    } catch {
      return fallback;
    }
  };

  const projectName = getTranslated(project.nameTranslations, project.name);
  const projectDescription = getTranslated(project.descriptionTranslations, project.description ?? "");
  const projectAddress = getTranslated(project.addressTranslations, project.address ?? "");
  const publicPage = await getPublicPageConfig(project.id);
  const publicConfig = publicPage?.config ?? null;
  const brandName = publicConfig?.brandName || projectName;
  const heroTitle = translatePublicText(publicConfig?.heroTitleJson, locale, brandName);
  const heroSubtitle = translatePublicText(publicConfig?.heroSubtitleJson, locale, projectDescription);
  const formTitle = translatePublicText(publicConfig?.formTitleJson, locale, "");
  const formSubtitle = translatePublicText(publicConfig?.formSubtitleJson, locale, "");
  const thankYouTitle = translatePublicText(publicConfig?.thankYouTitleJson, locale, "");
  const thankYouMessage = translatePublicText(publicConfig?.thankYouMessageJson, locale, "");
  const expectedYear = project.expectedYear ?? new Date().getFullYear() + 2;

  const publicProject = {
    ...project,
    name: projectName,
    description: projectDescription,
    address: projectAddress,
    expectedYear,
  };

  const allUnits = project.buildings.flatMap((b) => b.floors.flatMap((f) => f.units));
  const available = allUnits.filter((u) => u.status === "available").length;
  const reserved = allUnits.filter((u) => u.status === "reserved").length;
  const sold = allUnits.filter((u) => u.status === "sold").length;
  const availablePricePerM2Values = project.buildings.flatMap((building) =>
    building.floors.flatMap((floor) =>
      floor.units
        .filter((unit) => unit.status === "available")
        .map((unit) => unit.pricePerM2 ?? floor.basePricePerM2)
        .filter((value): value is number => typeof value === "number" && value > 0)
    )
  );
  const minPricePerM2 = availablePricePerM2Values.length ? Math.min(...availablePricePerM2Values) : null;

  const roomTypes = Array.from(new Set(allUnits.map((u) => u.rooms))).sort();
  const areaRange = allUnits.length > 0 ? {
    min: Math.min(...allUnits.map((u) => u.area)),
    max: Math.max(...allUnits.map((u) => u.area)),
  } : { min: 0, max: 0 };

  const totalFloors = project.buildings.reduce((a, b) => a + b.floors.length, 0);
  const aboutFeatures = [
    {
      icon: Building2,
      title: t("project.buildingsFloors", { buildings: project.buildings.length, floors: totalFloors }),
      description: t("about.featurePlanning"),
    },
    {
      icon: Trees,
      title: t("project.apartmentSizes", { min: areaRange.min, max: areaRange.max }),
      description: t("about.featureCourtyard"),
    },
    {
      icon: ShieldCheck,
      title: t("project.roomOptions", { rooms: roomTypes.join(", ") }),
      description: t("about.featurePricing"),
    },
    {
      icon: KeyRound,
      title: t("project.parkingSecurity"),
      description: t("about.featureDeveloper"),
    },
  ];
  const aboutImages = heroImages.slice(0, 2);

  // Transform units for featured apartments (only with polygons)
  const featuredUnitsData = project.buildings.flatMap((building) =>
    building.floors.flatMap((floor) =>
      floor.units
        .filter((u) => u.polygonData)
        .map((unit) => ({
            id: unit.id,
            unitNumber: unit.unitNumber,
            displayNumber: computeDisplayNumber(unit.unitNumber, floor.number),
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
      <PublicPageAnalytics projectId={project.id} locale={locale} />
      <main
        className="flex-1"
        style={
          {
            "--public-primary": publicConfig?.primaryColor || DEFAULT_PUBLIC_PAGE_COLORS.primaryColor,
            "--public-secondary": publicConfig?.secondaryColor || DEFAULT_PUBLIC_PAGE_COLORS.secondaryColor,
            "--public-accent": publicConfig?.accentColor || DEFAULT_PUBLIC_PAGE_COLORS.accentColor,
            "--public-bg": publicConfig?.backgroundColor || DEFAULT_PUBLIC_PAGE_COLORS.backgroundColor,
            "--public-text": publicConfig?.textColor || DEFAULT_PUBLIC_PAGE_COLORS.textColor,
            backgroundColor: publicConfig?.backgroundColor || undefined,
            color: publicConfig?.textColor || undefined,
          } as React.CSSProperties
        }
      >
        {/* Interactive Master Plan Hero */}
        <section id="explore" className="bg-[#11100f] lg:-mt-[93px]">
          <ExploreClient
            project={JSON.parse(JSON.stringify(publicProject))}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroMinPricePerM2={minPricePerM2}
            heroAvailableCount={available}
            heroTotalCount={allUnits.length}
            heroExpectedYear={expectedYear}
          />
        </section>

        {/* Quick Stats with Animated Counters + Progress Bars */}
        {inventoryEnabled && sectionEnabled(publicConfig, "apartment_highlights") && (
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
        )}

        {/* About */}
        {sectionEnabled(publicConfig, "project_overview") && (
        <section id="about" className="bg-[#f4efe7] px-5 py-16 text-[#15120f] md:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:gap-20">
            <ScrollReveal direction="left">
              <div className="relative pl-8 md:pl-10">
                <div className="absolute left-0 top-0 h-[262px] w-[3px] bg-[#b75f43]" />
                <div className="mb-8 flex items-center gap-6">
                  <p className="font-heading text-[18px] font-semibold uppercase tracking-[0.24em] text-[#b75f43] md:text-[22px]">
                    {t("about.eyebrow", { name: projectName })}
                  </p>
                  <span className="h-px w-16 bg-[#b75f43]/65" />
                </div>

                <p className="max-w-[620px] text-[17px] font-medium leading-8 text-[#6f675e]">
                  {projectDescription}
                </p>

                <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                  {aboutFeatures.map((feature, index) => {
                    const Icon = feature.icon;

                    return (
                      <div
                        key={feature.title}
                        className={`flex gap-5 ${index > 1 ? "border-t border-[#d8cabc] pt-7" : ""}`}
                      >
                        <Icon className="mt-1 h-8 w-8 shrink-0 text-[#c66348]" strokeWidth={1.5} />
                        <div>
                          <h3 className="font-heading text-[18px] font-semibold leading-6 text-[#15120f]">
                            {feature.title}
                          </h3>
                          <p className="mt-1.5 text-[14px] font-medium leading-6 text-[#6f675e]">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href="/#contact"
                  className="mt-9 inline-flex h-14 min-w-[190px] items-center justify-center gap-5 rounded-[6px] bg-[#c66348] px-7 font-heading text-[16px] font-semibold text-white shadow-[0_18px_38px_rgba(198,99,72,0.22)] transition-colors hover:bg-[#d87355]"
                >
                  {t("about.learnMore")}
                  <ArrowRight className="h-5 w-5" strokeWidth={1.7} />
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <div className="grid gap-5">
                {aboutImages.length > 0 ? (
                  aboutImages.map((img, index) => (
                    <div
                      key={img.id}
                      className={`relative overflow-hidden rounded-[7px] border border-[#ddcec0] bg-[#e7ddd1] shadow-[0_22px_60px_rgba(30,24,18,0.12)] ${
                        index === 0 ? "h-[260px] md:h-[350px]" : "h-[240px] md:h-[330px]"
                      }`}
                    >
                      <Image
                        src={index === 0 ? getHeroImageUrl(img.imageUrl) : getCardImageUrl(img.imageUrl)}
                        alt={`${projectName} ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 48vw, 100vw"
                        loading="lazy"
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex h-[360px] items-center justify-center rounded-[7px] border border-[#ddcec0] bg-[#e7ddd1] text-[#8a7d70]">
                    {t("about.noImages")}
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
        )}

        {/* Featured Apartments */}
        {inventoryEnabled && sectionEnabled(publicConfig, "apartment_highlights") && (
          <FeaturedApartments
            units={featuredUnitsData}
            projectName={projectName}
            expectedYear={expectedYear}
            telegramUrl={project.telegramUrl}
          />
        )}

        {/* Location & Infrastructure */}
        {sectionEnabled(publicConfig, "location") && project.latitude && project.longitude ? (
          <LocationInfrastructure
            latitude={project.latitude}
            longitude={project.longitude}
            infrastructure={
              project.infrastructure as unknown as React.ComponentProps<typeof LocationInfrastructure>["infrastructure"]
            }
            address={projectAddress}
            brandName={platformSettings.publicBrandName}
          />
        ) : sectionEnabled(publicConfig, "location") ? (
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
        ) : null}

        {/* FAQ & Contact Form */}
        {sectionEnabled(publicConfig, "contact_form") && (
        <section id="contact" className="relative overflow-hidden border-y border-[#ded2c6] bg-[#f4efe7] px-5 py-16 md:py-24">
          <div className="relative mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-20">
              {sectionEnabled(publicConfig, "faq") && (
              <ScrollReveal>
                <FAQ items={faqs} locale={locale} />
              </ScrollReveal>
              )}
              <ScrollReveal delay={90}>
                <ContactForm
                  projectId={project.id}
                  projectName={brandName}
                  phoneNumber={project.phoneNumber}
                  telegramUrl={project.telegramUrl}
                  salesOfficeAddress={project.salesOfficeAddress}
                  source="contact_form"
                  formTitle={formTitle}
                  formSubtitle={formSubtitle}
                  thankYouTitle={thankYouTitle}
                  thankYouMessage={thankYouMessage}
                />
              </ScrollReveal>
            </div>
          </div>
        </section>
        )}

        {/* Find Best Option CTA */}
        <section className="relative overflow-hidden border-t border-[#2f2b25] bg-[#151716] px-5 py-16 text-[#fff8ec] md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(198,99,72,0.18),transparent_38%)]" />
          <div className="relative mx-auto max-w-5xl text-center">
            <ScrollReveal>
              <div className="mx-auto mb-6 h-[2px] w-16 bg-[#c66348]" />
              <h2 className="font-display text-[42px] font-semibold leading-none tracking-normal md:text-[58px]">
                {t("project.findPerfectApartment")}
              </h2>
              <p className="mx-auto mt-5 max-w-[620px] text-[16px] font-medium leading-8 text-[#d8c8b5]">
                {t("project.useInteractiveFloorPlan")}
              </p>
              <Link
                href="/#explore"
                className="mt-9 inline-flex h-14 min-w-[210px] items-center justify-center gap-4 rounded-[6px] bg-[#c66348] px-7 font-heading text-[16px] font-semibold text-white shadow-[0_18px_38px_rgba(198,99,72,0.22)] transition-colors hover:bg-[#d87355]"
              >
                {t("project.exploreFloorPlans")}
                <ArrowRight className="h-5 w-5" strokeWidth={1.7} />
              </Link>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
