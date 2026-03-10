"use client";

import posthog from "posthog-js";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getCardImageUrl, getFullImageUrl } from "@/lib/cloudinary";
import { CircleCheck } from "lucide-react";
import Image from "next/image";

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
    building: { name: string };
  };
}

interface Props {
  unit: Unit;
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

export default function ApartmentDetailModal({ unit, onClose }: Props) {
  const t = useTranslations("unit");
  const tc = useTranslations("contact");
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const photos = [unit.sketchImage, unit.sketchImage2, unit.sketchImage3, unit.sketchImage4].filter(Boolean) as string[];

  useEffect(() => {
    posthog.capture("Viewed Apartment", {
      block: unit.floor.building.name,
      apartment_number: unit.unitNumber,
      floor: unit.floor.number,
      square_meters: unit.area,
      rooms: unit.rooms,
      source: "List View"
    });
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
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          projectName: `${unit.floor.building.name} - ${t("floor")} ${unit.floor.number}`,
          source: "kvartiralar",
        }),
      });

      posthog.capture("Contacted Sales", {
        block: unit.floor.building.name,
        apartment_number: unit.unitNumber,
        floor: unit.floor.number,
        square_meters: unit.area,
        rooms: unit.rooms,
        source: "List View"
      });

      setSubmitted(true);
    } catch {
      alert(tc("error"));
    } finally {
      setSubmitting(false);
    }
  };

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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-end sm:items-center justify-center transition-opacity duration-300"
        onClick={onClose}
      >
        <div
          className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-[0_20px_50px_rgba(8,112,184,0.1)] border border-white/50 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Sticky header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-100/50 sticky top-0 bg-white/90 backdrop-blur-md z-10">
            <div>
              <h2 className="font-bold text-xl text-slate-900 tracking-tight">№{unit.unitNumber}</h2>
              <p className="text-xs text-slate-500">
                {unit.floor.building.name} · {t("floor")} {unit.floor.number} · {unit.rooms} {t("rooms")} · {unit.area} m²
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 -mr-1 text-lg">✕</button>
          </div>

          <div className="px-4 py-3 space-y-3">


            {/* Photos */}
            {photos.length > 0 && (
              <div className={`grid gap-1.5 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {photos.slice(0, 4).map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(photo)}
                    className="relative aspect-[4/3] bg-slate-50 rounded-lg overflow-hidden hover:opacity-90 active:scale-95 transition group"
                  >
                    <Image
                      src={getCardImageUrl(photo)}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-contain p-1"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 outline-none text-sm"
                      placeholder={tc("name")}
                      autoComplete="name"
                    />
                    <input
                      type="tel" inputMode="tel" required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 outline-none text-sm"
                      placeholder={tc("phone")}
                      autoComplete="tel"
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
