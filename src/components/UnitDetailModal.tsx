"use client";

import posthog from "posthog-js";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { calculateUnitPrice } from "@/lib/utils";
import { getCardImageUrl, getFullImageUrl } from "@/lib/cloudinary";
import Image from "next/image";
import { Bed, Ruler, Building2, CircleCheck } from "lucide-react";

interface UnitData {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  floorNumber: number;
  basePricePerM2: number | null;
  sketchImage?: string | null;
  sketchImage2?: string | null;
  sketchImage3?: string | null;
  sketchImage4?: string | null;
  buildingName?: string;
}

interface Props {
  unit: UnitData | null;
  onClose: () => void;
}

const statusChip = (status: string) => {
  switch (status) {
    case "available": return "bg-emerald-100 text-emerald-700";
    case "reserved": return "bg-yellow-100 text-yellow-700";
    case "sold": return "bg-red-100 text-red-700";
    default: return "bg-slate-100 text-slate-600";
  }
};

export default function UnitDetailModal({ unit, onClose }: Props) {
  const t = useTranslations("unit");

  // Auto-construct display number: if unitNumber is short (1-2 digits), prefix with floor number
  const getDisplayNumber = (unitNumber: string, floorNumber?: number) => {
    if (floorNumber && /^\d{1,2}$/.test(unitNumber)) {
      return `${floorNumber}${unitNumber.padStart(2, "0")}`;
    }
    return unitNumber;
  };
  const tc = useTranslations("contact");
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      posthog.capture("Viewed Apartment", {
        block: unit.buildingName || "Unknown",
        apartment_number: getDisplayNumber(unit.unitNumber, unit.floorNumber),
        floor: unit.floorNumber,
        square_meters: unit.area,
        rooms: unit.rooms,
        source: "3D Visualizer"
      });
    }
  }, [unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          unitId: unit?.id,
          unitNumber: unit ? getDisplayNumber(unit.unitNumber, unit.floorNumber) : undefined,
          projectName: unit?.buildingName
            ? `${unit.buildingName} - ${t("floor")} ${unit?.floorNumber}`
            : `${t("floor")} ${unit?.floorNumber}`,
          source: "vizual",
        }),
      });

      if (unit) {
        posthog.capture("Contacted Sales", {
          block: unit.buildingName || "Unknown",
          apartment_number: getDisplayNumber(unit.unitNumber, unit.floorNumber),
          floor: unit.floorNumber,
          square_meters: unit.area,
          rooms: unit.rooms,
          source: "3D Visualizer"
        });
      }

      setSubmitted(true);
    } catch {
      alert(tc("error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!unit) return null;

  const photos = [unit.sketchImage, unit.sketchImage2, unit.sketchImage3, unit.sketchImage4].filter(Boolean) as string[];

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full text-xl transition"
          >
            ✕
          </button>
          <Image
            src={getFullImageUrl(lightbox)}
            alt=""
            width={1200}
            height={800}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onClose}
      >
        <div
          className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-[0_20px_50px_rgba(8,112,184,0.1)] border border-white/50 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-slate-100/50 sticky top-0 bg-white/90 backdrop-blur-md z-10">
            <div>
              <h2 className="font-bold text-xl text-slate-900 tracking-tight">№{getDisplayNumber(unit.unitNumber, unit.floorNumber)}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{t("floor")} {unit.floorNumber}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 -mr-1 text-xl">✕</button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Feature chips */}
            <div className="flex flex-wrap gap-2">
              <span className="bg-slate-100 px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" /> {unit.rooms} {t("rooms")}
              </span>
              <span className="bg-slate-100 px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5" /> {unit.area} m²
              </span>
              <span className="bg-slate-100 px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {unit.floorNumber}-{t("floor").toLowerCase()}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusChip(unit.status)}`}>
                {t(unit.status as "available" | "reserved" | "sold")}
              </span>
            </div>


            {/* Photos */}
            {photos.length > 0 && (
              <div className={`grid gap-2 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {photos.slice(0, 4).map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(photo)}
                    className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden hover:opacity-90 active:scale-95 transition group"
                  >
                    <Image
                      src={getCardImageUrl(photo)}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-contain p-2"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                      <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Status-based content */}
            {unit.status === "available" ? (
              submitted ? (
                <div className="text-center py-6">
                  <CircleCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-green-700 text-lg">{tc("thankYou")}</p>
                  <p className="text-sm text-green-600 mt-1">{tc("willContact")}</p>
                </div>
              ) : (
                <>
                  {/* Ko'proq bilish divider */}
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-sm font-semibold text-navy-900 whitespace-nowrap">{t("learnMore")}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="text" required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={tc("name")}
                      autoComplete="name"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <input
                      type="tel" required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={tc("phone")}
                      autoComplete="tel"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <button
                      type="submit" disabled={submitting}
                      className="bg-shine w-full py-3 bg-navy-900 text-white rounded-xl font-semibold hover:bg-navy-800 disabled:bg-navy-400 transition"
                    >
                      {submitting ? tc("sending") : tc("submit")}
                    </button>
                  </form>
                </>
              )
            ) : unit.status === "reserved" ? (
              <p className="text-center text-yellow-700 bg-yellow-50 py-3 rounded-xl text-sm font-medium">
                {t("reservedStatus")}
              </p>
            ) : (
              <p className="text-center text-red-700 bg-red-50 py-3 rounded-xl text-sm font-medium">
                {t("soldStatus")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
