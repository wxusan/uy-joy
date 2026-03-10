"use client";

import { useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface UnitData {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  polygonData: Point[] | null;
  labelX: number | null;
  labelY: number | null;
  sketchImage: string | null;
  sketchImage2: string | null;
  sketchImage3: string | null;
  sketchImage4: string | null;
}

interface Props {
  units: UnitData[];
  floorPlanImage: string | null;
  basePricePerM2: number | null;
  floorNumber?: number;
  onUnitClick: (unit: UnitData) => void;
}

export default function FloorPlanPolygon({
  units,
  floorPlanImage,
  floorNumber,
  onUnitClick,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Auto-construct display number: if unitNumber is short (1-2 digits), prefix with floor number
  const getDisplayNumber = (unitNumber: string) => {
    if (floorNumber && /^\d{1,2}$/.test(unitNumber)) {
      return `${floorNumber}${unitNumber.padStart(2, "0")}`;
    }
    return unitNumber;
  };

  // Parse polygon data
  const parsePolygon = (polygonData: Point[] | null): Point[] => {
    if (!polygonData || !Array.isArray(polygonData)) return [];
    return polygonData;
  };

  // Get polygon path string — coordinates are 0-100 percentages, matching viewBox "0 0 100 100"
  const getPathString = (points: Point[]) => {
    if (points.length < 3) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  };

  // Get center of polygon for label
  const getPolygonCenter = (points: Point[]) => {
    if (points.length === 0) return { x: 50, y: 50 };
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
  };

  // Get status fill colors — premium palette
  const getStatusFill = (status: string, isHovered: boolean) => {
    const opacity = isHovered ? 0.72 : 0.48;
    const soldOpacity = isHovered ? 0.42 : 0.28;

    switch (status) {
      case "available":
        return `rgba(20, 184, 166, ${opacity})`; // teal-500
      case "reserved":
        return `rgba(245, 158, 11, ${opacity})`; // amber-500
      case "sold":
        return `rgba(100, 116, 139, ${soldOpacity})`; // slate-500
      default:
        return `rgba(100, 116, 139, ${opacity})`;
    }
  };

  // Units with valid polygon data
  const polygonUnits = units.filter((u) => u.polygonData);

  // If no image and no polygon units, show fallback grid
  if (!floorPlanImage && polygonUnits.length === 0) {
    return (
      <div className="bg-slate-100 rounded-xl p-8 text-center">
        <p className="text-slate-500">No floor plan available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="relative w-[70%] sm:w-[50%] mx-auto aspect-[4/3] bg-slate-100">
        {/* Background image */}
        {floorPlanImage && (
          <img
            src={floorPlanImage}
            alt="Floor plan"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        )}

        {/* SVG overlay — viewBox matches the admin PolygonEditor exactly (0 0 100 100, preserveAspectRatio="none") */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {polygonUnits.map((unit) => {
            const points = parsePolygon(unit.polygonData);
            if (points.length < 3) return null;

            const isHovered = hoveredId === unit.id;
            const center = getPolygonCenter(points);

            return (
              <g key={unit.id}>
                <path
                  d={getPathString(points)}
                  fill={getStatusFill(unit.status, isHovered)}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 0.6 : 0.4}
                  vectorEffect="non-scaling-stroke"
                  style={{ transition: "fill 0.18s ease", cursor: "pointer" }}
                  onClick={() => onUnitClick(unit)}
                  onMouseEnter={() => setHoveredId(unit.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />

                {/* Unit number label */}
                <text
                  x={center.x}
                  y={center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="3.5"
                  fontWeight="bold"
                  fill={isHovered ? "#ffffff" : "#1e293b"}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }}
                >
                  {getDisplayNumber(unit.unitNumber)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Message when no apartments have been drawn yet */}
        {polygonUnits.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-xl text-center">
              <p className="text-slate-600 text-sm">Xonadonlar hali belgilanmagan</p>
              <p className="text-slate-400 text-xs mt-1">Admin panelda xonadonlarni chizing</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 py-3 border-t bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-teal-500/50" />
          <span className="text-xs text-slate-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500/50" />
          <span className="text-xs text-slate-600">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-400/40" />
          <span className="text-xs text-slate-600">Sold</span>
        </div>
      </div>
    </div>
  );
}
