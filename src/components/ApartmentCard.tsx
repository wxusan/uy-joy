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


export default function ApartmentCard({ unit, onClick }: Props) {
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
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-[0_16px_48px_rgba(0,0,0,0.10)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden text-left w-full"
    >
      {/* Image — full bleed, no padding */}
      <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
        {unit.sketchImage ? (
          <Image
            src={getCardImageUrl(unit.sketchImage)}
            alt={`№${displayNumber}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain group-hover:scale-[1.03] transition-transform duration-300 p-3"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-slate-300 font-medium">{unit.area} m²</span>
          </div>
        )}

        {/* Unit number — top left */}
        <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
          №{displayNumber}
        </span>
      </div>

      {/* Specs — compact, below image */}
      <div className="px-4 py-3 space-y-1.5">
        <InfoRow label={t("area") || "Maydon"} value={`${unit.area} m²`} />
        <InfoRow label={t("rooms") || "Xonalar"} value={`${unit.rooms} xona`} />
        <InfoRow label={t("floor") || "Qavat"} value={`${unit.floor.number}-qavat`} />
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-200 min-w-[12px] relative top-[-2px]" />
      <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{value}</span>
    </div>
  );
}
