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
  polygonData: string | null;
  labelX: number | null;
  labelY: number | null;
  sketchImage:  string | null;
  sketchImage2: string | null;
  sketchImage3: string | null;
  sketchImage4: string | null;
}

interface Props {
  units: UnitData[];
  floorPlanImage: string | null;
  basePricePerM2: number | null;
  onUnitClick: (unit: UnitData) => void;
}

export default function FloorPlanPolygon({
  units,
  floorPlanImage,
  basePricePerM2,
  onUnitClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
  const parsePolygon = (polygonData: string | null): Point[] => {
    if (!polygonData) return [];
    try {
      return JSON.parse(polygonData);
    } catch {
      return [];
    }
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

  // Get status fill colors
  const getStatusFill = (status: string, isHovered: boolean) => {
    const opacity = isHovered ? 0.7 : 0.5;
    const soldOpacity = isHovered ? 0.5 : 0.35;
    
    switch (status) {
      case "available":
        return `rgba(34, 197, 94, ${opacity})`; // green
      case "reserved":
        return `rgba(234, 179, 8, ${opacity})`; // yellow
      case "sold":
        return `rgba(239, 68, 68, ${soldOpacity})`; // red
      default:
        return `rgba(100, 116, 139, ${opacity})`; // slate
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
        className="relative w-3/4 mx-auto aspect-[4/3] bg-slate-100"
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
              const price = calculateUnitPrice(
                unit.area,
                unit.pricePerM2,
                basePricePerM2,
                unit.totalPrice
              );

              return (
                <g key={unit.id}>
                  {/* Polygon */}
                  <path
                    d={getPathString(points)}
                    fill={getStatusFill(unit.status, isHovered)}
                    stroke={isHovered ? "#1e293b" : "#475569"}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="cursor-pointer transition-all duration-150"
                    onClick={() => onUnitClick(unit)}
                    onMouseEnter={() => setHoveredId(unit.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />

                  {/* Labels - smaller text */}
                  <text
                    x={center.x}
                    y={center.y - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#1e293b"
                    className="pointer-events-none"
                  >
                    {unit.unitNumber}
                  </text>
                  <text
                    x={center.x}
                    y={center.y + 6}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#475569"
                    className="pointer-events-none"
                  >
                    {unit.rooms}R · {unit.area}m²
                  </text>
                  {isHovered && (
                    <text
                      x={center.x}
                      y={center.y + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#1e293b"
                      className="pointer-events-none"
                    >
                      {formatPrice(price)}
                    </text>
                  )}
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
          <div className="w-4 h-4 rounded bg-green-500/50" />
          <span className="text-xs text-slate-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500/50" />
          <span className="text-xs text-slate-600">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/35" />
          <span className="text-xs text-slate-600">Sold</span>
        </div>
      </div>
    </div>
  );
}
