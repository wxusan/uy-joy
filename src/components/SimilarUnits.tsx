"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getThumbnailUrl } from "@/lib/cloudinary";
import type { LeadModalUnit } from "@/components/ApartmentLeadModal";

type Props = {
  currentUnit: LeadModalUnit;
  units: LeadModalUnit[];
  onSelect: (unit: LeadModalUnit) => void;
};

const getUnitPrice = (unit: LeadModalUnit) => {
  if (unit.totalPrice) return unit.totalPrice;
  const pricePerM2 = unit.pricePerM2 ?? unit.basePricePerM2 ?? null;
  return pricePerM2 ? Math.round(pricePerM2 * unit.area) : null;
};

const getPlanImage = (unit: LeadModalUnit) =>
  unit.sketchImage || unit.sketchImage2 || unit.sketchImage3 || unit.sketchImage4;

export default function SimilarUnits({ currentUnit, units, onSelect }: Props) {
  const ta = useTranslations("apartments");
  const t = useTranslations("explore");

  const formatPrice = (value: number | null | undefined) => {
    if (!value) return ta("priceOnRequest");
    return `${Math.round(value).toLocaleString("ru-RU")} so'm`;
  };

  const similarUnits = units
    .filter((unit) => {
      if (unit.id === currentUnit.id) return false;
      if (unit.status !== "available") return false;
      if (unit.rooms !== currentUnit.rooms) return false;
      return Math.abs(unit.area - currentUnit.area) <= 5;
    })
    .slice(0, 4);

  if (similarUnits.length === 0) return null;

  return (
    <section className="mt-5">
      <h3 className="text-[13px] font-semibold text-[#fff4e8]">{ta("similarPlans")}</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {similarUnits.map((unit) => {
          const image = getPlanImage(unit);
          const displayNumber = unit.displayNumber;

          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => onSelect(unit)}
              className="grid w-[210px] shrink-0 grid-cols-[74px_minmax(0,1fr)] gap-3 rounded-[6px] border border-[#f0d7be]/10 bg-white/[0.035] p-3 text-left transition hover:border-[#c66348]/70 hover:bg-[#c66348]/10"
            >
              <span className="relative aspect-square overflow-hidden rounded-[5px] bg-[#efeae0]">
                {image ? (
                  <Image
                    src={getThumbnailUrl(image, 96)}
                    alt={`Apartment ${displayNumber}`}
                    fill
                    sizes="96px"
                    className="object-contain p-1.5"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-[#6f6256]">
                    {unit.area} m²
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[25px] font-semibold leading-none text-[#fff4e8]">
                  {displayNumber}
                </span>
                <span className="mt-2 block text-[12px] font-medium text-[#b8aa9a]">
                  {unit.area} m² · {unit.rooms} {t("room")}
                </span>
                <span className="mt-2 flex items-center justify-between gap-2 text-[12px] font-semibold text-[#f0a383]">
                  {formatPrice(getUnitPrice(unit))}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
