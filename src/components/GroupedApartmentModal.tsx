"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getCardImageUrl, getFullImageUrl } from "@/lib/cloudinary";
import { CircleCheck } from "lucide-react";
import Image from "next/image";
import type { GroupedUnit } from "./GroupedApartmentCard";

interface Props {
    group: GroupedUnit;
    onClose: () => void;
}

export default function GroupedApartmentModal({ group, onClose }: Props) {
    const t = useTranslations("unit");
    const ta = useTranslations("apartments");
    const tc = useTranslations("contact");

    const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: "", phone: "" });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);

    // Only show available units, sorted by floor
    const availableUnits = [...group.units]
        .filter(u => u.status === "available")
        .sort((a, b) => a.floor.number - b.floor.number);

    // Photos from the first available unit for preview
    const previewUnit = availableUnits[0];
    const photos = previewUnit
        ? [previewUnit.sketchImage, previewUnit.sketchImage2, previewUnit.sketchImage3, previewUnit.sketchImage4].filter(Boolean) as string[]
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Use selected unit or first available
        const targetUnit = selectedFloorNumber
            ? availableUnits.find(u => u.floor.number === selectedFloorNumber) || availableUnits[0]
            : availableUnits[0];
        if (!targetUnit) return;

        setSubmitting(true);
        try {
            await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    phone: formData.phone,
                    unitId: targetUnit.id,
                    unitNumber: targetUnit.unitNumber,
                    projectName: `${targetUnit.floor.building.name} - ${group.rooms}-xonali, ${group.area} m²${selectedFloorNumber ? `, ${t("floor")} ${selectedFloorNumber}` : ""}`,
                    source: "kvartiralar",
                }),
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

            {/* Modal backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 flex items-end sm:items-center justify-center"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[92vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Drag handle (mobile) */}
                    <div className="flex justify-center pt-3 pb-1 sm:hidden">
                        <div className="w-10 h-1 bg-slate-200 rounded-full" />
                    </div>

                    {/* Sticky header */}
                    <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b sticky top-0 bg-white z-10">
                        <div>
                            <h2 className="font-bold text-lg text-slate-900">
                                {group.rooms}-{t("rooms")?.toLowerCase()}, {group.area} m²
                            </h2>
                            <p className="text-xs text-slate-500">
                                {group.buildingName} · {ta("floorsAvailable")}: {group.floorMin}–{group.floorMax}
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

                        {/* Floor picker (optional) */}
                        {availableUnits.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">
                                    {ta("selectFloor") || "Qavatni tanlang"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {availableUnits.map((unit) => (
                                        <button
                                            key={unit.id}
                                            onClick={() => setSelectedFloorNumber(
                                                selectedFloorNumber === unit.floor.number ? null : unit.floor.number
                                            )}
                                            className={`flex items-center justify-center w-11 h-11 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95 ${selectedFloorNumber === unit.floor.number
                                                    ? "bg-emerald-500 text-white shadow-md"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                }`}
                                        >
                                            {unit.floor.number}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Contact form — always visible */}
                        {submitted ? (
                            <div className="text-center py-6">
                                <CircleCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
                                <p className="font-semibold text-green-700 text-lg">{tc("thankYou")}</p>
                                <p className="text-sm text-green-600 mt-1">{tc("willContact")}</p>
                            </div>
                        ) : (
                            <>
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
                                        type="tel" required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 outline-none text-sm"
                                        placeholder={tc("phone")}
                                        autoComplete="tel"
                                    />
                                    <button
                                        type="submit" disabled={submitting}
                                        className="w-full py-3 bg-navy-900 text-white rounded-xl font-semibold hover:bg-navy-800 disabled:bg-navy-400 transition"
                                    >
                                        {submitting ? tc("sending") : tc("submit")}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
