"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import GroupedApartmentCard from "@/components/GroupedApartmentCard";
import GroupedApartmentModal from "@/components/GroupedApartmentModal";
import type { GroupedUnit } from "@/components/GroupedApartmentCard";

interface Unit {
  id: string;
  unitNumber: string;
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
}

export default function ApartmentsClient({ units, filterOptions, projectName, expectedYear }: Props) {
  const t = useTranslations("apartments");
  const [selectedGroup, setSelectedGroup] = useState<GroupedUnit | null>(null);

  // Filter state
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);
  const [areaMin, setAreaMin] = useState<string>("");
  const [areaMax, setAreaMax] = useState<string>("");

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
      const floorNumbers = groupUnits.map(u => u.floor.number);
      const availableCount = groupUnits.filter(u => u.status === "available").length;

      result.push({
        key,
        rooms: first.rooms,
        area: first.area,
        unitNumber: first.unitNumber,
        sketchImage: first.sketchImage,
        units: groupUnits,
        availableCount,
        totalCount: groupUnits.length,
        floorMin: Math.min(...floorNumbers),
        floorMax: Math.max(...floorNumbers),
        buildingName: first.floor.building.name,
      });
    });

    // Sort by rooms ascending, then by area ascending
    result.sort((a, b) => a.rooms - b.rooms || a.area - b.area);

    return { groupedUnits: result, totalFilteredCount: filtered.length };
  }, [units, selectedRooms, areaMin, areaMax]);

  const clearFilters = () => {
    setSelectedRooms(null);
    setAreaMin("");
    setAreaMax("");
  };

  const hasActiveFilters = selectedRooms !== null || areaMin || areaMax;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Rooms filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("rooms")}</label>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedRooms(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedRooms === null
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {t("all")}
              </button>
              {filterOptions.rooms.map((room) => (
                <button
                  key={room}
                  onClick={() => setSelectedRooms(room)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedRooms === room
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>

          {/* Area filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("area")} (m²)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={filterOptions.areaRange.min.toString()}
                value={areaMin}
                onChange={(e) => setAreaMin(e.target.value)}
                className="w-20 px-2 py-1.5 border rounded-lg text-sm"
              />
              <span className="text-slate-400">—</span>
              <input
                type="number"
                placeholder={filterOptions.areaRange.max.toString()}
                value={areaMax}
                onChange={(e) => setAreaMax(e.target.value)}
                className="w-20 px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {t("clearFilters")}
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="mt-3 pt-3 border-t text-sm text-slate-500">
          {t("found")}: <span className="font-semibold text-slate-700">{groupedUnits.length}</span> {t("layouts") || "ta xonadon turi"}
          <span className="text-slate-400 ml-2">({totalFilteredCount} {t("totalUnits") || "ta kvartira jami"})</span>
        </div>
      </div>

      {/* Units grid */}
      {groupedUnits.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center">
          <span className="text-4xl mb-4 block text-slate-300">—</span>
          <p className="text-slate-500">{t("noResults")}</p>
          <button
            onClick={clearFilters}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {t("clearFilters")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groupedUnits.map((group) => (
            <GroupedApartmentCard
              key={group.key}
              group={group}
              onClick={() => setSelectedGroup(group)}
            />
          ))}
        </div>
      )}

      {/* Grouped Detail Modal */}
      {selectedGroup && (
        <GroupedApartmentModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
