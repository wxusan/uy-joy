"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { FloorWithUnits } from "@/types";

interface Props {
  floors: FloorWithUnits[];
  selectedFloorId: string | null;
  onFloorSelect: (floor: FloorWithUnits) => void;
}

export default function FloorSelector({ floors, selectedFloorId, onFloorSelect }: Props) {
  const t = useTranslations("floorSelector");
  // Show floors top to bottom (highest first)
  const sorted = [...floors].sort((a, b) => b.number - a.number);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b">
        <h3 className="font-semibold text-slate-700 text-sm">{t("selectFloor")}</h3>
      </div>
      <div className="divide-y">
        {sorted.map((floor) => {
          const total = floor.units.length;
          const available = floor.units.filter((u) => u.status === "available").length;
          const reserved = floor.units.filter((u) => u.status === "reserved").length;
          const sold = floor.units.filter((u) => u.status === "sold").length;
          const isSelected = floor.id === selectedFloorId;

          return (
            <button
              key={floor.id}
              onClick={() => onFloorSelect(floor)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                isSelected ? "bg-emerald-50 border-l-4 border-emerald-500" : ""
              }`}
            >
              <div className="text-lg font-bold text-slate-700 w-8 text-center">{floor.number}</div>

              {/* Availability bar */}
              <div className="flex-1">
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(available / total) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-400 transition-all"
                    style={{ width: `${(reserved / total) * 100}%` }}
                  />
                  <div
                    className="bg-red-400 transition-all"
                    style={{ width: `${(sold / total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500">
                    {available}/{total} {t("available")}
                  </span>
                  <span className="text-xs text-slate-400">
                    ~{formatPrice(floor.basePricePerM2 || 0)}/m&sup2;
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
