"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, Layers3, Ruler } from "lucide-react";
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
        displayNumber: string;
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
    minTotalPrice: number | null;
    minPricePerM2: number | null;
}

interface Props {
    group: GroupedUnit;
    onClick: () => void;
}

export default function GroupedApartmentCard({ group, onClick }: Props) {
    const t = useTranslations("unit");
    const ta = useTranslations("apartments");
    const formatPrice = (value: number | null) => {
        if (!value) return null;
        return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} UZS`;
    };

    // Auto-construct display number for label
    const getDisplayLabel = () => {
        return `${group.rooms} ${t("rooms").toLowerCase()}, ${group.area} m²`;
    };

    const price = formatPrice(group.minTotalPrice);
    const pricePerM2 = formatPrice(group.minPricePerM2);

    return (
        <button
            onClick={onClick}
            className="group relative flex w-full flex-col overflow-hidden rounded-[7px] border border-[#d8cabc] bg-[#fbf7ef] text-left shadow-[0_16px_45px_rgba(36,28,20,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#c66348]/70 hover:shadow-[0_24px_70px_rgba(36,28,20,0.14)]"
        >
            {/* Image */}
            <div className="relative border-b border-[#e0d1c2] bg-[#f7efe4] p-5">
                <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[#d8cabc] bg-[#fbf7ef]/90 px-3 py-1 text-[11px] font-semibold text-[#6f675e] backdrop-blur-md">
                    <Building2 className="h-3.5 w-3.5 text-[#c66348]" strokeWidth={1.7} />
                    {group.buildingName}
                </div>
                {group.sketchImage ? (
                    <div className="relative aspect-[4/3] w-full">
                        <Image
                            src={getCardImageUrl(group.sketchImage)}
                            alt={getDisplayLabel()}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.035]"
                        />
                    </div>
                ) : (
                    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-[#a89c90]">
                        <Ruler className="h-10 w-10" strokeWidth={1.4} />
                        <span className="text-[13px] font-semibold">{group.area} m²</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-display text-[34px] font-semibold leading-none text-[#15120f]">
                            {group.rooms} · {group.area} m²
                        </p>
                        <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#b75f43]">
                            {ta("availableCount", { count: group.availableCount })}
                        </p>
                    </div>
                    <span className={`mt-1 h-3 w-3 rounded-full ${group.availableCount > 0 ? "bg-[#7fb069]" : "bg-[#c66348]"}`} />
                </div>

                <div className="mt-5 space-y-2.5">
                    <InfoRow label={t("rooms")} value={String(group.rooms)} />
                    <InfoRow label={ta("floorsAvailable")} value={group.floorMin === group.floorMax ? String(group.floorMin) : `${group.floorMin}–${group.floorMax}`} />
                    <InfoRow label={ta("price")} value={price || ta("priceOnRequest")} />
                </div>

                <div className="mt-5 flex items-end justify-between gap-4 border-t border-[#e0d1c2] pt-4">
                    <div className="text-[12px] font-medium text-[#8d8174]">
                        <span className="inline-flex items-center gap-1.5">
                            <Layers3 className="h-3.5 w-3.5 text-[#c66348]" strokeWidth={1.7} />
                            {group.totalCount} {ta("totalUnits")}
                        </span>
                        {pricePerM2 ? (
                            <span className="mt-1 block">{pricePerM2} / m²</span>
                        ) : null}
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8cabc] text-[#c66348] transition-colors group-hover:border-[#c66348] group-hover:bg-[#c66348] group-hover:text-white">
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
                    </span>
                </div>
            </div>
        </button>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap text-[13px] font-medium text-[#8d8174]">{label}</span>
            <span className="relative top-[-3px] min-w-[20px] flex-1 border-b border-dotted border-[#d7c8b8]" />
            <span className="whitespace-nowrap text-[13px] font-semibold text-[#15120f]">{value}</span>
        </div>
    );
}
