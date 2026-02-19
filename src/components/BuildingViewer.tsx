"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

type ViewType = "front" | "back" | "left" | "right";

interface Floor {
  id: string;
  number: number;
  positionData: string | null;
  basePricePerM2: number | null;
  units: { status: string }[];
}

interface Building {
  id: string;
  name: string;
  frontViewImage: string | null;
  backViewImage: string | null;
  leftViewImage: string | null;
  rightViewImage: string | null;
  floors: Floor[];
}

interface Props {
  building: Building;
  onFloorSelect: (floorId: string) => void;
  onBack: () => void;
}

export default function BuildingViewer({ building, onFloorSelect, onBack }: Props) {
  const t = useTranslations("explore");
  const [currentView, setCurrentView] = useState<ViewType>("front");
  const [hoveredFloor, setHoveredFloor] = useState<string | null>(null);

  const viewImages: Record<ViewType, string | null> = {
    front: building.frontViewImage,
    back: building.backViewImage,
    left: building.leftViewImage,
    right: building.rightViewImage,
  };

  const viewLabels: Record<ViewType, string> = {
    front: "Front",
    back: "Back",
    left: "Left",
    right: "Right",
  };

  const currentImage = viewImages[currentView];

  // Calculate floor stats
  const getFloorStats = (floor: Floor) => {
    const available = floor.units.filter(u => u.status === "available").length;
    const total = floor.units.length;
    return { available, total };
  };

  // Sort floors by number (highest first for display)
  const sortedFloors = [...building.floors].sort((a, b) => b.number - a.number);

  // Get floor positions - use stored data if available, otherwise auto-generate
  const getFloorPositions = () => {
    const totalFloors = building.floors.length;
    const floorHeight = 85 / totalFloors; // Leave space for roof and ground
    
    return sortedFloors.map((floor, index) => {
      // Try to use stored position data first
      if (floor.positionData) {
        try {
          const data = JSON.parse(floor.positionData);
          if (data.yStart !== undefined && data.yEnd !== undefined && data.yEnd > data.yStart) {
            return { floor, position: { yStart: data.yStart, yEnd: data.yEnd } };
          }
        } catch {
          // Invalid JSON, fall through to auto-generate
        }
      }
      
      // Auto-generate position if not stored
      const yStart = 10 + (index * floorHeight);
      const yEnd = yStart + floorHeight - 1;
      return { floor, position: { yStart, yEnd } };
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">{building.name}</h3>
          <p className="text-sm text-slate-500">{t("selectFloor")}</p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 transition"
        >
          ← {t("backToBuilding")}
        </button>
      </div>

      {/* View selector tabs - only show views with uploaded images */}
      {(() => {
        const availableViews = (Object.keys(viewImages) as ViewType[]).filter(v => viewImages[v]);
        if (availableViews.length <= 1) return null;
        return (
          <div className="flex gap-2 mb-4">
            {availableViews.map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentView === view
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {viewLabels[view]}
              </button>
            ))}
          </div>
        );
      })()}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Building view image with floor overlays - 75% size */}
        <div className="lg:col-span-2 flex justify-center">
          {currentImage ? (
            <div className="relative w-3/4 aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden">
              <Image
                src={currentImage}
                alt={`${building.name} ${currentView} view`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              
              {/* Floor overlays */}
              {getFloorPositions().map(({ floor, position }) => {
                const stats = getFloorStats(floor);
                const isHovered = hoveredFloor === floor.id;
                
                return (
                  <button
                    key={floor.id}
                    onClick={() => onFloorSelect(floor.id)}
                    onMouseEnter={() => setHoveredFloor(floor.id)}
                    onMouseLeave={() => setHoveredFloor(null)}
                    className={`absolute left-0 right-0 border-y transition-all cursor-pointer ${
                      isHovered
                        ? "bg-emerald-500/40 border-emerald-500"
                        : "bg-transparent border-transparent hover:bg-white/20"
                    }`}
                    style={{
                      top: `${position.yStart}%`,
                      height: `${position.yEnd - position.yStart}%`,
                    }}
                  >
                    {isHovered && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                        <p className="font-medium">{t("floor")} {floor.number}</p>
                        <p className="text-emerald-400 text-[10px]">{stats.available}/{stats.total}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Fallback: Building elevation diagram */
            <div className="bg-slate-100 rounded-lg p-4">
              <div className="max-w-xs mx-auto">
                {/* Roof */}
                <div className="h-4 bg-slate-400 rounded-t-lg" />
                
                {/* Floors */}
                {sortedFloors.map((floor) => {
                  const isHovered = hoveredFloor === floor.id;
                  return (
                    <button
                      key={floor.id}
                      onClick={() => onFloorSelect(floor.id)}
                      onMouseEnter={() => setHoveredFloor(floor.id)}
                      onMouseLeave={() => setHoveredFloor(null)}
                      className={`w-full flex items-center gap-3 border-x border-b border-slate-300 px-3 py-3 transition ${
                        isHovered ? "bg-emerald-50" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-600 w-8">{floor.number}</span>
                      <span className="flex-1 text-sm text-slate-500 text-left">{t("floor")} {floor.number}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Floor list */}
        <div className="space-y-2">
          <h4 className="font-medium text-slate-700 mb-3">{t("floors")}</h4>
          {sortedFloors.map((floor) => {
            const stats = getFloorStats(floor);
            const isHovered = hoveredFloor === floor.id;
            
            return (
              <button
                key={floor.id}
                onClick={() => onFloorSelect(floor.id)}
                onMouseEnter={() => setHoveredFloor(floor.id)}
                onMouseLeave={() => setHoveredFloor(null)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                  isHovered
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="font-medium">{t("floor")} {floor.number}</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
