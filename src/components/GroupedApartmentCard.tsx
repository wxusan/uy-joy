"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { getCardImageUrl } from "@/lib/cloudinary";

export interface GroupedUnit {
    key: string;
    rooms: number;
    area: number;
    unitNumber: string;
    sketchImage: string | null;
    units: {
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
    }[];
    availableCount: number;
    totalCount: number;
    floorMin: number;
    floorMax: number;
    buildingName: string;
}

interface Props {
    group: GroupedUnit;
    onClick: () => void;
}

export default function GroupedApartmentCard({ group, onClick }: Props) {
    const t = useTranslations("unit");
    const ta = useTranslations("apartments");

    // Auto-construct display number for label
    const getDisplayLabel = () => {
        return `${group.rooms}-${t("rooms")?.toLowerCase() || "xona"}, ${group.area} m²`;
    };

    return (
        <button
            onClick={onClick}
            className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-200 active:scale-[0.98] transition-all duration-200 overflow-hidden text-left w-full flex flex-col"
        >
            {/* Image */}
            <div className="relative bg-slate-50 p-4 pb-2">
                {group.sketchImage ? (
                    <div className="relative w-full aspect-square">
                        <Image
                            src={getCardImageUrl(group.sketchImage)}
                            alt={getDisplayLabel()}
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
                        <span className="text-xs text-slate-300">{group.area} m²</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="px-4 pb-3 pt-2 space-y-1.5 flex-1">
                <InfoRow label={t("rooms") || "Xonalar"} value={String(group.rooms)} />
                <InfoRow label={t("area") || "Maydon"} value={`${group.area} m²`} />
                <InfoRow
                    label={ta("floorsAvailable") || "Qavatlar"}
                    value={group.floorMin === group.floorMax ? String(group.floorMin) : `${group.floorMin}–${group.floorMax}`}
                />
            </div>

            {/* Bottom availability badge */}
            <div className="px-4 pb-4">
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-slate-500">
                        {group.totalCount} {ta("totalUnits") || "ta kvartira jami"}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${group.availableCount > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-600"
                        }`}>
                        {group.availableCount} {ta("available") || "mavjud"}
                    </span>
                </div>
            </div>
        </button>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-1">
            <span className="text-sm text-slate-500 whitespace-nowrap">{label}</span>
            <span className="flex-1 border-b border-dotted border-slate-300 min-w-[20px] relative top-[-3px]" />
            <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{value}</span>
        </div>
    );
}
