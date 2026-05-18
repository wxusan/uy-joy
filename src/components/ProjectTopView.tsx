"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
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
  heroTitle: string;
  heroSubtitle?: string;
  minPricePerM2?: number | null;
  availableCount?: number;
  totalCount?: number;
  expectedYear?: number | null;
  onBuildingSelect: (buildingId: string) => void;
}

const inactiveLine = "rgba(247, 232, 215, 0.46)";
const activeLine = "rgba(238, 123, 82, 0.95)";

const resolveTopViewImage = (src: string | null): string | null => {
  if (!src || src.startsWith("/generated/uyjoy/")) return null;
  return src;
};

export default function ProjectTopView({
  topViewImage,
  buildings,
  heroTitle,
  heroSubtitle,
  minPricePerM2,
  availableCount,
  totalCount,
  expectedYear,
  onBuildingSelect,
}: Props) {
  const t = useTranslations("explore");
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.42);
  const [glowOpacity, setGlowOpacity] = useState(1);
  const [imageSrc, setImageSrc] = useState(resolveTopViewImage(topViewImage));

  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildingsWithPolygons = buildings.filter(
    (b) => b.polygonData && Array.isArray(b.polygonData) && b.polygonData.length >= 3
  );

  useEffect(() => {
    setImageSrc(resolveTopViewImage(topViewImage));
  }, [topViewImage]);

  useEffect(() => {
    if (hoveredBuilding || buildingsWithPolygons.length <= 1) return;

    const interval = setInterval(() => {
      setOverlayOpacity(0.28);
      setGlowOpacity(0.18);

      timer1Ref.current = setTimeout(() => {
        setDisplayedIndex((prev) => (prev + 1) % buildingsWithPolygons.length);
      }, 520);

      timer2Ref.current = setTimeout(() => {
        setOverlayOpacity(0.42);
        setGlowOpacity(1);
      }, 720);
    }, 3100);

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

  const getLabelPosition = (center: Point, index: number, total: number) => {
    const spacing = 100 / (total + 1);
    return {
      x: spacing * (index + 1),
      y: Math.max(7, center.y - 16),
    };
  };

  const getBuildingLetter = (name: string) => {
    const stripped = name.replace(/^(block|building)\s*/i, "").trim();
    return (stripped || name).slice(0, 2).toUpperCase();
  };

  const spotlitId =
    hoveredBuilding ?? buildingsWithPolygons[displayedIndex % buildingsWithPolygons.length]?.id ?? null;
  const spotlitBuilding = buildings.find((b) => b.id === spotlitId);
  const spotlitPolygon = spotlitBuilding ? getBuildingPolygon(spotlitBuilding) : null;
  const holeD = spotlitPolygon ? toSvgPath(spotlitPolygon) : "";
  const effectiveOpacity = hoveredBuilding ? 0.38 : overlayOpacity;
  const effectiveGlowOpacity = hoveredBuilding ? 1 : glowOpacity;
  const heroMeta =
    minPricePerM2 && availableCount != null && totalCount != null && expectedYear
      ? t("heroMeta", {
          price: Math.round(minPricePerM2).toLocaleString("ru-RU"),
          available: availableCount,
          total: totalCount,
          year: expectedYear,
        })
      : null;
  const handleBuildingClick = (buildingId: string) => {
    setHoveredBuilding(buildingId);
    onBuildingSelect(buildingId);
  };

  if (!imageSrc && buildings.length > 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {buildings.map((building) => {
            const stats = getBuildingStats(building);
            return (
              <button
                key={building.id}
                onClick={() => onBuildingSelect(building.id)}
                className="p-4 border-2 rounded-xl hover:border-[#d36a4b] hover:bg-[#fff7f2] transition text-left group"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-[#fff0e8] transition">
                  <Building2 className="w-5 h-5 text-slate-500 group-hover:text-[#d36a4b]" />
                </div>
                <h4 className="font-semibold">{building.name}</h4>
                <p className="text-sm text-slate-500">{stats.floors} {t("floors")}</p>
                <p className="text-sm text-[#d36a4b]">{stats.available}/{stats.total} {t("available")}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-[#11100f] shadow-[0_18px_70px_rgba(0,0,0,0.34)]">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {imageSrc && (
          <Image
            src={imageSrc}
            alt="Project aerial view"
            fill
            unoptimized
            priority
            className="object-cover"
            sizes="100vw"
            onError={() => {
              setImageSrc(null);
            }}
          />
        )}

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,7,0.26) 0%, rgba(8,8,7,0.04) 40%, rgba(8,8,7,0.36) 100%), radial-gradient(circle at 22% 0%, rgba(224,116,72,0.20), transparent 29%), radial-gradient(circle at 50% 52%, transparent 0%, rgba(0,0,0,0.18) 78%)",
          }}
        />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="uyjoy-warm-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.05" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {holeD ? (
            <path
              fillRule="evenodd"
              d={`M-1,-1 H101 V101 H-1 Z ${holeD}`}
              fill="black"
              className="pointer-events-none transition-opacity duration-700 ease-out"
              style={{ opacity: effectiveOpacity }}
            />
          ) : (
            <rect width="100" height="100" fill="black" opacity="0.34" className="pointer-events-none" />
          )}

          {spotlitPolygon && (
            <>
              <path
                d={holeD}
                fill="rgba(211,106,75,0.10)"
                className="pointer-events-none transition-opacity duration-700"
                style={{ opacity: effectiveGlowOpacity }}
              />
              <path
                d={holeD}
                fill="none"
                stroke="#e87954"
                strokeWidth={0.42}
                strokeLinejoin="round"
                filter="url(#uyjoy-warm-glow)"
                className="pointer-events-none transition-opacity duration-700"
                style={{ opacity: 0.6 * effectiveGlowOpacity }}
              />
              <path
                d={holeD}
                fill="none"
                stroke="#ffe0c7"
                strokeWidth={0.13}
                strokeLinejoin="round"
                className="pointer-events-none transition-opacity duration-700"
                style={{ opacity: 0.86 * effectiveGlowOpacity }}
              />
              <path
                d={holeD}
                fill="none"
                stroke="#ff8b61"
                strokeWidth={0.18}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="3.4 7"
                className="uyjoy-running-highlight pointer-events-none"
                style={{ opacity: 0.82 * effectiveGlowOpacity }}
              />
            </>
          )}

          {buildings.map((building, index) => {
            const polygon = getBuildingPolygon(building);
            if (!polygon) return null;

            const isActive = building.id === spotlitId || hoveredBuilding === building.id;
            const polygonCenter = getCenter(polygon);
            const labelPos =
              building.labelX != null && building.labelY != null
                ? { x: building.labelX, y: building.labelY }
                : getLabelPosition(polygonCenter, index, buildings.length);
            const pointPos =
              building.pointX != null && building.pointY != null
                ? { x: building.pointX, y: building.pointY }
                : polygonCenter;
            const scale = building.labelScale || 1;

            return (
              <g key={`pointer-${building.id}`} className="pointer-events-none">
                <line
                  x1={labelPos.x}
                  y1={labelPos.y + 3.1 * scale}
                  x2={pointPos.x}
                  y2={pointPos.y}
                  stroke={isActive ? activeLine : inactiveLine}
                  strokeWidth={isActive ? 0.22 : 0.12}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <circle
                  cx={pointPos.x}
                  cy={pointPos.y}
                  r={isActive ? 0.34 : 0.24}
                  fill={isActive ? "#fff2e6" : "rgba(248,239,227,0.88)"}
                  stroke={isActive ? "#f08d62" : "rgba(248,232,215,0.52)"}
                  strokeWidth={isActive ? 0.12 : 0.08}
                  style={{
                    filter: isActive
                      ? "drop-shadow(0 0 1px rgba(255,139,97,0.75))"
                      : "drop-shadow(0 0.6px 0.7px rgba(0,0,0,0.45))",
                    transition: "r 0.5s ease, stroke 0.5s ease, filter 0.5s ease",
                  }}
                />
                {isActive && (
                  <circle
                    cx={pointPos.x}
                    cy={pointPos.y}
                    r={0.58}
                    fill="none"
                    stroke="rgba(255,226,203,0.42)"
                    strokeWidth={0.08}
                    className="transition-opacity duration-500"
                  />
                )}
              </g>
            );
          })}

          {buildings.map((building) => {
            const polygon = getBuildingPolygon(building);
            if (!polygon) return null;

            return (
              <path
                key={`hit-${building.id}`}
                d={toSvgPath(polygon)}
                fill="transparent"
                stroke="transparent"
                strokeWidth={2}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredBuilding(building.id)}
                onMouseLeave={() => setHoveredBuilding(null)}
                onClick={() => handleBuildingClick(building.id)}
              />
            );
          })}
        </svg>

        {buildings.map((building, index) => {
          const polygon = getBuildingPolygon(building);
          if (!polygon) return null;

          const stats = getBuildingStats(building);
          const isActive = building.id === spotlitId || hoveredBuilding === building.id;
          const polygonCenter = getCenter(polygon);
          const labelPos =
            building.labelX != null && building.labelY != null
              ? { x: building.labelX, y: building.labelY }
              : getLabelPosition(polygonCenter, index, buildings.length);
          const scale = building.labelScale || 1;
          const labelStyle: CSSProperties = {
            left: `${labelPos.x}%`,
            top: `${labelPos.y}%`,
            width: `${58 * scale}px`,
            height: `${66 * scale}px`,
            transform: `translate(-50%, -50%) scale(${isActive ? 1.04 : 1})`,
          };

          return (
            <button
              key={building.id}
              className="absolute z-10 flex flex-col items-center justify-center rounded-[4px] border text-center leading-none transition-all duration-500"
              style={{
                ...labelStyle,
                background: isActive ? "rgba(155, 70, 45, 0.84)" : "rgba(18, 17, 15, 0.76)",
                borderColor: isActive ? "rgba(255, 158, 114, 0.92)" : "rgba(248, 232, 215, 0.34)",
                boxShadow: isActive
                  ? "0 0 0 1px rgba(255,224,199,0.12), 0 10px 30px rgba(211,106,75,0.35), inset 0 0 24px rgba(255,159,113,0.18)"
                  : "0 8px 24px rgba(0,0,0,0.28)",
                backdropFilter: "blur(12px)",
              }}
              onClick={() => handleBuildingClick(building.id)}
              onMouseEnter={() => setHoveredBuilding(building.id)}
              onMouseLeave={() => setHoveredBuilding(null)}
              aria-label={`${building.name}, ${stats.floors} ${t("floors")}`}
            >
              <span
                className="font-display font-semibold text-[#f9ead6]"
                style={{ fontSize: `${28 * scale}px`, lineHeight: 0.92 }}
              >
                {getBuildingLetter(building.name)}
              </span>
              <span
                className="mt-1 font-medium text-[#f2dfc5]"
                style={{ fontSize: `${11 * scale}px`, lineHeight: 1 }}
              >
                {stats.floors} {t("floors")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none relative z-[8] max-w-[min(520px,calc(100vw-40px))] bg-[#11100f] px-5 py-5 md:absolute md:bottom-10 md:left-10 md:max-w-[min(520px,calc(100vw-48px))] md:bg-transparent md:p-0 lg:bottom-14 lg:left-14">
        <div className="uyjoy-hero-rule mb-4 h-[4px] w-16 rounded-full bg-[#d66948] shadow-[0_0_22px_rgba(214,105,72,0.55)] md:w-20" />
        <h1 className="uyjoy-hero-title font-display text-[40px] font-semibold leading-[0.94] tracking-normal text-[#fff5e8] drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] md:text-[64px] lg:text-[76px]">
          {heroTitle}
        </h1>
        {heroSubtitle && (
          <p className="uyjoy-hero-subtitle mt-4 max-w-[440px] overflow-hidden text-[16px] font-medium leading-6 text-[#f0dfca]/90 drop-shadow-[0_3px_16px_rgba(0,0,0,0.5)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:text-[22px] md:leading-8">
            {heroSubtitle}
          </p>
        )}
        {heroMeta && (
          <p className="uyjoy-hero-subtitle mt-3 max-w-[520px] text-[13px] font-semibold leading-5 text-[rgba(255,226,199,0.92)] drop-shadow-[0_3px_16px_rgba(0,0,0,0.5)] md:text-[15px]">
            {heroMeta}
          </p>
        )}
      </div>

      <style jsx global>{`
        @keyframes uyjoy-border-run {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -44;
          }
        }

        .uyjoy-running-highlight {
          animation: uyjoy-border-run 2.4s linear infinite;
        }

        @keyframes uyjoy-hero-rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes uyjoy-rule-grow {
          from {
            opacity: 0;
            transform: scaleX(0);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        .uyjoy-hero-rule {
          transform-origin: left center;
          animation: uyjoy-rule-grow 820ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both;
        }

        .uyjoy-hero-title {
          animation: uyjoy-hero-rise 780ms cubic-bezier(0.22, 1, 0.36, 1) 260ms both;
        }

        .uyjoy-hero-subtitle {
          animation: uyjoy-hero-rise 820ms cubic-bezier(0.22, 1, 0.36, 1) 430ms both;
        }

        @media (prefers-reduced-motion: reduce) {
          .uyjoy-running-highlight,
          .uyjoy-hero-rule,
          .uyjoy-hero-title,
          .uyjoy-hero-subtitle {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
