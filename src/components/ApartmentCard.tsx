"use client";

import { formatPrice } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Unit {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  sketchImage: string | null;
  floor: {
    number: number;
    basePricePerM2: number | null;
    building: {
      name: string;
    };
  };
}

interface Props {
  unit: Unit;
  onClick: () => void;
}

export default function ApartmentCard({ unit, onClick }: Props) {
  const t = useTranslations("unit");

  const pricePerM2 = unit.pricePerM2 || unit.floor.basePricePerM2 || 0;
  const totalPrice = unit.totalPrice || pricePerM2 * unit.area;

  const statusStyle = {
    available: "bg-emerald-500 text-white",
    reserved:  "bg-yellow-400 text-yellow-900",
    sold:      "bg-red-500 text-white",
  };
  const statusLabel = {
    available: t("available"),
    reserved:  t("reserved"),
    sold:      t("sold"),
  };

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 active:scale-[0.98] transition-all duration-200 overflow-hidden text-left w-full"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        {unit.sketchImage ? (
          <img
            src={unit.sketchImage}
            alt={`№${unit.unitNumber}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-50 to-slate-100">
            <span className="text-3xl">🏠</span>
            <span className="text-xs text-slate-400 font-medium">{unit.area} m²</span>
          </div>
        )}

        {/* Rooms pill — top left */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium">
          🛏 {unit.rooms}
        </div>

        {/* Status pill — top right */}
        <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold ${statusStyle[unit.status as keyof typeof statusStyle]}`}>
          {statusLabel[unit.status as keyof typeof statusLabel]}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
            №{unit.unitNumber}
          </span>
          <span className="text-xs text-slate-400">{unit.area} m²</span>
        </div>
        <p className="text-xs text-slate-400 mb-2">
          {unit.floor.building.name} · {unit.floor.number}-{t("floor").toLowerCase()}
        </p>
        <p className="font-bold text-emerald-600 text-sm leading-tight">
          {formatPrice(totalPrice)}
        </p>
      </div>
    </button>
  );
}
