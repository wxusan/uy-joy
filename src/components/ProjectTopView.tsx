"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

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
    if (points.length < 3) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  };

  const getCenter = (points: Point[]) => ({
    x: points.reduce((a, p) => a + p.x, 0) / points.length,
    y: points.reduce((a, p) => a + p.y, 0) / points.length,
  });

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
                className="p-4 border-2 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition text-left"
              >
                <div className="text-4xl mb-2">🏢</div>
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

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="font-semibold text-slate-700 mb-4 text-center">{t("selectBuilding")}</h3>
      
      {/* Aerial view container - 75% size */}
      <div className="relative w-3/4 mx-auto aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden">
        <Image
          src={topViewImage}
          alt="Project aerial view"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 800px"
        />
        
        {/* SVG overlay for polygon building areas */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {buildings.map((building) => {
            const polygon = getBuildingPolygon(building);
            if (!polygon || polygon.length < 3) return null;
            
            const stats = getBuildingStats(building);
            const isHovered = hoveredBuilding === building.id;
            const center = getCenter(polygon);
            
            return (
              <g key={building.id}>
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
                {/* Tooltip on hover - smaller text */}
                {isHovered && (
                  <foreignObject
                    x={center.x - 12}
                    y={center.y - 6}
                    width="24"
                    height="12"
                    className="pointer-events-none overflow-visible"
                  >
                    <div className="bg-slate-900/90 text-white px-1 py-0.5 rounded text-center" style={{ fontSize: '2px' }}>
                      <p className="font-medium whitespace-nowrap">{building.name}</p>
                      <p className="text-emerald-400 whitespace-nowrap" style={{ fontSize: '1.8px' }}>{stats.available}/{stats.total}</p>
                    </div>
                  </foreignObject>
                )}
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
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                hoveredBuilding === building.id
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 hover:bg-emerald-50"
              }`}
            >
              {building.name} ({stats.available}/{stats.total})
            </button>
          );
        })}
      </div>
    </div>
  );
}
