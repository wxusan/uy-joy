"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { getCardImageUrl } from "@/lib/cloudinary";
import ScrollReveal from "./ScrollReveal";

const ApartmentDetailModal = dynamic(() => import("./ApartmentDetailModal"), {
  ssr: false,
});

interface Unit {
  id: string;
  unitNumber: string;
  displayNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  sketchImage: string | null;
  sketchImage2: string | null;
  sketchImage3: string | null;
  sketchImage4: string | null;
  floor: {
    number: number;
    basePricePerM2: number | null;
    building: {
      name: string;
    };
  };
}

interface Props {
  units: Unit[];
  projectName?: string;
  expectedYear?: number | null;
  telegramUrl?: string | null;
}

function getPlanImage(unit: Unit) {
  return unit.sketchImage || unit.sketchImage2 || unit.sketchImage3 || unit.sketchImage4;
}

function getLayoutKey(unit: Unit) {
  return `${unit.rooms}-${unit.area}`;
}

function formatPrice(value: number | null) {
  if (!value) return null;

  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} UZS`;
}

export default function FeaturedApartments({ units, telegramUrl }: Props) {
  const t = useTranslations("apartments");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const availableUnits = useMemo(() => units.filter((unit) => unit.status === "available"), [units]);

  const layoutAvailability = useMemo(() => {
    const counts = new Map<string, number>();

    availableUnits.forEach((unit) => {
      const key = getLayoutKey(unit);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [availableUnits]);

  const recommendations = useMemo(() => {
    if (availableUnits.length === 0) return [];

    const areas = availableUnits.map((unit) => unit.area).sort((a, b) => a - b);
    const medianArea = areas[Math.floor(areas.length / 2)] || 0;
    const minPriceByRooms = new Map<number, number>();

    availableUnits.forEach((unit) => {
      if (!unit.pricePerM2) return;
      const current = minPriceByRooms.get(unit.rooms);
      if (!current || unit.pricePerM2 < current) {
        minPriceByRooms.set(unit.rooms, unit.pricePerM2);
      }
    });

    const scoreUnit = (unit: Unit) => {
      const planScore = getPlanImage(unit) ? 34 : 0;
      const minRoomPrice = minPriceByRooms.get(unit.rooms);
      const valueScore = unit.pricePerM2 && minRoomPrice ? Math.min(30, (minRoomPrice / unit.pricePerM2) * 30) : 8;
      const floorScore = unit.floor.number >= 2 && unit.floor.number <= 8 ? 12 : 5;
      const dataScore = unit.totalPrice || unit.pricePerM2 ? 10 : 0;
      const livabilityScore = unit.area >= medianArea ? 8 : 5;

      return planScore + valueScore + floorScore + dataScore + livabilityScore;
    };

    const sorted = [...availableUnits].sort((a, b) => scoreUnit(b) - scoreUnit(a));
    const selected: Unit[] = [];
    const usedFloors = new Set<number>();
    const usedRooms = new Set<number>();
    const usedAreas = new Set<number>();

    for (const unit of sorted) {
      if (selected.length >= 4) break;
      if (usedFloors.has(unit.floor.number)) continue;
      if (usedRooms.has(unit.rooms)) continue;
      if (usedAreas.has(unit.area)) continue;

      selected.push(unit);
      usedFloors.add(unit.floor.number);
      usedRooms.add(unit.rooms);
      usedAreas.add(unit.area);
    }

    // If data does not have four fully unique room/area/floor combinations,
    // keep the most important rule first: one apartment per floor.
    for (const unit of sorted) {
      if (selected.length >= 4) break;
      if (selected.some((selectedUnit) => selectedUnit.id === unit.id)) continue;
      if (usedFloors.has(unit.floor.number)) continue;

      selected.push(unit);
      usedFloors.add(unit.floor.number);
    }

    return selected.slice(0, 4);
  }, [availableUnits]);

  const reasonFor = (unit: Unit) => {
    const sameRooms = availableUnits.filter((item) => item.rooms === unit.rooms && item.pricePerM2);
    const minRoomPrice = sameRooms.length ? Math.min(...sameRooms.map((item) => item.pricePerM2 || Infinity)) : null;

    if (unit.pricePerM2 && minRoomPrice && unit.pricePerM2 <= minRoomPrice * 1.03) return t("bestValue");
    if (unit.rooms <= 2) return t("compactChoice");
    if (unit.rooms >= 3) return t("familyLayout");
    if (unit.floor.number >= 3) return t("popularFloor");
    return t("readyChoice");
  };

  const openApartment = (unit: Unit) => {
    setSelectedUnit(unit);
  };

  if (recommendations.length === 0) return null;

  const [heroUnit, ...sideUnits] = recommendations;
  const availableCount = availableUnits.length;

  return (
    <section className="bg-[#f4efe7] px-5 py-16 text-[#15120f] md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
        <ScrollReveal>
          <div className="lg:sticky lg:top-28">
            <div className="mb-5 h-[2px] w-14 bg-[#c66348]" />
            <h2 className="font-display text-[44px] font-semibold leading-none tracking-normal md:text-[56px]">
              {t("recommendedApartments")}
            </h2>
            <p className="mt-5 max-w-[360px] text-[15px] font-medium leading-7 text-[#6f675e]">
              {t("recommendationSubtitle")}
            </p>
            <p className="mt-5 max-w-[360px] text-[12px] font-semibold uppercase tracking-[0.16em] text-[#b75f43]">
              {t("selectionBasis")}
            </p>
            <Link
              href="/apartments"
              className="mt-8 inline-flex h-12 items-center justify-center gap-3 rounded-[6px] bg-[#15120f] px-6 font-heading text-[14px] font-semibold text-white transition-colors hover:bg-[#2a211d]"
            >
              {t("viewAllApartments")}
              <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <ScrollReveal delay={80}>
            <RecommendationCard
              unit={heroUnit}
              reason={reasonFor(heroUnit)}
              availabilityCount={layoutAvailability.get(getLayoutKey(heroUnit)) || 1}
              primary
              onClick={() => openApartment(heroUnit)}
              t={t}
            />
          </ScrollReveal>

          <div className="grid gap-4">
            {sideUnits.map((unit, index) => (
              <ScrollReveal key={unit.id} delay={140 + index * 90}>
                <RecommendationCard
                  unit={unit}
                  reason={reasonFor(unit)}
                  availabilityCount={layoutAvailability.get(getLayoutKey(unit)) || 1}
                  onClick={() => openApartment(unit)}
                  t={t}
                />
              </ScrollReveal>
            ))}

            <ScrollReveal delay={360}>
              <Link
                href="/apartments"
                className="flex min-h-[92px] items-center justify-between rounded-[7px] border border-[#d8cabc] bg-[#fbf7ef] px-6 font-heading text-[16px] font-semibold text-[#15120f] transition-colors hover:border-[#c66348] hover:text-[#b75f43]"
              >
                <span>{t("viewMore")} ({availableCount})</span>
                <ArrowRight className="h-5 w-5" strokeWidth={1.7} />
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {selectedUnit && (
        <ApartmentDetailModal
          unit={selectedUnit}
          allUnits={units}
          telegramUrl={telegramUrl}
          onClose={() => setSelectedUnit(null)}
        />
      )}

    </section>
  );
}

function RecommendationCard({
  unit,
  reason,
  availabilityCount,
  primary = false,
  onClick,
  t,
}: {
  unit: Unit;
  reason: string;
  availabilityCount: number;
  primary?: boolean;
  onClick: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const displayNumber = unit.displayNumber;
  const image = getPlanImage(unit);
  const price = formatPrice(unit.totalPrice);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group grid w-full overflow-hidden rounded-[7px] border border-[#302923] bg-[#171816] text-left text-[#f6eadb] shadow-[0_24px_60px_rgba(22,18,14,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c66348]/70 hover:shadow-[0_32px_80px_rgba(22,18,14,0.24)] ${
        primary ? "min-h-[440px] grid-rows-[1fr_auto]" : "min-h-[170px] grid-cols-[150px_minmax(0,1fr)]"
      }`}
    >
      <div className={`relative bg-[#f8f4ee] ${primary ? "min-h-[285px]" : "min-h-full"}`}>
        {image ? (
          <Image
            src={getCardImageUrl(image)}
            alt={`Apartment ${displayNumber}`}
            fill
            sizes={primary ? "(min-width: 1024px) 42vw, 100vw" : "220px"}
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-[#8a7d70]">
            {unit.area} m²
          </div>
        )}
      </div>

      <div className={`flex flex-col ${primary ? "p-6" : "p-5"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[30px] font-semibold leading-none text-[#fff8ec]">{displayNumber}</p>
            <span className="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#91bd78]">
              <span className="h-2 w-2 rounded-full bg-[#91bd78]" />
              {t("layoutAvailable", { count: availabilityCount })}
            </span>
          </div>
          <span className="rounded-full border border-[#c66348]/35 bg-[#c66348]/12 px-3 py-1 text-[11px] font-semibold text-[#f0a383]">
            {reason}
          </span>
        </div>

        <div className="mt-5 grid gap-2 text-[13px] text-[#d8c8b5]">
          <Info label={t("area")} value={`${unit.area} m²`} />
          <Info label={t("rooms")} value={`${unit.rooms}`} />
          <Info label={t("floor")} value={`${unit.floor.number}`} />
        </div>

        <div className="mt-auto pt-5">
          <p className="font-heading text-[18px] font-semibold text-[#fff8ec]">
            {price || t("priceOnRequest")}
          </p>
          {unit.pricePerM2 ? (
            <p className="mt-1 text-[12px] font-medium text-[#d8c8b5]/75">
              {formatPrice(unit.pricePerM2)} / m²
            </p>
          ) : null}
          <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#c66348]">
            {t("viewApartment")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.7} />
          </span>
        </div>
      </div>
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[#9f907f]">{label}</span>
      <span className="min-w-[20px] flex-1 border-b border-dotted border-[#5b5048]" />
      <span className="font-semibold text-[#f2dfc5]">{value}</span>
    </div>
  );
}
