"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import GroupedApartmentCard from "@/components/GroupedApartmentCard";
import ApartmentDetailModal from "@/components/ApartmentDetailModal";
import type { GroupedUnit } from "@/components/GroupedApartmentCard";

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

interface FilterOptions {
  rooms: number[];
  areaRange: { min: number; max: number };
}

interface Props {
  units: Unit[];
  filterOptions: FilterOptions;
  projectName?: string;
  expectedYear?: number | null;
  telegramUrl?: string | null;
}

export default function ApartmentsClient({ units, filterOptions, projectName, expectedYear, telegramUrl }: Props) {
  const t = useTranslations("apartments");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Filter state
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);
  const [areaMin, setAreaMin] = useState<string>("");
  const [areaMax, setAreaMax] = useState<string>("");

  const getPlanImage = (unit: Unit) =>
    unit.sketchImage || unit.sketchImage2 || unit.sketchImage3 || unit.sketchImage4;

  // Filter units first, then group
  const { groupedUnits, totalFilteredCount } = useMemo(() => {
    // Step 1: Filter
    const filtered = units.filter((unit) => {
      if (selectedRooms !== null && unit.rooms !== selectedRooms) return false;
      const minArea = parseFloat(areaMin) || 0;
      const maxArea = parseFloat(areaMax) || Infinity;
      if (unit.area < minArea || unit.area > maxArea) return false;
      return true;
    });

    // Step 2: Group by layout type (rooms + area)
    const groups = new Map<string, Unit[]>();
    filtered.forEach((unit) => {
      const key = `${unit.rooms}-${unit.area}`;
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, unit]);
    });

    // Step 3: Transform to GroupedUnit objects
    const result: GroupedUnit[] = [];
    groups.forEach((groupUnits, key) => {
      const first = groupUnits[0];
      const imageUnit = groupUnits.find((unit) => getPlanImage(unit)) || first;
      const floorNumbers = groupUnits.map(u => u.floor.number);
      const availableCount = groupUnits.filter(u => u.status === "available").length;
      const totalPrices = groupUnits
        .map((unit) => unit.totalPrice)
        .filter((value): value is number => typeof value === "number" && value > 0);
      const pricePerM2Values = groupUnits
        .map((unit) => unit.pricePerM2)
        .filter((value): value is number => typeof value === "number" && value > 0);

      result.push({
        key,
        rooms: first.rooms,
        area: first.area,
        unitNumber: first.unitNumber,
        sketchImage: getPlanImage(imageUnit),
        units: groupUnits,
        availableCount,
        totalCount: groupUnits.length,
        floorMin: Math.min(...floorNumbers),
        floorMax: Math.max(...floorNumbers),
        buildingName: first.floor.building.name,
        minTotalPrice: totalPrices.length ? Math.min(...totalPrices) : null,
        minPricePerM2: pricePerM2Values.length ? Math.min(...pricePerM2Values) : null,
      });
    });

    // Show layouts with real availability first, then keep scanning predictable.
    result.sort((a, b) => Number(b.availableCount > 0) - Number(a.availableCount > 0) || a.rooms - b.rooms || a.area - b.area);

    return { groupedUnits: result, totalFilteredCount: filtered.length };
  }, [units, selectedRooms, areaMin, areaMax]);

  const clearFilters = () => {
    setSelectedRooms(null);
    setAreaMin("");
    setAreaMax("");
  };

  const openApartmentGroup = (group: GroupedUnit) => {
    const targetUnit = group.units.find((unit) => unit.status === "available") || group.units[0];
    setSelectedUnit(targetUnit ?? null);
  };

  const hasActiveFilters = selectedRooms !== null || areaMin || areaMax;

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      {/* Filters */}
      <div className="mb-8 border border-[#d8cabc] bg-[#fbf7ef] p-5 shadow-[0_24px_70px_rgba(36,28,20,0.08)] md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#e0d1c2] pb-5">
          <div>
            <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#b75f43]">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.7} />
              {t("sort")}
            </div>
            <p className="mt-2 text-[14px] font-medium text-[#766b61]">
              {projectName ? `${projectName} · ` : ""}{t("found")}: <span className="font-semibold text-[#15120f]">{groupedUnits.length}</span> {t("layouts")}
            </p>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#d8cabc] bg-[#f4efe7] px-4 text-[13px] font-semibold text-[#6f675e] transition-colors hover:border-[#c66348] hover:text-[#b75f43]"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
              {t("clearFilters")}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-5">
          {/* Rooms filter */}
          <div>
            <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8174]">{t("rooms")}</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelectedRooms(null)}
                className={`h-10 rounded-[6px] px-4 text-[14px] font-semibold transition ${selectedRooms === null
                  ? "bg-[#15120f] text-[#fff8ec]"
                  : "border border-[#d8cabc] bg-transparent text-[#6f675e] hover:border-[#c66348] hover:text-[#15120f]"
                  }`}
              >
                {t("all")}
              </button>
              {filterOptions.rooms.map((room) => (
                <button
                  key={room}
                  onClick={() => setSelectedRooms(room)}
                  className={`h-10 min-w-10 rounded-[6px] px-4 text-[14px] font-semibold transition ${selectedRooms === room
                    ? "bg-[#c66348] text-white"
                    : "border border-[#d8cabc] bg-transparent text-[#6f675e] hover:border-[#c66348] hover:text-[#15120f]"
                    }`}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>

          {/* Area filter */}
          <div>
            <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8174]">{t("area")} (m²)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={filterOptions.areaRange.min.toString()}
                value={areaMin}
                onChange={(e) => setAreaMin(e.target.value)}
                className="h-10 w-24 rounded-[6px] border border-[#d8cabc] bg-[#f8f2ea] px-3 text-[14px] font-semibold text-[#15120f] outline-none transition-colors placeholder:text-[#a89c90] focus:border-[#c66348] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66348]/25"
              />
              <span className="text-[#a89c90]">—</span>
              <input
                type="number"
                placeholder={filterOptions.areaRange.max.toString()}
                value={areaMax}
                onChange={(e) => setAreaMax(e.target.value)}
                className="h-10 w-24 rounded-[6px] border border-[#d8cabc] bg-[#f8f2ea] px-3 text-[14px] font-semibold text-[#15120f] outline-none transition-colors placeholder:text-[#a89c90] focus:border-[#c66348] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66348]/25"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 text-[13px] font-medium text-[#8d8174]">
          {totalFilteredCount} {t("totalUnits")}
        </div>
      </div>

      {/* Units grid */}
      {groupedUnits.length === 0 ? (
        <div className="border border-[#d8cabc] bg-[#fbf7ef] p-12 text-center">
          <span className="mx-auto mb-5 block h-[2px] w-14 bg-[#c66348]" />
          <p className="font-heading text-[18px] font-semibold text-[#15120f]">{t("noResults")}</p>
          <button
            onClick={clearFilters}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-[#d8cabc] bg-[#f4efe7] px-5 text-[14px] font-semibold text-[#6f675e] transition-colors hover:border-[#c66348] hover:text-[#b75f43]"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
            {t("clearFilters")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groupedUnits.map((group) => (
            <GroupedApartmentCard
              key={group.key}
              group={group}
              onClick={() => openApartmentGroup(group)}
            />
          ))}
        </div>
      )}

      {selectedUnit && (
        <ApartmentDetailModal
          unit={selectedUnit}
          allUnits={units}
          telegramUrl={telegramUrl}
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </div>
  );
}
