"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import ApartmentCard from "@/components/ApartmentCard";
import ApartmentDetailModal from "@/components/ApartmentDetailModal";
import { formatPrice } from "@/lib/utils";

interface Unit {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  sketchImage:  string | null;
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
  priceRange: { min: number; max: number };
}

interface Props {
  units: Unit[];
  filterOptions: FilterOptions;
}

export default function ApartmentsClient({ units, filterOptions }: Props) {
  const t = useTranslations("apartments");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  // Filter state
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);
  const [areaMin, setAreaMin] = useState<string>("");
  const [areaMax, setAreaMax] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [sortBy, setSortBy] = useState<string>("price-asc");

  // Calculate price for a unit
  const getUnitPrice = (unit: Unit) => {
    const pp = unit.pricePerM2 || unit.floor.basePricePerM2 || 0;
    return unit.totalPrice || pp * unit.area;
  };

  // Filter and sort units
  const filteredUnits = useMemo(() => {
    const filtered = units.filter((unit) => {
      // Status filter
      if (statusFilter && unit.status !== statusFilter) return false;
      
      // Rooms filter
      if (selectedRooms !== null && unit.rooms !== selectedRooms) return false;
      
      // Area filter
      const minArea = parseFloat(areaMin) || 0;
      const maxArea = parseFloat(areaMax) || Infinity;
      if (unit.area < minArea || unit.area > maxArea) return false;
      
      // Price filter
      const unitPrice = getUnitPrice(unit);
      const minPrice = parseFloat(priceMin) || 0;
      const maxPrice = parseFloat(priceMax) || Infinity;
      if (unitPrice < minPrice || unitPrice > maxPrice) return false;
      
      return true;
    });

    // Sort (creates new array)
    switch (sortBy) {
      case "price-asc":
        return [...filtered].sort((a, b) => getUnitPrice(a) - getUnitPrice(b));
      case "price-desc":
        return [...filtered].sort((a, b) => getUnitPrice(b) - getUnitPrice(a));
      case "area-asc":
        return [...filtered].sort((a, b) => a.area - b.area);
      case "area-desc":
        return [...filtered].sort((a, b) => b.area - a.area);
      case "rooms-asc":
        return [...filtered].sort((a, b) => a.rooms - b.rooms);
      default:
        return filtered;
    }
  }, [units, selectedRooms, areaMin, areaMax, priceMin, priceMax, statusFilter, sortBy]);

  const clearFilters = () => {
    setSelectedRooms(null);
    setAreaMin("");
    setAreaMax("");
    setPriceMin("");
    setPriceMax("");
    setStatusFilter("available");
  };

  const hasActiveFilters = selectedRooms !== null || areaMin || areaMax || priceMin || priceMax || statusFilter !== "available";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Rooms filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("rooms")}</label>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedRooms(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  selectedRooms === null
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedRooms === room
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

          {/* Price filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("price")} (so&apos;m)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={formatPrice(filterOptions.priceRange.min).replace(/\s/g, "")}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-28 px-2 py-1.5 border rounded-lg text-sm"
              />
              <span className="text-slate-400">—</span>
              <input
                type="number"
                placeholder={formatPrice(filterOptions.priceRange.max).replace(/\s/g, "")}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-28 px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("status")}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="">{t("all")}</option>
              <option value="available">{t("available")}</option>
              <option value="reserved">{t("reserved")}</option>
              <option value="sold">{t("sold")}</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("sort")}</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="price-asc">{t("priceAsc")}</option>
              <option value="price-desc">{t("priceDesc")}</option>
              <option value="area-asc">{t("areaAsc")}</option>
              <option value="area-desc">{t("areaDesc")}</option>
              <option value="rooms-asc">{t("roomsAsc")}</option>
            </select>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
            >
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
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-slate-500">{t("noResults")}</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {t("clearFilters")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUnits.map((unit) => (
            <ApartmentCard
              key={unit.id}
              unit={unit}
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
