"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ApartmentCard from "./ApartmentCard";
import ApartmentDetailModal from "./ApartmentDetailModal";
import ScrollReveal from "./ScrollReveal";

interface Unit {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  sketchImage:  string | null;
  sketchImage2: string | null;
  sketchImage3: string | null;
  sketchImage4: string | null;
  floor: {
    number: number;
    basePricePerM2: number | null;
    building: {
      name: string;
    };
  };
}

interface Props {
  units: Unit[];
}

export default function FeaturedApartments({ units }: Props) {
  const t = useTranslations("apartments");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Get one apartment from each room category for variety
  const getFeaturedUnits = () => {
    const available = units.filter((u) => u.status === "available");
    if (available.length === 0) return [];

    // Group by room count
    const byRooms = new Map<number, Unit[]>();
    available.forEach((unit) => {
      const existing = byRooms.get(unit.rooms) || [];
      byRooms.set(unit.rooms, [...existing, unit]);
    });

    // Get unique room counts sorted (1, 2, 3, 4...)
    const roomCounts = Array.from(byRooms.keys()).sort((a, b) => a - b);

    // Pick one from each category, up to 4 total
    const featured: Unit[] = [];
    for (const rooms of roomCounts) {
      if (featured.length >= 4) break;
      const unitsWithRooms = byRooms.get(rooms)!;
      // Pick the first one from this category (deterministic to avoid hydration mismatch)
      featured.push(unitsWithRooms[0]);
    }

    // If less than 4, fill with remaining available units
    if (featured.length < 4) {
      const usedIds = new Set(featured.map((u) => u.id));
      for (const unit of available) {
        if (featured.length >= 4) break;
        if (!usedIds.has(unit.id)) {
          featured.push(unit);
          usedIds.add(unit.id);
        }
      }
    }

    return featured;
  };

  const featuredUnits = getFeaturedUnits();

  if (featuredUnits.length === 0) return null;

  return (
    <section className="py-16 bg-[#F7F8FA]">
      <div className="max-w-6xl mx-auto px-4">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-navy-900">{t("featuredApartments")}</h2>
            <Link
              href="/kvartiralar"
              className="text-gold-600 hover:text-gold-700 text-sm font-medium"
            >
              {t("viewMore")} →
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredUnits.map((unit, index) => (
            <ScrollReveal key={unit.id} delay={index * 100}>
              <ApartmentCard
                unit={unit}
                onClick={() => setSelectedUnit(unit)}
              />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={200}>
          <div className="mt-8 flex justify-center">
            <Link
              href="/kvartiralar"
              className="inline-block bg-navy-900 text-white px-8 py-3 rounded-btn font-medium hover:bg-navy-800 transition"
            >
              {t("viewMore")} ({units.filter((u) => u.status === "available").length})
            </Link>
          </div>
        </ScrollReveal>
      </div>

      {selectedUnit && (
        <ApartmentDetailModal
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </section>
  );
}
