"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { getCardImageUrl } from "@/lib/cloudinary";

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
  projectName?: string;
  expectedYear?: number | null;
  onClick: () => void;
}

export default function ApartmentCard({ unit, projectName, expectedYear, onClick }: Props) {
  const t = useTranslations("unit");

  // Auto-construct display number
  const getDisplayNumber = (unitNumber: string, floorNumber: number) => {
    if (/^\d{1,2}$/.test(unitNumber)) {
      return `${floorNumber}${unitNumber.padStart(2, "0")}`;
    }
    return unitNumber;
  };

  const displayNumber = getDisplayNumber(unit.unitNumber, unit.floor.number);

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-200 active:scale-[0.98] transition-all duration-200 overflow-hidden text-left w-full"
    >
      {/* Image — full visible, not cropped */}
      <div className="relative bg-slate-50 p-4 pb-2">
        {unit.sketchImage ? (
          <div className="relative w-full aspect-square">
            <Image
              src={getCardImageUrl(unit.sketchImage)}
              alt={`№${displayNumber}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
            <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-slate-300">{unit.area} m²</span>
          </div>
        )}
      </div>

      {/* Info — dotted line rows */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        <InfoRow label={t("apartmentNumber") || "Kvartira raqami"} value={displayNumber} />
        <InfoRow label={t("area") || "Maydon"} value={`${unit.area} m²`} />
        <InfoRow label={t("rooms") || "Xonalar"} value={String(unit.rooms)} />
        <InfoRow label={t("floor") || "Qavat"} value={String(unit.floor.number)} />
      </div>
    </button>
  );
}

/** Single info row with dotted separator */
function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-sm text-slate-500 whitespace-nowrap">{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-300 min-w-[20px] relative top-[-3px]" />
      <span className={`text-sm whitespace-nowrap ${bold ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}
