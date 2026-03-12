"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Building2 } from "lucide-react";

type Point = { x: number; y: number };

interface Building {
  id: string;
  name: string;
  polygonData: Point[] | null;
  labelX: number | null;
  labelY: number | null;
  pointX: number | null;
  pointY: number | null;
  labelScale: number | null;
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
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.62);
  const [overlayEasing, setOverlayEasing] = useState("0.9s cubic-bezier(0.4,0,0.2,1)");
  const [glowOpacity, setGlowOpacity] = useState(1);

  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildingsWithPolygons = buildings.filter(
    (b) => b.polygonData && Array.isArray(b.polygonData) && b.polygonData.length >= 3
  );

  // Cycle spotlight sequentially — fade out, swap hole, fade back in
  useEffect(() => {
    if (hoveredBuilding || buildingsWithPolygons.length <= 1) return;

    const interval = setInterval(() => {
      // Step 1: fast fade out — ease-in so it accelerates into darkness
      setOverlayEasing("0.45s cubic-bezier(0.4,0,1,1)");
      setOverlayOpacity(0.05);
      setGlowOpacity(0);

      // Step 2: swap the hole mid-darkness (overlay is near-invisible by now)
      timer1Ref.current = setTimeout(() => {
        setDisplayedIndex((prev) => (prev + 1) % buildingsWithPolygons.length);
      }, 500);

      // Step 3: slow cinematic fade back in — ease-out so it decelerates into brightness
      timer2Ref.current = setTimeout(() => {
        setOverlayEasing("1.0s cubic-bezier(0,0,0.2,1)");
        setOverlayOpacity(0.62);
        setGlowOpacity(1);
      }, 680);
    }, 3400);

    return () => {
      clearInterval(interval);
      if (timer1Ref.current) clearTimeout(timer1Ref.current);
      if (timer2Ref.current) clearTimeout(timer2Ref.current);
    };
  }, [hoveredBuilding, buildingsWithPolygons.length]);

  const getBuildingPolygon = (building: Building): Point[] | null => {
    if (!building.polygonData || !Array.isArray(building.polygonData)) return null;
    return building.polygonData;
  };

  const getBuildingStats = (building: Building) => {
    const allUnits = building.floors.flatMap((f) => f.units);
    const available = allUnits.filter((u) => u.status === "available").length;
    const total = allUnits.length;
    return { available, total, floors: building.floors.length };
  };

  const toSvgPath = (points: Point[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const getCenter = (points: Point[]) => ({
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  });

  // No top view image — fallback cards
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
                <p className="text-sm text-emerald-600">{stats.available}/{stats.total} {t("available")}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const getLabelPosition = (center: Point, index: number, total: number) => {
    const labelY = Math.max(2, center.y - 15);
    const spacing = 100 / (total + 1);
    const labelX = spacing * (index + 1);
    return { x: labelX, y: labelY };
  };

  // Which building is currently spotlit
  const spotlitId = hoveredBuilding ?? buildingsWithPolygons[displayedIndex]?.id ?? null;
  const spotlitBuilding = buildings.find((b) => b.id === spotlitId);
  const spotlitPolygon = spotlitBuilding ? getBuildingPolygon(spotlitBuilding) : null;
  const holeD = spotlitPolygon ? toSvgPath(spotlitPolygon) : "";

  // When hovering, keep overlay steady at a fixed opacity
  const effectiveOpacity = hoveredBuilding ? 0.58 : overlayOpacity;
  const overlayTransition = hoveredBuilding
    ? "opacity 0.4s cubic-bezier(0.4,0,0.2,1)"
    : `opacity ${overlayEasing}`;
  const effectiveGlowOpacity = hoveredBuilding ? 1 : glowOpacity;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
      <h3 className="font-semibold text-slate-700 mb-4 text-center">{t("selectBuilding")}</h3>

      <div className="relative w-[90%] md:w-[75%] lg:w-[60%] xl:w-[60%] mx-auto aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-inner">
        <Image
          src={topViewImage}
          alt="Project aerial view"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 85vw"
        />

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="spotlight-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Per-building gradient for pointer lines */}
            {buildings.map((building, index) => {
              const polygon = getBuildingPolygon(building);
              if (!polygon) return null;
              const polygonCenter = getCenter(polygon);
              const labelPos =
                building.labelX != null && building.labelY != null
                  ? { x: building.labelX, y: building.labelY }
                  : getLabelPosition(polygonCenter, index, buildings.length);
              const pointPos =
                building.pointX != null && building.pointY != null
                  ? { x: building.pointX, y: building.pointY }
                  : polygonCenter;
              const lx = labelPos.x;
              const ly = labelPos.y + 5;
              return (
                <linearGradient
                  key={`lg-${building.id}`}
                  id={`line-grad-${building.id}`}
                  gradientUnits="userSpaceOnUse"
                  x1={lx} y1={ly}
                  x2={pointPos.x} y2={pointPos.y}
                >
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
                </linearGradient>
              );
            })}
          </defs>

          {/* ── NIGHT OVERLAY with hole punched for spotlit building ── */}
          {holeD ? (
            <path
              fillRule="evenodd"
              // Outer rect — fills the whole SVG; inner polygon cuts the hole
              d={`M-1,-1 H101 V101 H-1 Z ${holeD}`}
              fill="black"
              className="pointer-events-none"
              style={{ opacity: effectiveOpacity, transition: overlayTransition }}
            />
          ) : (
            // No polygon available — plain overlay
            <rect
              width="100"
              height="100"
              fill="black"
              className="pointer-events-none"
              style={{ opacity: 0.55 }}
            />
          )}

          {/* ── GLOWING BORDER on spotlit building ── */}
          {spotlitPolygon && (
            <>
              {/* Outer soft glow */}
              <path
                d={holeD}
                fill="none"
                stroke="#34d399"
                strokeWidth={hoveredBuilding ? 0.9 : 0.7}
                strokeLinejoin="round"
                filter="url(#spotlight-glow)"
                className="pointer-events-none"
                style={{
                  opacity: (hoveredBuilding ? 0.9 : 0.75) * effectiveGlowOpacity,
                  transition: hoveredBuilding ? "opacity 0.4s cubic-bezier(0.4,0,0.2,1)" : `opacity ${overlayEasing}`,
                }}
              />
              {/* Sharp inner edge */}
              <path
                d={holeD}
                fill="none"
                stroke="#6ee7b7"
                strokeWidth={hoveredBuilding ? 0.35 : 0.25}
                strokeLinejoin="round"
                className="pointer-events-none"
                style={{
                  opacity: (hoveredBuilding ? 1 : 0.85) * effectiveGlowOpacity,
                  transition: hoveredBuilding ? "opacity 0.4s cubic-bezier(0.4,0,0.2,1)" : `opacity ${overlayEasing}`,
                }}
              />
            </>
          )}

          {/* ── CLICKABLE HIT AREAS — on top of everything ── */}
          {buildings.map((building) => {
            const polygon = getBuildingPolygon(building);
            if (!polygon) return null;
            return (
              <path
                key={building.id}
                d={toSvgPath(polygon)}
                fill="transparent"
                stroke="transparent"
                strokeWidth={2}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredBuilding(building.id)}
                onMouseLeave={() => setHoveredBuilding(null)}
                onClick={() => onBuildingSelect(building.id)}
              />
            );
          })}

          {/* ── CENTER DOTS + CONNECTOR LINES ── */}
          {buildings.map((building, index) => {
            const polygon = getBuildingPolygon(building);
            if (!polygon) return null;

            const isSpotlit = building.id === spotlitId;
            const isHovered = hoveredBuilding === building.id;
            const polygonCenter = getCenter(polygon);

            const labelPos =
              building.labelX !== null && building.labelY !== null &&
              building.labelX !== undefined && building.labelY !== undefined
                ? { x: building.labelX, y: building.labelY }
                : getLabelPosition(polygonCenter, index, buildings.length);

            const pointPos =
              building.pointX !== null && building.pointY !== null &&
              building.pointX !== undefined && building.pointY !== undefined
                ? { x: building.pointX, y: building.pointY }
                : polygonCenter;

            const lineStartX = labelPos.x;
            const lineStartY = labelPos.y + 5;

            return (
              <g key={`dot-${building.id}`} className="pointer-events-none">
                {/* Gradient connector line — fades in from label, arrives solid at dot */}
                <line
                  x1={lineStartX}
                  y1={lineStartY}
                  x2={pointPos.x}
                  y2={pointPos.y}
                  stroke={`url(#line-grad-${building.id})`}
                  strokeWidth={isHovered ? 0.55 : isSpotlit ? 0.45 : 0.32}
                  strokeLinecap="round"
                  style={{ transition: "stroke-width 0.4s ease" }}
                />
                {/* Sonar ping rings */}
                <circle
                  cx={pointPos.x}
                  cy={pointPos.y}
                  r={0.55}
                  fill="none"
                  stroke={isHovered ? "#6ee7b7" : "#10b981"}
                  strokeWidth={0.12}
                  className="pointer-ping-1"
                />
                <circle
                  cx={pointPos.x}
                  cy={pointPos.y}
                  r={0.55}
                  fill="none"
                  stroke={isHovered ? "#6ee7b7" : "#10b981"}
                  strokeWidth={0.12}
                  className="pointer-ping-2"
                />
                {/* Solid center dot */}
                <circle
                  cx={pointPos.x}
                  cy={pointPos.y}
                  r={isHovered ? 0.75 : isSpotlit ? 0.65 : 0.5}
                  fill={isHovered ? "#fff" : isSpotlit ? "#6ee7b7" : "#10b981"}
                  stroke={isHovered ? "#10b981" : isSpotlit ? "#34d399" : "none"}
                  strokeWidth={0.12}
                  style={{
                    filter: isSpotlit
                      ? "drop-shadow(0 0 1.5px rgba(52,211,153,0.95))"
                      : "none",
                    transition: "r 0.5s ease, filter 0.5s ease, fill 0.5s ease",
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* ── HTML LABELS ── */}
        {buildings.map((building, index) => {
          const polygon = getBuildingPolygon(building);
          if (!polygon) return null;

          const stats = getBuildingStats(building);
          const isSpotlit = building.id === spotlitId;
          const isHovered = hoveredBuilding === building.id;
          const active = isSpotlit || isHovered;
          const polygonCenter = getCenter(polygon);

          const labelPos =
            building.labelX !== null && building.labelY !== null &&
            building.labelX !== undefined && building.labelY !== undefined
              ? { x: building.labelX, y: building.labelY }
              : getLabelPosition(polygonCenter, index, buildings.length);

          return (
            <button
              key={building.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{ left: `${labelPos.x}%`, top: `${labelPos.y}%` }}
              onClick={() => onBuildingSelect(building.id)}
              onMouseEnter={() => setHoveredBuilding(building.id)}
              onMouseLeave={() => setHoveredBuilding(null)}
            >
              <div className="relative flex flex-col items-center">
                {/* Card */}
                <div
                  className={`flex flex-col items-center px-5 py-1 rounded-md text-center whitespace-nowrap border ${
                    active
                      ? "bg-white border-emerald-200 text-emerald-700"
                      : "bg-emerald-600/90 border-emerald-500/50 text-white backdrop-blur-sm"
                  }`}
                  style={{
                    minWidth: "80px",
                    transform: active ? "scale(1.08)" : "scale(1)",
                    boxShadow: active
                      ? "0 4px 24px rgba(16,185,129,0.5), 0 2px 12px rgba(0,0,0,0.2)"
                      : "0 4px 16px rgba(0,0,0,0.3)",
                    transition: "background-color 0.55s cubic-bezier(0.4,0,0.2,1), box-shadow 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1), border-color 0.4s ease",
                  }}
                >
                  <span className={`font-bold text-xs sm:text-sm leading-tight tracking-wide ${active ? "text-emerald-700" : "text-white"}`}>
                    {building.name}
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-medium leading-tight mt-0.5 ${active ? "text-emerald-500" : "text-emerald-100"}`}>
                    {stats.available}/{stats.total}
                  </span>
                </div>
                {/* Downward triangle — connects card to line */}
                <div
                  className="w-0 h-0"
                  style={{
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: active
                      ? "5px solid white"
                      : "5px solid #16a34a",
                    transition: "border-top-color 0.4s ease",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Building legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {buildings.map((building) => {
          const stats = getBuildingStats(building);
          const isSpotlit = building.id === spotlitId;
          return (
            <button
              key={building.id}
              onClick={() => onBuildingSelect(building.id)}
              onMouseEnter={() => setHoveredBuilding(building.id)}
              onMouseLeave={() => setHoveredBuilding(null)}
              className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all duration-500 ${
                hoveredBuilding === building.id
                  ? "bg-emerald-100 text-emerald-700"
                  : isSpotlit
                  ? "bg-emerald-50 text-emerald-600"
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
