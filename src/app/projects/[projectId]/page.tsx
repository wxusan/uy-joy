import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LocationInfrastructure from "@/components/LocationInfrastructure";
import ContactForm from "@/components/ContactForm";
import FAQ from "@/components/FAQ";
import { formatPrice } from "@/lib/utils";
import { getTranslation, Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const cookieStore = cookies();
  const locale = (cookieStore.get("locale")?.value || "en") as Locale;

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

  // Get translated content
  const projectName = getTranslation(project.nameTranslations, project.name, locale);
  const projectDescription = getTranslation(project.descriptionTranslations, project.description || "", locale);
  const projectAddress = getTranslation(project.addressTranslations, project.address || "", locale);

  const allUnits = project.buildings.flatMap((b) => b.floors.flatMap((f) => f.units));
  const available = allUnits.filter((u) => u.status === "available").length;
  const reserved = allUnits.filter((u) => u.status === "reserved").length;
  const sold = allUnits.filter((u) => u.status === "sold").length;

  const prices = allUnits
    .map((u) => {
      const floor = project.buildings
        .flatMap((b) => b.floors)
        .find((f) => f.id === u.floorId);
      const pp = u.pricePerM2 || floor?.basePricePerM2 || 0;
      return pp * u.area;
    })
    .filter((p) => p > 0);

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const roomTypes = Array.from(new Set(allUnits.map((u) => u.rooms))).sort();
  const areaRange = {
    min: Math.min(...allUnits.map((u) => u.area)),
    max: Math.max(...allUnits.map((u) => u.area)),
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <Link href="/" className="text-emerald-400 text-sm hover:underline mb-4 inline-block">
              &larr; Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{projectName}</h1>
            <p className="text-slate-300 flex items-center gap-2">
              <span>📍</span> {projectAddress}
            </p>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="max-w-6xl mx-auto px-4 -mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{allUnits.length}</p>
              <p className="text-sm text-slate-500">Total Units</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-5 text-center">
              <p className="text-3xl font-bold text-emerald-600">{available}</p>
              <p className="text-sm text-slate-500">Available</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-5 text-center">
              <p className="text-3xl font-bold text-yellow-600">{reserved}</p>
              <p className="text-sm text-slate-500">Reserved</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-5 text-center">
              <p className="text-3xl font-bold text-red-600">{sold}</p>
              <p className="text-sm text-slate-500">Sold</p>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-4">About the Complex</h2>
              <p className="text-slate-600 leading-relaxed mb-6">{projectDescription}</p>

              <h3 className="font-semibold text-slate-800 mb-3">Key Features</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> {project.buildings.length} Building(s), {project.buildings.reduce((a, b) => a + b.floors.length, 0)} floors total
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Apartment sizes: {areaRange.min}–{areaRange.max} m²
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Room options: {roomTypes.join(", ")}-room apartments
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Underground parking & 24/7 security
                </li>
              </ul>
            </div>

            {/* Gallery placeholder */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-200 to-slate-100 rounded-2xl h-48 flex items-center justify-center">
                <span className="text-6xl">🏢</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-100 to-slate-100 rounded-xl h-24 flex items-center justify-center">
                  <span className="text-3xl">🌳</span>
                </div>
                <div className="bg-gradient-to-br from-slate-100 to-emerald-100 rounded-xl h-24 flex items-center justify-center">
                  <span className="text-3xl">🅿️</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Price Range */}
        <section className="bg-slate-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Price Range</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Starting from</p>
                <p className="text-3xl font-bold text-emerald-600">{formatPrice(minPrice)}</p>
              </div>
              <div className="hidden md:block text-4xl text-slate-300">→</div>
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Up to</p>
                <p className="text-3xl font-bold text-slate-800">{formatPrice(maxPrice)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Location & Infrastructure */}
        {project.latitude && project.longitude ? (
          <LocationInfrastructure
            latitude={project.latitude}
            longitude={project.longitude}
            infrastructure={project.infrastructure ? JSON.parse(project.infrastructure) : undefined}
            address={projectAddress}
          />
        ) : (
          <section className="max-w-6xl mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold mb-6">Location</h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-slate-600 mb-4">
                  Conveniently located in the heart of the city with easy access to public transportation,
                  shopping centers, schools, and healthcare facilities.
                </p>
                <div className="flex items-start gap-3 text-slate-700 bg-slate-50 rounded-lg p-4">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="font-medium">{projectName}</p>
                    <p className="text-sm text-slate-500">{projectAddress}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-200 rounded-2xl h-64 flex items-center justify-center">
                <span className="text-slate-400 text-sm">Map placeholder - Add coordinates in admin</span>
              </div>
            </div>
          </section>
        )}

        {/* FAQ & Contact Form */}
        <section className="bg-slate-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12">
              <FAQ />
              <ContactForm projectId={project.id} projectName={projectName} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-emerald-600 text-white py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Find Your Perfect Apartment</h2>
            <p className="text-emerald-100 mb-6">
              Use our interactive floor plan viewer to explore available units and their prices.
            </p>
            <Link
              href={`/projects/${project.id}/explore`}
              className="inline-block bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-4 rounded-xl text-lg font-semibold transition shadow-lg"
            >
              Explore Floor Plans
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
