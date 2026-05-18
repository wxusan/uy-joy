"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2, CheckCircle2, Home, Images, ParkingSquare, ShieldCheck } from "lucide-react";
import ImageCoordinateStage, { ImagePoint } from "@/components/ImageCoordinateStage";

type ViewType = "front" | "back" | "left" | "right";
type Point = ImagePoint;
type FloorPositionData = { yStart?: number; yEnd?: number; polygon?: Point[]; label?: Point | null };
type FloorPositionValue = FloorPositionData | string | null;

interface Floor {
  id: string;
  number: number;
  positionData: FloorPositionValue;
  floorPlanImage: string | null;
  basePricePerM2: number | null;
  units: { id: string; status: string; polygonData?: Point[] | null }[];
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
  onBack: () => void;
  onFloorSelect?: (floorId: string) => void;
}

export default function BuildingViewer({ building, onBack, onFloorSelect }: Props) {
  const t = useTranslations("explore");
  const tc = useTranslations("common");
  const sortedFloors = useMemo(() => [...building.floors].sort((a, b) => b.number - a.number), [building.floors]);
  const [hoveredFloorId, setHoveredFloorId] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  const viewImages: Record<ViewType, string | null> = {
    front: building.frontViewImage,
    back: building.backViewImage,
    left: building.leftViewImage,
    right: building.rightViewImage,
  };

  const getBuildingLetter = (name: string) => {
    const stripped = name.replace(/^(block|building)\s*/i, "").trim();
    return (stripped || name).slice(0, 1).toUpperCase();
  };

  const buildingLetter = getBuildingLetter(building.name);
  const displayName = /^(block|building)\s*/i.test(building.name) ? `${buildingLetter} Building` : building.name;

  const galleryImages = [
    { label: t("frontView"), src: viewImages.front },
    { label: t("backView"), src: viewImages.back },
    { label: t("leftView"), src: viewImages.left },
    { label: t("rightView"), src: viewImages.right },
  ].filter((item): item is { label: string; src: string } => Boolean(item.src));

  const selectedGallery = galleryImages[activeGalleryIndex] ?? galleryImages[0];
  const hoveredFloor = sortedFloors.find((floor) => floor.id === hoveredFloorId) ?? null;
  const previewFloor = hoveredFloor ?? null;
  const totalUnits = building.floors.reduce((sum, floor) => sum + floor.units.length, 0);
  const availableUnits = building.floors.reduce(
    (sum, floor) => sum + floor.units.filter((unit) => unit.status === "available").length,
    0
  );

  const getFloorStats = (floor: Floor) => {
    const available = floor.units.filter((unit) => unit.status === "available").length;
    return { available, total: floor.units.length };
  };

  const parseFloorPosition = (value: FloorPositionValue): FloorPositionData | null => {
    if (!value) return null;
    if (typeof value !== "string") return value;

    try {
      return JSON.parse(value) as FloorPositionData;
    } catch {
      return null;
    }
  };

  const getFloorPolygon = (floor: Floor): Point[] | null => {
    const data = parseFloorPosition(floor.positionData);
    if (!data) return null;

    if (Array.isArray(data.polygon) && data.polygon.length >= 3) {
      return data.polygon;
    }

    if (
      typeof data.yStart === "number" &&
      typeof data.yEnd === "number" &&
      data.yEnd > data.yStart
    ) {
      return [
        { x: 0, y: data.yStart },
        { x: 100, y: data.yStart },
        { x: 100, y: data.yEnd },
        { x: 0, y: data.yEnd },
      ];
    }

    return null;
  };

  const toSvgPath = (points: Point[]) =>
    points.map((p, index) => `${index === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const getUnitStatusStyle = (status: string) => {
    if (status === "sold") {
      return { fill: "rgba(190, 78, 55, 0.38)", stroke: "rgba(216, 107, 76, 0.72)" };
    }

    if (status === "reserved") {
      return { fill: "rgba(185, 145, 76, 0.36)", stroke: "rgba(216, 172, 103, 0.72)" };
    }

    return { fill: "rgba(133, 169, 110, 0.38)", stroke: "rgba(159, 210, 135, 0.72)" };
  };

  const getPolygonCenter = (points: Point[]) => ({
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  });

  const getPolygonYAtX = (points: Point[], x: number) => {
    const intersections: number[] = [];

    points.forEach((point, index) => {
      const nextPoint = points[(index + 1) % points.length];
      const minX = Math.min(point.x, nextPoint.x);
      const maxX = Math.max(point.x, nextPoint.x);
      const crossesX = x >= minX && x <= maxX && point.x !== nextPoint.x;

      if (crossesX) {
        const progress = (x - point.x) / (nextPoint.x - point.x);
        intersections.push(point.y + progress * (nextPoint.y - point.y));
      }
    });

    if (intersections.length < 2) return null;

    intersections.sort((a, b) => a - b);
    return (intersections[0] + intersections[intersections.length - 1]) / 2;
  };

  const getFloorLabelPosition = (points: Point[], labelX: number, savedLabel?: Point | null) => {
    if (savedLabel && typeof savedLabel.x === "number" && typeof savedLabel.y === "number") {
      return savedLabel;
    }

    const center = getPolygonCenter(points);
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const safeX = Math.min(Math.max(labelX, minX + 1.5), maxX - 1.5);
    const yOnBand = getPolygonYAtX(points, safeX);

    return {
      x: yOnBand === null ? center.x : safeX,
      y: yOnBand ?? center.y,
    };
  };

  const previewFloorStats = previewFloor ? getFloorStats(previewFloor) : { available: 0, total: 0 };
  const handleFloorHover = (floorId: string | null) => {
    setHoveredFloorId(floorId);
  };

  const floorLabelX = 50;

  const floorOverlay = activeGalleryIndex === 0 && (
    <div className="pointer-events-none absolute inset-0 z-20">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {sortedFloors.map((floor) => {
            const polygon = getFloorPolygon(floor);
            if (!polygon) return null;
            const isHovered = hoveredFloorId === floor.id;

            return (
              <path
                key={floor.id}
                d={toSvgPath(polygon)}
                className="cursor-pointer transition-[fill,stroke,opacity] duration-200"
                style={{
                  fill: isHovered ? "rgba(155, 70, 45, 0.54)" : "rgba(155, 70, 45, 0.001)",
                  stroke: isHovered ? "rgba(255, 224, 199, 0.92)" : "rgba(244, 223, 198, 0.34)",
                  filter: isHovered ? "drop-shadow(0 0 14px rgba(255, 139, 97, 0.28))" : "none",
                  pointerEvents: "auto",
                }}
                strokeWidth={isHovered ? 0.62 : 0.28}
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => handleFloorHover(floor.id)}
                onMouseLeave={() => handleFloorHover(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  onFloorSelect?.(floor.id);
                }}
              />
            );
          })}
          {sortedFloors.map((floor, index) => {
            const polygon = getFloorPolygon(floor);
            if (!polygon) return null;

            return (
              <path
                key={`${floor.id}-intro`}
                d={toSvgPath(polygon)}
                className="building-floor-intro pointer-events-none"
                fill="rgba(155, 70, 45, 0.48)"
                stroke="rgba(255, 224, 199, 0.88)"
                strokeWidth={0.42}
                vectorEffect="non-scaling-stroke"
                style={{
                  filter: "drop-shadow(0 0 14px rgba(255, 139, 97, 0.22))",
                  animationDelay: `${(sortedFloors.length - index - 1) * 90}ms`,
                }}
              />
            );
          })}
        </svg>

        {sortedFloors.map((floor) => {
          const polygon = getFloorPolygon(floor);
          if (!polygon) return null;
          const positionData = parseFloorPosition(floor.positionData);
          const labelPosition = getFloorLabelPosition(polygon, floorLabelX, positionData?.label);
          const isHovered = hoveredFloorId === floor.id;

          return (
            <button
              key={floor.id}
              type="button"
              onClick={() => onFloorSelect?.(floor.id)}
              onMouseEnter={() => handleFloorHover(floor.id)}
              onMouseLeave={() => handleFloorHover(null)}
              className={`pointer-events-auto absolute rounded-[3px] px-1.5 py-0.5 text-left md:px-2 md:py-1 ${
                isHovered
                  ? "bg-[#c65e3f]/86 shadow-[0_0_24px_rgba(229,111,73,0.42)]"
                  : "bg-black/35"
              }`}
              style={{
                left: `${labelPosition.x}%`,
                top: `${labelPosition.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              aria-label={`${t("floor")} ${floor.number}`}
            >
              <span className="text-[13px] font-semibold text-[#fff4e8] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] md:text-[16px]">
                {floor.number}
              </span>
            </button>
          );
        })}

        {hoveredFloor && (
          <div className="pointer-events-none absolute left-[83%] top-1/2 hidden w-[112px] -translate-y-1/2 rounded-[5px] border border-[#ff8a5f]/55 bg-[#151819]/78 p-4 text-[#f8ead8] shadow-[0_18px_45px_rgba(0,0,0,0.42)] backdrop-blur-md md:block">
            <p className="text-[15px] font-semibold">{t("floor")} {hoveredFloor.number}</p>
            <p className="mt-2 text-[12px] font-medium text-[#d7c6b5]">{t("floorUnitCount", { count: getFloorStats(hoveredFloor).total })}</p>
            <p className="mt-1 text-[12px] font-medium text-[#9ed287]">{t("floorAvailableCount", { count: getFloorStats(hoveredFloor).available })}</p>
          </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#090b0c] text-[#f4eadc]">
      <style jsx global>{`
        .building-floor-intro {
          opacity: 0;
          animation: building-floor-intro 1.8s ease-out both;
        }
        .building-floor-list-intro {
          animation: building-floor-list-intro 1.8s ease-out both;
        }
        @keyframes building-floor-intro {
          0%   { opacity: 0; }
          15%  { opacity: 0.9; }
          55%  { opacity: 0.4; }
          100% { opacity: 0; }
        }
        @keyframes building-floor-list-intro {
          0%   { background-color: rgba(169,79,56,0);    box-shadow: inset 0 0 0 1px rgba(255,138,95,0); }
          15%  { background-color: rgba(169,79,56,0.58); box-shadow: inset 0 0 0 1px rgba(255,138,95,0.44); }
          55%  { background-color: rgba(169,79,56,0.18); box-shadow: inset 0 0 0 1px rgba(255,138,95,0.16); }
          100% { background-color: rgba(169,79,56,0);    box-shadow: inset 0 0 0 1px rgba(255,138,95,0); }
        }
      `}</style>
      <div className="grid min-h-screen lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_372px]">
        <div className="relative overflow-hidden border-r border-[#f0d7be]/10 lg:h-screen lg:min-h-0">
          {selectedGallery?.src ? (
            <ImageCoordinateStage
              src={selectedGallery.src}
              alt={`${displayName} ${selectedGallery.label}`}
              sizes="(min-width: 1280px) calc(100vw - 372px), (min-width: 1024px) calc(100vw - 350px), 100vw"
              priority
              className="relative h-[360px] bg-[#090b0c] sm:h-[430px] lg:absolute lg:inset-0 lg:h-auto"
            >
              {floorOverlay}
            </ImageCoordinateStage>
          ) : (
            <div className="relative flex h-[360px] items-center justify-center bg-[#101414] text-[14px] font-medium text-[#8d7f70] sm:h-[430px] lg:absolute lg:inset-0 lg:h-auto">
              {t("noBuildingImage")}
            </div>
          )}

          <div className="pointer-events-none absolute left-0 right-0 top-0 h-[360px] bg-[linear-gradient(180deg,rgba(7,9,10,0.18)_0%,rgba(7,9,10,0.02)_48%,rgba(7,9,10,0.38)_100%)] sm:h-[430px] lg:inset-0 lg:h-auto lg:bg-[linear-gradient(90deg,rgba(7,9,10,0.88)_0%,rgba(7,9,10,0.48)_26%,rgba(7,9,10,0.10)_58%,rgba(7,9,10,0.36)_100%),linear-gradient(180deg,rgba(7,9,10,0.38)_0%,rgba(7,9,10,0.06)_42%,rgba(7,9,10,0.72)_100%)]" />

          <div className="pointer-events-none relative z-30 bg-[#090b0c] px-5 py-6 lg:flex lg:min-h-[calc(100vh-92px)] lg:flex-col lg:bg-transparent lg:px-[clamp(24px,3vw,48px)] lg:pb-3 lg:pt-[116px]">
            <div className="flex items-center gap-3 text-[13px] font-medium text-[#d7c8b7]/72">
              <button onClick={onBack} className="pointer-events-auto transition-colors hover:text-[#f4eadc]">
                {tc("home")}
              </button>
              <span className="text-[#806f61]">/</span>
              <button onClick={onBack} className="pointer-events-auto transition-colors hover:text-[#f4eadc]">
                {t("allBuildings")}
              </button>
              <span className="text-[#806f61]">/</span>
              <span className="text-[#f4eadc]">{displayName}</span>
            </div>

            <div className="mt-7 max-w-[330px] lg:mt-10">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-[46px] font-semibold leading-none tracking-normal text-[#fff4e8] md:text-[54px]">
                  {displayName}
                </h2>
                <span className="mt-2 h-2 w-2 rounded-full bg-[#89bf74]" />
                <span className="mt-2 text-[14px] font-medium text-[#dacdbd]">{t("forSale")}</span>
              </div>
              <p className="mt-5 text-[16px] font-medium text-[#e6d6c6]">
                {t("storiesBuilding", { count: building.floors.length })}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 lg:mt-8 lg:block lg:space-y-5">
                {[
                  { icon: Building2, value: building.floors.length, label: t("floors") },
                  { icon: Home, value: totalUnits, label: t("apartments") },
                  { icon: CheckCircle2, value: availableUnits, label: t("available") },
                  { icon: ParkingSquare, value: "24/7", label: t("parking") },
                  { icon: ShieldCheck, value: "✓", label: t("security") },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 lg:gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#f0d7be]/13 bg-[#0d1111]/55 text-[#d4c4b2]">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span>
                        <span className="block text-[18px] font-semibold leading-5 text-[#fff4e8] lg:text-[20px]">{item.value}</span>
                        <span className="mt-1 block text-[13px] font-medium text-[#c9b9a7]">{item.label}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pointer-events-auto mt-7 lg:mt-auto lg:translate-y-4">
              <div className="mb-5 inline-flex h-11 items-center gap-4 rounded-[6px] border border-[#f0d7be]/10 bg-[#0d1111]/74 px-4 text-[13px] font-medium text-[#e8d8c7] backdrop-blur-md">
                <Images className="h-4 w-4" strokeWidth={1.5} />
                <span>{t("buildingPhotos")}</span>
                <span className="text-[#fff4e8]">{galleryImages.length}</span>
              </div>

              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {galleryImages.map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setActiveGalleryIndex(index)}
                      className={`relative h-[108px] overflow-hidden rounded-[6px] border bg-[#101414] text-left ${
                        activeGalleryIndex === index ? "border-[#e4714f]" : "border-[#f0d7be]/10"
                      }`}
                    >
                      <Image
                        src={item.src}
                        alt={item.label}
                        fill
                        className="object-cover opacity-70"
                        sizes="190px"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-8 text-[13px] font-medium text-[#fff4e8]">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[6px] border border-[#f0d7be]/10 bg-[#0d1111]/74 px-4 py-5 text-[13px] font-medium text-[#a79888]">
                  {t("uploadBuildingPhotos")}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="bg-[#0d1011] px-5 pb-6 pt-6 text-[#f4eadc] lg:mt-[104px] lg:h-[calc(100vh-104px)] lg:overflow-y-auto lg:border-l lg:border-t lg:border-[#f0d7be]/10 lg:px-6">
          <h3 className="font-display text-[27px] font-semibold leading-none text-[#fff4e8]">{t("encourageFloor")}</h3>
          <p className="mt-3 text-[13px] leading-5 text-[#b8aa9a]">
            {t("floorPlanSubtitle")}
          </p>

          <div className="mt-4 overflow-hidden rounded-[6px] border border-[#f0d7be]/10">
            {sortedFloors.map((floor, index) => {
              const stats = getFloorStats(floor);
              const isHovered = hoveredFloorId === floor.id;

              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => onFloorSelect?.(floor.id)}
                  onMouseEnter={() => handleFloorHover(floor.id)}
                  onMouseLeave={() => handleFloorHover(null)}
                  className={`building-floor-list-intro flex min-h-[47px] w-full items-center justify-between border-b border-[#f0d7be]/9 px-4 text-left last:border-b-0 ${
                    isHovered
                      ? "bg-[#a94f38] text-[#fff7ee] shadow-[inset_0_0_0_1px_rgba(255,138,95,0.42)]"
                      : "bg-[#0d1011] text-[#e7d8c7] hover:bg-[#151819]"
                  }`}
                  style={{ animationDelay: `${(sortedFloors.length - index - 1) * 90}ms` }}
                >
                  <span>
                    <span className="block text-[15px] font-semibold">{t("floor")} {floor.number}</span>
                    <span className="mt-0.5 block text-[12px] font-medium text-[#bba998]">{t("floorUnitCount", { count: stats.total })}</span>
                  </span>
                  <span className="flex items-center gap-3 text-[12px] font-semibold text-[#a8d995]">
                    {t("floorAvailableCount", { count: stats.available })}
                    <ArrowRight className={`h-4 w-4 shrink-0 transition-colors ${isHovered ? "text-[#f7d2bf]" : "text-[#5a4f46]"}`} strokeWidth={1.6} />
                  </span>
                </button>
              );
            })}
          </div>

          {previewFloor && (
            <div className="mt-4 rounded-[6px] border border-[#f0d7be]/10 bg-[#101414] p-4">
              <h4 className="text-[15px] font-semibold text-[#fff4e8]">{t("floorPlanPreviewTitle", { number: previewFloor.number })}</h4>
              <p className="mt-1.5 text-[12px] font-medium text-[#bba998]">
                {t("floorUnitCount", { count: previewFloorStats.total })} <span className="mx-2 text-[#5c5149]">•</span>
                <span className="text-[#9ed287]">{t("floorAvailableCount", { count: previewFloorStats.available })}</span>
              </p>

              <button
                type="button"
                onClick={() => onFloorSelect?.(previewFloor.id)}
                className="group relative mt-3 block h-[190px] w-full overflow-hidden rounded-[4px] border border-[#f0d7be]/10 bg-[#f2efe7] sm:h-[220px] lg:h-[240px]"
                aria-label={t("viewFloorPlanLabel", { number: previewFloor.number })}
              >
                {previewFloor.floorPlanImage ? (
                  <ImageCoordinateStage
                    src={previewFloor.floorPlanImage}
                    alt={t("floorPlanPreviewTitle", { number: previewFloor.number })}
                    className="absolute inset-0"
                    imageClassName="select-none"
                    sizes="(min-width: 1024px) 360px, calc(100vw - 96px)"
                  >
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {previewFloor.units.map((unit) => {
                        const polygon = unit.polygonData;
                        if (!Array.isArray(polygon) || polygon.length < 3) return null;
                        const style = getUnitStatusStyle(unit.status);

                        return (
                          <path
                            key={unit.id}
                            d={toSvgPath(polygon)}
                            fill={style.fill}
                            stroke={style.stroke}
                            strokeWidth={0.28}
                            vectorEffect="non-scaling-stroke"
                            className="pointer-events-none"
                          />
                        );
                      })}
                    </svg>
                  </ImageCoordinateStage>
                ) : (
                  <div className="grid h-full grid-cols-7 gap-[2px] bg-[#202526] p-2">
                    {Array.from({ length: 21 }).map((_, index) => (
                      <span
                        key={index}
                        className={index % 5 === 0 ? "bg-[#b76147]" : index % 3 === 0 ? "bg-[#b9cba4]" : "bg-[#e8dcc9]"}
                      />
                    ))}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/32">
                  <span className="flex items-center gap-2 rounded-[5px] bg-[#c66348] px-4 py-2 text-[13px] font-semibold text-white opacity-0 shadow-[0_4px_18px_rgba(0,0,0,0.42)] transition-opacity group-hover:opacity-100">
                    Rejani ko&apos;rish <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </div>
              </button>

            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
