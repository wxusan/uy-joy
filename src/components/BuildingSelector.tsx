"use client";

import { useTranslations } from "next-intl";
import { BuildingWithFloors } from "@/types";

interface Props {
  buildings: BuildingWithFloors[];
  selectedBuildingId: string | null;
  onBuildingSelect: (building: BuildingWithFloors) => void;
}

export default function BuildingSelector({ buildings, selectedBuildingId, onBuildingSelect }: Props) {
  const t = useTranslations("explore");
  
  if (buildings.length <= 1) {
    return null; // Don't show selector for single building
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-600 mb-3">{t("selectBuilding")}</h3>
      <div className="flex flex-wrap gap-3">
        {buildings.map((building) => {
          const isSelected = building.id === selectedBuildingId;
          const totalUnits = building.floors.reduce((sum, f) => sum + f.units.length, 0);
          const availableUnits = building.floors.reduce(
            (sum, f) => sum + f.units.filter((u) => u.status === "available").length,
            0
          );

          return (
            <button
              key={building.id}
              onClick={() => onBuildingSelect(building)}
              className={`flex-1 min-w-[140px] max-w-[200px] p-4 rounded-xl border-2 transition text-left ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏢</span>
                <span className="font-semibold text-slate-800">{building.name}</span>
              </div>
              <div className="text-sm text-slate-500">
                <p>{building.floors.length} {t("floors")}</p>
                <p className="text-emerald-600 font-medium">
                  {availableUnits}/{totalUnits} {t("available")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
