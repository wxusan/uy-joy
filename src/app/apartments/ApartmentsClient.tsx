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
      completionYear?: number | null;
    };
  };
}

interface FilterOptions {
  rooms: number[];
  areaRange: { min: number; max: number };
  floorRange: { min: number; max: number };
  buildings: string[];
  completionYears: number[];
}

interface Props {
  units: Unit[];
  filterOptions: FilterOptions;
  projectName?: string;
  expectedYear?: number | null;
  telegramUrl?: string | null;
}

// ── Dual range slider ────────────────────────────────────────────────────────
function DualRangeSlider({
  min, max, valueMin, valueMax,
  onChangeMin, onChangeMax,
  step = 1,
  prefix,
  suffix,
}: {
  min: number; max: number;
  valueMin: number; valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  const range = max - min || 1;
  const leftPct  = ((valueMin - min) / range) * 100;
  const rightPct = ((max - valueMax) / range) * 100;

  // When the handles are on top of each other the upper one should be clickable
  const minZ = valueMin >= valueMax - step ? 5 : 3;
  const maxZ = valueMin >= valueMax - step ? 3 : 5;

  const thumbCls =
    "pointer-events-none absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent " +
    "[&::-webkit-slider-thumb]:pointer-events-auto " +
    "[&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] " +
    "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none " +
    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 " +
    "[&::-webkit-slider-thumb]:border-[#c66348] [&::-webkit-slider-thumb]:bg-white " +
    "[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.18)] " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-[18px] " +
    "[&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:cursor-pointer " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 " +
    "[&::-moz-range-thumb]:border-[#c66348] [&::-moz-range-thumb]:bg-white " +
    "[&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent";

  return (
    <div className="w-44">
      {/* Value display */}
      <div className="mb-3 text-[13px] font-semibold text-[#15120f]">
        {prefix && <span className="font-normal text-[#8d8174]">{prefix} </span>}
        {valueMin}
        <span className="mx-1.5 font-normal text-[#8d8174]">—</span>
        {valueMax}
        {suffix && <span className="ml-0.5 font-normal text-[#8d8174]">{suffix}</span>}
      </div>

      {/* Track + thumbs */}
      <div className="relative h-5">
        {/* Background track */}
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#e0d1c2]" />
        {/* Active fill */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#c66348]"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min} max={max} step={step}
          value={valueMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v <= valueMax) onChangeMin(v);
          }}
          className={thumbCls}
          style={{ zIndex: minZ }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min} max={max} step={step}
          value={valueMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= valueMin) onChangeMax(v);
          }}
          className={thumbCls}
          style={{ zIndex: maxZ }}
        />
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export default function ApartmentsClient({ units, filterOptions, projectName, telegramUrl }: Props) {
  const t = useTranslations("apartments");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Filter state — sliders start at the data's full range
  const [selectedRooms, setSelectedRooms]   = useState<number | null>(null);
  const [areaMin,  setAreaMin]  = useState(filterOptions.areaRange.min);
  const [areaMax,  setAreaMax]  = useState(filterOptions.areaRange.max);
  const [floorMin, setFloorMin] = useState(filterOptions.floorRange.min);
  const [floorMax, setFloorMax] = useState(filterOptions.floorRange.max);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const getPlanImage = (unit: Unit) =>
    unit.sketchImage || unit.sketchImage2 || unit.sketchImage3 || unit.sketchImage4;

  const { groupedUnits, totalFilteredCount } = useMemo(() => {
    const filtered = units.filter((unit) => {
      if (selectedRooms !== null) {
        if (selectedRooms === 4 ? unit.rooms < 4 : unit.rooms !== selectedRooms) return false;
      }
      if (unit.area < areaMin || unit.area > areaMax) return false;
      if (unit.floor.number < floorMin || unit.floor.number > floorMax) return false;
      if (selectedBuilding && unit.floor.building.name !== selectedBuilding) return false;
      if (selectedYear !== null && (unit.floor.building.completionYear ?? null) !== selectedYear) return false;
      return true;
    });

    const groups = new Map<string, Unit[]>();
    filtered.forEach((unit) => {
      const key = `${unit.rooms}-${unit.area}`;
      groups.set(key, [...(groups.get(key) ?? []), unit]);
    });

    const result: GroupedUnit[] = [];
    groups.forEach((groupUnits) => {
      const first       = groupUnits[0];
      const imageUnit   = groupUnits.find(getPlanImage) ?? first;
      const floorNumbers = groupUnits.map(u => u.floor.number);
      const availableCount = groupUnits.filter(u => u.status === "available").length;
      const totalPrices    = groupUnits.map(u => u.totalPrice).filter((v): v is number => typeof v === "number" && v > 0);
      const pricePerM2s    = groupUnits.map(u => u.pricePerM2).filter((v): v is number => typeof v === "number" && v > 0);

      result.push({
        key: `${first.rooms}-${first.area}`,
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
        minTotalPrice:  totalPrices.length ? Math.min(...totalPrices) : null,
        minPricePerM2:  pricePerM2s.length ? Math.min(...pricePerM2s) : null,
      });
    });

    result.sort((a, b) =>
      Number(b.availableCount > 0) - Number(a.availableCount > 0) ||
      a.rooms - b.rooms ||
      a.area  - b.area
    );

    return { groupedUnits: result, totalFilteredCount: filtered.length };
  }, [units, selectedRooms, areaMin, areaMax, floorMin, floorMax, selectedBuilding, selectedYear]);

  const clearFilters = () => {
    setSelectedRooms(null);
    setAreaMin(filterOptions.areaRange.min);
    setAreaMax(filterOptions.areaRange.max);
    setFloorMin(filterOptions.floorRange.min);
    setFloorMax(filterOptions.floorRange.max);
    setSelectedBuilding("");
    setSelectedYear(null);
  };

  const hasActiveFilters =
    selectedRooms !== null ||
    areaMin  !== filterOptions.areaRange.min  ||
    areaMax  !== filterOptions.areaRange.max  ||
    floorMin !== filterOptions.floorRange.min ||
    floorMax !== filterOptions.floorRange.max ||
    selectedBuilding !== "" ||
    selectedYear !== null;

  const openApartmentGroup = (group: GroupedUnit) => {
    const target = group.units.find(u => u.status === "available") ?? group.units[0];
    setSelectedUnit(target ?? null);
  };

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
              {projectName ? `${projectName} · ` : ""}
              {t("found")}: <span className="font-semibold text-[#15120f]">{groupedUnits.length}</span> {t("layouts")}
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

        <div className="flex flex-wrap items-end gap-6">
          {/* Rooms */}
          <div>
            <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8174]">
              {t("rooms")}
            </label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSelectedRooms(null)}
                className={`h-10 rounded-[6px] px-4 text-[14px] font-semibold transition ${
                  selectedRooms === null
                    ? "bg-[#15120f] text-[#fff8ec]"
                    : "border border-[#d8cabc] bg-transparent text-[#6f675e] hover:border-[#c66348] hover:text-[#15120f]"
                }`}
              >
                {t("all")}
              </button>
              {filterOptions.rooms.filter(r => r <= 4).map((room) => {
                const value = room >= 4 ? 4 : room;
                const label = room >= 4 ? "4+" : String(room);
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedRooms(value)}
                    className={`h-10 min-w-10 rounded-[6px] px-4 text-[14px] font-semibold transition ${
                      selectedRooms === value
                        ? "bg-[#c66348] text-white"
                        : "border border-[#d8cabc] bg-transparent text-[#6f675e] hover:border-[#c66348] hover:text-[#15120f]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floor range slider */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8174]">
              {t("floor")}
            </label>
            <DualRangeSlider
              min={filterOptions.floorRange.min}
              max={filterOptions.floorRange.max}
              valueMin={floorMin}
              valueMax={floorMax}
              onChangeMin={setFloorMin}
              onChangeMax={setFloorMax}
            />
          </div>

          {/* Area range slider */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8174]">
              {t("area")}
            </label>
            <DualRangeSlider
              min={filterOptions.areaRange.min}
              max={filterOptions.areaRange.max}
              valueMin={areaMin}
              valueMax={areaMax}
              onChangeMin={setAreaMin}
              onChangeMax={setAreaMax}
              suffix="м²"
            />
          </div>

          {/* Completion year */}
          {filterOptions.completionYears.length > 0 && (
            <div>
              <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8174]">
                {t("readyYear")}
              </label>
              <div className="flex gap-1.5">
                {filterOptions.completionYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                    className={`h-10 rounded-[6px] px-4 text-[14px] font-semibold transition ${
                      selectedYear === year
                        ? "bg-[#c66348] text-white"
                        : "border border-[#d8cabc] bg-transparent text-[#6f675e] hover:border-[#c66348] hover:text-[#15120f]"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Building — only when multiple buildings exist */}
          {filterOptions.buildings.length > 1 && (
            <div>
              <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8d8174]">
                {t("building")}
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="h-10 rounded-[6px] border border-[#d8cabc] bg-[#f8f2ea] px-3 text-[14px] font-semibold text-[#15120f] outline-none transition-colors focus:border-[#c66348]"
              >
                <option value="">{t("all")}</option>
                {filterOptions.buildings.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-5 text-[13px] font-medium text-[#8d8174]">
          {totalFilteredCount} {t("totalUnits")}
        </div>
      </div>

      {/* Grid */}
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
