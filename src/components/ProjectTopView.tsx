"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Building2 } from "lucide-react";

type Point = { x: number; y: number };

interface Building {
  id: string;
  name: string;
  positionData: string | null;
  floors: { units: { status: string }[] }[];
}

interface Props {
  topViewImage: string | null;
  buildings: Building[];
  onBuildingSelect: (buildingId: string) => void;
}

export default function ProjectTopView({ topViewImage, buildings, onBuildingSelect }: Props) {
  const t = useTranslations("explore");
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  // Parse position data - supports both polygon array and old rect format
  const getBuildingPolygon = (building: Building): Point[] | null => {
    if (!building.positionData) return null;
    try {
      const data = JSON.parse(building.positionData);
      if (Array.isArray(data)) return data;
      // Old rect format - convert to polygon
      if (data.x !== undefined) {
        return [
          { x: data.x, y: data.y },
          { x: data.x + data.width, y: data.y },
          { x: data.x + data.width, y: data.y + data.height },
          { x: data.x, y: data.y + data.height },
        ];
      }
      return null;
    } catch {
      return null;
    }
  };

  // Calculate building stats
  const getBuildingStats = (building: Building) => {
    const allUnits = building.floors.flatMap(f => f.units);
    const available = allUnits.filter(u => u.status === "available").length;
    const total = allUnits.length;
    return { available, total, floors: building.floors.length };
  };

  const toSvgPath = (points: Point[]) => {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  };

  const getCenter = (points: Point[]) => {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  };

  // If no top view image, show placeholder with building cards
  if (!topViewImage) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-700 mb-4 text-center">{t("selectBuilding")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {buildings.map((building) => {
            const stats = getBuildingStats(building);
            return (
              <button
                key={building.id}
                onClick={() => onBuildingSelect(building.id)}
                className="p-4 border-2 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition text-left group"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition">
                  <Building2 className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                </div>
                <h4 className="font-semibold">{building.name}</h4>
                <p className="text-sm text-slate-500">{stats.floors} {t("floors")}</p>
                <p className="text-sm text-emerald-600">
                  {stats.available}/{stats.total} {t("available")}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Calculate label positions for each building (offset from building center)
  const getLabelPosition = (center: Point, index: number, total: number) => {
    // Position labels above/to the side of buildings
    const labelY = Math.max(2, center.y - 15);
    // Spread labels horizontally to avoid overlap
    const spacing = 100 / (total + 1);
    const labelX = spacing * (index + 1);
    return { x: labelX, y: labelY };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
      <h3 className="font-semibold text-slate-700 mb-4 text-center">{t("selectBuilding")}</h3>

      {/* Aerial view container - full on mobile, 75% on desktop */}
      <div className="relative w-full sm:w-3/4 mx-auto aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden">
        <Image
          src={topViewImage}
          alt="Project aerial view"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 800px"
        />

        {/* SVG overlay for polygon building areas + labels with arrows */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {buildings.map((building, index) => {
            const polygon = getBuildingPolygon(building);
            if (!polygon || polygon.length < 3) return null;

            const stats = getBuildingStats(building);
            const isHovered = hoveredBuilding === building.id;
            const center = getCenter(polygon);
            const labelPos = getLabelPosition(center, index, buildings.length);

            return (
              <g key={building.id}>
                {/* Building polygon */}
                <path
                  d={toSvgPath(polygon)}
                  fill={isHovered ? "rgba(16, 185, 129, 0.35)" : "transparent"}
                  stroke={isHovered ? "rgba(16, 185, 129, 0.8)" : "transparent"}
                  strokeWidth={isHovered ? 0.4 : 0}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredBuilding(building.id)}
                  onMouseLeave={() => setHoveredBuilding(null)}
                  onClick={() => onBuildingSelect(building.id)}
                />

                {/* Connector line from label to building center */}
                <line
                  x1={labelPos.x}
                  y1={labelPos.y + 3.5}
                  x2={center.x}
                  y2={center.y}
                  stroke={isHovered ? "#059669" : "#10b981"}
                  strokeWidth={isHovered ? 0.45 : 0.3}
                  strokeLinecap="round"
                  className="pointer-events-none transition-all duration-200"
                />

                {/* Label box — sharp rectangle */}
                <foreignObject
                  x={labelPos.x - 14}
                  y={labelPos.y - 3.5}
                  width="28"
                  height="7"
                  className="overflow-visible cursor-pointer"
                  onClick={() => onBuildingSelect(building.id)}
                  onMouseEnter={() => setHoveredBuilding(building.id)}
                  onMouseLeave={() => setHoveredBuilding(null)}
                >
                  <div
                    className={`label-mild-pulse px-1 py-0.5 text-center whitespace-nowrap transition-all duration-300 ${isHovered
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "bg-emerald-600 text-white"
                      }`}
                    style={{
                      fontSize: "2.2px",
                      lineHeight: 1.4,
                      border: isHovered ? "0.3px solid #059669" : "0.3px solid transparent",
                    }}
                  >
                    <p className="font-semibold">{building.name}</p>
                    <p style={{ fontSize: "1.8px" }} className={isHovered ? "text-emerald-500" : "text-emerald-100"}>{stats.available}/{stats.total}</p>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Building legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {buildings.map((building) => {
          const stats = getBuildingStats(building);
          return (
            <button
              key={building.id}
              onClick={() => onBuildingSelect(building.id)}
              onMouseEnter={() => setHoveredBuilding(building.id)}
              onMouseLeave={() => setHoveredBuilding(null)}
              className={`px-3 py-1.5 rounded-full text-sm transition flex items-center gap-1.5 ${hoveredBuilding === building.id
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 hover:bg-emerald-50"
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {building.name} ({stats.available}/{stats.total})
            </button>
          );
        })}
      </div>
    </div>
  );
}
