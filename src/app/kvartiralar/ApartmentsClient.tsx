"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import ApartmentCard from "@/components/ApartmentCard";
import ApartmentDetailModal from "@/components/ApartmentDetailModal";

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
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Filter state
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);
  const [areaMin, setAreaMin] = useState<string>("");
  const [areaMax, setAreaMax] = useState<string>("");


  // Filter and sort units
  const filteredUnits = useMemo(() => {
    const filtered = units.filter((unit) => {

      // Rooms filter
      if (selectedRooms !== null && unit.rooms !== selectedRooms) return false;

      // Area filter
      const minArea = parseFloat(areaMin) || 0;
      const maxArea = parseFloat(areaMax) || Infinity;
      if (unit.area < minArea || unit.area > maxArea) return false;

      return true;
    });

    // Sort by area ascending
    return [...filtered].sort((a, b) => a.area - b.area);
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
          {t("found")}: <span className="font-semibold text-slate-700">{filteredUnits.length}</span> {t("apartments")}
        </div>
      </div>

      {/* Units grid */}
      {filteredUnits.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUnits.map((unit) => (
            <ApartmentCard
              key={unit.id}
              unit={unit}
              projectName={projectName}
              expectedYear={expectedYear}
              onClick={() => setSelectedUnit(unit)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedUnit && (
        <ApartmentDetailModal
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </div>
  );
}
