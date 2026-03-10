"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getStatusColor, formatPrice, calculateUnitPrice } from "@/lib/utils";

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
  basePricePerM2,
  floorNumber,
  onUnitClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Auto-construct display number: if unitNumber is short (1-2 digits), prefix with floor number
  const getDisplayNumber = (unitNumber: string) => {
    if (floorNumber && /^\d{1,2}$/.test(unitNumber)) {
      return `${floorNumber}${unitNumber.padStart(2, "0")}`;
    }
    return unitNumber;
  };

  // Get container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Convert percentage to pixel
  const toPixel = useCallback(
    (percent: number, total: number) => (percent / 100) * total,
    []
  );

  // Parse polygon data
  const parsePolygon = (polygonData: Point[] | null): Point[] => {
    if (!polygonData || !Array.isArray(polygonData)) return [];
    return polygonData;
  };

  // Get polygon path string
  const getPathString = (points: Point[]) => {
    if (points.length < 3) return "";
    return (
      points
        .map((p, i) => {
          const x = toPixel(p.x, dimensions.width);
          const y = toPixel(p.y, dimensions.height);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ") + " Z"
    );
  };

  // Get center of polygon for label
  const getPolygonCenter = (points: Point[]) => {
    if (points.length === 0) return { x: 0, y: 0 };
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    return {
      x: toPixel(sumX / points.length, dimensions.width),
      y: toPixel(sumY / points.length, dimensions.height),
    };
  };

  // Get fill color based on status
  const getFillColor = (status: string, isHovered: boolean) => {
    const baseColor = getStatusColor(status);
    if (isHovered) {
      return baseColor.replace("0.5", "0.7").replace("0.4", "0.6");
    }
    return baseColor.replace("#", "rgba(").replace(/(..)(..)(..)/, (_, r, g, b) => {
      return `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`;
    });
  };

  // Get status fill colors — premium palette
  const getStatusFill = (status: string, isHovered: boolean) => {
    const opacity = isHovered ? 0.72 : 0.48;
    const soldOpacity = isHovered ? 0.42 : 0.28;

    switch (status) {
      case "available":
        return `rgba(20, 184, 166, ${opacity})`; // teal-500 — premium, calm
      case "reserved":
        return `rgba(245, 158, 11, ${opacity})`; // amber-500 — warm, not alarming
      case "sold":
        return `rgba(100, 116, 139, ${soldOpacity})`; // slate-500 — neutral gray, sold = done
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
      <div
        ref={containerRef}
        className="relative w-[70%] sm:w-[50%] mx-auto aspect-[4/3] bg-slate-100"
      >
        {/* Background image */}
        {floorPlanImage && (
          <img
            src={floorPlanImage}
            alt="Floor plan"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        )}

        {/* SVG overlay for polygons */}
        {dimensions.width > 0 && (
          <svg className="absolute inset-0 w-full h-full">
            {polygonUnits.map((unit) => {
              const points = parsePolygon(unit.polygonData);
              if (points.length < 3) return null;

              const isHovered = hoveredId === unit.id;
              const center = getPolygonCenter(points);

              return (
                <g key={unit.id}>
                  {/* Polygon */}
                  <path
                    d={getPathString(points)}
                    fill={getStatusFill(unit.status, isHovered)}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 3 : 2}
                    style={{ transition: "fill 0.18s ease, stroke-width 0.15s ease" }}
                    className="cursor-pointer"
                    onClick={() => onUnitClick(unit)}
                    onMouseEnter={() => setHoveredId(unit.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />

                  {/* Unit number only — minimalistic */}
                  <text
                    x={center.x}
                    y={center.y + 4}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill={isHovered ? "#ffffff" : "#1e293b"}
                    className="pointer-events-none"
                    style={{ textShadow: "0 1px 2px rgba(255,255,255,0.6)" }}
                  >
                    {getDisplayNumber(unit.unitNumber)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

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
