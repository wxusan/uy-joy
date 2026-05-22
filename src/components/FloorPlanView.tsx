"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowRight, BedDouble, Building2, CircleCheck, Layers, MessageCircle, Ruler, Send, X } from "lucide-react";
import ImageCoordinateStage from "@/components/ImageCoordinateStage";
import ApartmentLeadModal from "@/components/ApartmentLeadModal";
import { getFullImageUrl, getThumbnailUrl } from "@/lib/cloudinary";
import { collectLeadTracking } from "@/lib/public-lead-client";
import { getStatusMeta } from "@/lib/status-style";

type Point = { x: number; y: number };

interface UnitData {
  id: string;
  unitNumber: string;
  displayNumber: string;
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

interface FloorData {
  id: string;
  number: number;
  basePricePerM2: number | null;
  floorPlanImage: string | null;
  units: UnitData[];
}

interface BuildingData {
  id: string;
  name: string;
  floors: FloorData[];
}

interface Props {
  building: BuildingData;
  selectedFloor: FloorData;
  selectedFloorId: string | null;
  onFloorSelect: (floorId: string) => void;
  onBackToBuilding: () => void;
  onBackToMaster: () => void;
  onUnitClick: (unit: UnitData) => void;
  selectedUnit: (UnitData & { floorNumber: number; basePricePerM2: number | null; buildingName?: string }) | null;
  onUnitClose: () => void;
  telegramUrl?: string | null;
}

const getPathString = (points: Point[]) =>
  points.length >= 3 ? `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z` : "";

const getCenter = (points: Point[]) => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

// formatPrice is defined inside the component to access t()

const getUnitPrice = (unit: UnitData, floor: FloorData) => {
  if (unit.totalPrice) return unit.totalPrice;
  const pricePerM2 = unit.pricePerM2 ?? floor.basePricePerM2;
  return pricePerM2 ? Math.round(pricePerM2 * unit.area) : null;
};

const getBuildingLetter = (name: string) => {
  const stripped = name.replace(/^(block|building)\s*/i, "").trim();
  return stripped.charAt(0).toUpperCase() || name.charAt(0).toUpperCase() || "A";
};

const getBuildingDisplayName = (name: string) => {
  const buildingLetter = getBuildingLetter(name);
  return /^(block|building)\s*/i.test(name) ? `${buildingLetter} Building` : name;
};

const resolveTelegramUrl = (url?: string | null): string | null => {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://t.me/${url.replace(/^@/, "")}`;
};

export default function FloorPlanView({
  building,
  selectedFloor,
  onFloorSelect,
  onBackToBuilding,
  onBackToMaster,
  onUnitClick,
  selectedUnit,
  onUnitClose,
  telegramUrl,
}: Props) {
  const t = useTranslations("explore");
  const tu = useTranslations("unit");
  const tl = useTranslations("legend");
  const tc = useTranslations("contact");
  const ta = useTranslations("apartments");

  const formatPrice = (value: number | null) => {
    if (!value) return ta("priceOnRequest");
    return `${value.toLocaleString("ru-RU")} so'm`;
  };
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [leadUnit, setLeadUnit] = useState<Props["selectedUnit"]>(null);
  const [inlineLeadForm, setInlineLeadForm] = useState({ name: "", phone: "" });
  const [inlineLeadSubmitting, setInlineLeadSubmitting] = useState(false);
  const [inlineLeadSubmitted, setInlineLeadSubmitted] = useState(false);
  const [inlineLeadError, setInlineLeadError] = useState("");
  // Local active floor — updates instantly on row click without waiting for parent re-render
  const [activeFloorId, setActiveFloorId] = useState<string>(selectedFloor.id);
  const selectedPanelRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const sortedFloors = useMemo(() => [...building.floors].sort((a, b) => b.number - a.number), [building.floors]);
  // Sync local state when parent changes the floor (URL navigation, back button, etc.)
  const activeFloor = useMemo(
    () => building.floors.find((f) => f.id === activeFloorId) ?? selectedFloor,
    [activeFloorId, building.floors, selectedFloor]
  );
  const polygonUnits = activeFloor.units.filter((unit) => Array.isArray(unit.polygonData) && unit.polygonData.length >= 3);
  const selectedFloorStats = {
    total: activeFloor.units.length,
    available: activeFloor.units.filter((unit) => unit.status === "available").length,
  };
  const selectedUnitId = selectedUnit?.id;

  const getFloorStats = (floor: FloorData) => ({
    total: floor.units.length,
    available: floor.units.filter((unit) => unit.status === "available").length,
  });

  const selectedPhotos = selectedUnit
    ? [selectedUnit.sketchImage, selectedUnit.sketchImage2, selectedUnit.sketchImage3, selectedUnit.sketchImage4].filter(Boolean) as string[]
    : [];
  const selectedStatus = selectedUnit ? getStatusMeta(selectedUnit.status, true) : null;
  const selectedUnitPrice = selectedUnit ? getUnitPrice(selectedUnit, activeFloor) : null;
  const selectedPricePerM2 = selectedUnit ? selectedUnit.pricePerM2 ?? activeFloor.basePricePerM2 : null;
  const displayBuildingName = getBuildingDisplayName(building.name);
  const resolvedTelegramUrl = resolveTelegramUrl(telegramUrl);
  const modalUnits = useMemo(
    () =>
      building.floors.flatMap((floor) =>
        floor.units.map((unit) => ({
          id: unit.id,
          unitNumber: unit.unitNumber,
          displayNumber: unit.displayNumber,
          rooms: unit.rooms,
          area: unit.area,
          status: unit.status,
          pricePerM2: unit.pricePerM2,
          totalPrice: unit.totalPrice,
          floorNumber: floor.number,
          basePricePerM2: floor.basePricePerM2,
          buildingName: building.name,
          sketchImage: unit.sketchImage,
          sketchImage2: unit.sketchImage2,
          sketchImage3: unit.sketchImage3,
          sketchImage4: unit.sketchImage4,
        }))
      ),
    [building.floors, building.name]
  );

  useEffect(() => {
    setLeadUnit(null);
    setInlineLeadForm({ name: "", phone: "" });
    setInlineLeadSubmitted(false);
    setInlineLeadError("");
  }, [selectedUnitId]);

  useEffect(() => {
    if (!selectedUnitId) return;

    const frame = window.requestAnimationFrame(() => {
      if (window.innerWidth < 1280) {
        selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedUnitId]);

  // Keep local floor in sync if parent changes it (URL nav / back button)
  useEffect(() => {
    setActiveFloorId(selectedFloor.id);
  }, [selectedFloor.id]);

  // Scroll the floor-plan section into view on mobile whenever the active floor changes
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.innerWidth < 1280) {
        mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeFloorId]);

  const handleInlineLeadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUnit || !inlineLeadForm.name.trim() || !inlineLeadForm.phone.trim()) return;

    setInlineLeadSubmitting(true);
    setInlineLeadError("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inlineLeadForm.name,
          phone: inlineLeadForm.phone,
          unitId: selectedUnit.id,
          unitNumber: selectedUnit.displayNumber,
          projectName: `${building.name} - ${activeFloor.number}-qavat`,
          ...collectLeadTracking(selectedUnit.status === "available" ? "interactive-floor" : "waitlist"),
        }),
      });

      if (!response.ok) {
        setInlineLeadError(tc("error"));
        return;
      }

      setInlineLeadSubmitted(true);
      setInlineLeadForm({ name: "", phone: "" });
    } catch {
      setInlineLeadError(tc("error"));
    } finally {
      setInlineLeadSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0c] text-[#f4eadc]">
      <div className="grid min-h-screen xl:grid-cols-[300px_minmax(0,1fr)_300px] 2xl:grid-cols-[330px_minmax(0,1fr)_330px]">
        <main ref={mainRef} className="min-w-0 px-[clamp(20px,2.4vw,46px)] pb-28 pt-20 xl:order-2 xl:border-l xl:border-r xl:border-[#f0d7be]/10 xl:pb-7 xl:pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-[#d7c8b7]/72">
                <button onClick={onBackToMaster} className="transition-colors hover:text-[#f4eadc]">
                  {tc("home")}
                </button>
                <span className="text-[#806f61]">/</span>
                <button onClick={onBackToMaster} className="transition-colors hover:text-[#f4eadc]">
                  {t("allBuildings")}
                </button>
                <span className="text-[#806f61]">/</span>
                <button onClick={onBackToBuilding} className="transition-colors hover:text-[#f4eadc]">
                  {displayBuildingName}
                </button>
                <span className="text-[#806f61]">/</span>
                <span className="text-[#f4eadc]">{t("floor")} {activeFloor.number}</span>
              </div>
              <h1 className="mt-6 font-display text-[34px] font-semibold leading-none text-[#fff4e8]">
                {t("floor")} {activeFloor.number}
              </h1>
              <p className="mt-3 text-[14px] font-medium text-[#b8aa9a]">
                {t("floorUnitCount", { count: selectedFloorStats.total })}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] font-medium text-[#b8aa9a]">
            {[
              { color: "#9fd287", label: tl("available") },
              { color: "#d8ac67", label: tl("reserved") },
              { color: "#d86b4c", label: tl("sold") },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-4 rounded-[2px]" style={{ backgroundColor: item.color, opacity: 0.72 }} />
                {item.label}
              </span>
            ))}
          </div>

          <section className="mt-6 rounded-[8px] border border-[#f0d7be]/10 bg-[#101414] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
            {activeFloor.floorPlanImage ? (
              <ImageCoordinateStage
                src={activeFloor.floorPlanImage}
                alt={`${t("floor")} ${activeFloor.number}`}
                sizes="(min-width: 1536px) calc(100vw - 820px), (min-width: 1280px) calc(100vw - 720px), (min-width: 1024px) calc(100vw - 420px), 100vw"
                className="relative h-[min(56vh,600px)] min-h-[390px] overflow-hidden rounded-[5px] bg-[#efeae0] 2xl:h-[min(62vh,640px)] 2xl:min-h-[420px]"
                imageClassName="select-none"
              >
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {polygonUnits.map((unit) => {
                    const points = unit.polygonData ?? [];
                    const active = hoveredUnitId === unit.id || selectedUnit?.id === unit.id;
                    const center = getCenter(points);
                    const meta = getStatusMeta(unit.status, active);
                    const displayNumber = unit.displayNumber;

                    return (
                      <g key={unit.id}>
                        <path
                          d={getPathString(points)}
                          fill={meta.fillColor}
                          stroke={active ? "#ff8a5f" : meta.strokeColor}
                          strokeWidth={active ? 0.52 : 0.28}
                          vectorEffect="non-scaling-stroke"
                          className="cursor-pointer transition-colors"
                          onMouseEnter={() => setHoveredUnitId(unit.id)}
                          onMouseLeave={() => setHoveredUnitId(null)}
                          onClick={() => onUnitClick(unit)}
                        />
                        <text
                          x={center.x}
                          y={center.y - 1.6}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="2.8"
                          fontWeight="700"
                          fill="#fff4e8"
                          className="pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
                        >
                          {displayNumber}
                        </text>
                        <text
                          x={center.x}
                          y={center.y + 2.1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="1.55"
                          fontWeight="600"
                          fill="#f0dfca"
                          className="pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
                        >
                          {unit.area} m² · {unit.rooms} {t("room")}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </ImageCoordinateStage>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-[5px] bg-[#151819] text-[14px] font-medium text-[#8d7f70]">
                {tc("planNotUploaded")}
              </div>
            )}
          </section>

          <div className="mt-5 overflow-x-auto pb-2 [scrollbar-width:thin]">
            <div className="flex w-max max-w-full gap-3">
            {activeFloor.units.map((unit) => {
              const meta = getStatusMeta(unit.status, hoveredUnitId === unit.id || selectedUnit?.id === unit.id);
              const displayNumber = unit.displayNumber;
              const image = unit.sketchImage || unit.sketchImage2 || unit.sketchImage3 || unit.sketchImage4;

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => onUnitClick(unit)}
                  onMouseEnter={() => setHoveredUnitId(unit.id)}
                  onMouseLeave={() => setHoveredUnitId(null)}
                  className={`flex min-h-[92px] w-[250px] shrink-0 items-center justify-between gap-3 rounded-[6px] border px-4 py-3 text-left transition sm:w-[270px] ${meta.cardClass} hover:border-[#ff8a5f]`}
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-[#fff4e8]">{displayNumber}</span>
                    <span className="mt-2 block text-[12px] font-medium text-[#ead8c5]">
                      {unit.area} m² · {unit.rooms} {t("room")}
                    </span>
                    <span className="mt-1 block text-[12px] font-semibold text-[#fff4e8]">
                      {formatPrice(getUnitPrice(unit, selectedFloor))}
                    </span>
                  </span>
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[4px] border border-[#f0d7be]/10 bg-[#efeae0]">
                    {image ? (
                      <Image src={getThumbnailUrl(image, 96)} alt={displayNumber} fill className="object-contain p-1" sizes="64px" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-[11px] font-medium text-[#6f6256]">
                        {t("plan")}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            </div>
          </div>
        </main>

        <aside className="bg-[#0d1011] px-5 pb-6 pt-7 text-[#f4eadc] xl:order-1 xl:px-5">
          {selectedUnit && selectedStatus ? (
            <div ref={selectedPanelRef} className="rounded-[8px] border border-[#f0d7be]/10 bg-[#151819] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[13px] font-medium text-[#d7c8b7]">{tc("selectedApartment")}</p>
                <button
                  type="button"
                  onClick={onUnitClose}
                  className="grid h-8 w-8 place-items-center rounded-full text-[#d7c8b7] transition hover:bg-white/5 hover:text-white"
                  aria-label={t("closeDetails")}
                >
                  <X className="h-5 w-5" strokeWidth={1.6} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <h2 className="font-display text-[42px] font-semibold leading-none text-[#fff4e8]">
                  {selectedUnit.displayNumber}
                </h2>
                <span className="rounded-full bg-[#23402d] px-3 py-1 text-[12px] font-semibold text-[#a8d995]">
                  {selectedStatus.label}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 text-center text-[12px] font-medium text-[#d7c8b7]">
                {[
                  { icon: Layers, value: `${t("floor")} ${activeFloor.number}` },
                  { icon: Ruler, value: `${selectedUnit.area} m²` },
                  { icon: BedDouble, value: `${selectedUnit.rooms} ${t("room")}` },
                  { icon: Building2, value: building.name },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <span key={item.value} className="min-w-0">
                      <Icon className="mx-auto mb-2 h-5 w-5 text-[#bcae9d]" strokeWidth={1.5} />
                      <span className="block truncate">{item.value}</span>
                    </span>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[6px] border border-[#f0d7be]/10">
                <div className="border-r border-[#f0d7be]/10 p-3">
                  <p className="text-[12px] font-medium text-[#8f8172]">{tu("totalPrice")}</p>
                  <p className="mt-2 text-[17px] font-semibold text-[#fff4e8]">{formatPrice(selectedUnitPrice)}</p>
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-medium text-[#8f8172]">{tu("pricePerM2")}</p>
                  <p className="mt-2 text-[14px] font-semibold text-[#d7c8b7]">{formatPrice(selectedPricePerM2)}</p>
                </div>
              </div>

              <div className="mt-6">
                {inlineLeadSubmitted ? (
                  <div className="rounded-[6px] border border-[#9fd287]/25 bg-[#9fd287]/10 p-4 text-center">
                    <CircleCheck className="mx-auto h-8 w-8 text-[#9fd287]" strokeWidth={1.7} />
                    <p className="mt-3 text-[15px] font-semibold text-[#fff4e8]">{tc("thankYouSent")}</p>
                    <p className="mt-1 text-[12px] font-medium text-[#b8aa9a]">{tc("weWillContactSoon")}</p>
                  </div>
                ) : (
                  <form onSubmit={handleInlineLeadSubmit} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={inlineLeadForm.name}
                      onChange={(event) => setInlineLeadForm({ ...inlineLeadForm, name: event.target.value })}
                      className="h-11 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                      placeholder={tc("namePlaceholder")}
                      autoComplete="name"
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={inlineLeadForm.phone}
                      onChange={(event) => setInlineLeadForm({ ...inlineLeadForm, phone: event.target.value })}
                      className="h-11 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                      placeholder="+998 XX XXX XX XX"
                      autoComplete="tel"
                    />
                    {inlineLeadError && <p className="text-[12px] font-semibold text-[#ff9f8f]">{inlineLeadError}</p>}
                    <button
                      type="submit"
                      disabled={inlineLeadSubmitting}
                      className="h-11 w-full rounded-[6px] bg-[#c66348] text-[14px] font-semibold text-white transition hover:bg-[#d37152] disabled:opacity-60"
                    >
                      {inlineLeadSubmitting
                        ? tc("submitting")
                        : selectedUnit.status === "available"
                          ? tc("bookApartment")
                          : tc("notify")}
                    </button>
                    <p className="text-[11px] font-semibold leading-5 text-[#cdbdac]">
                      {tc("responseSLA")}
                    </p>
                    {resolvedTelegramUrl && (
                      <a
                        href={resolvedTelegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-[#c66348]/55 text-[14px] font-semibold text-[#f4eadc] transition hover:bg-[#c66348]/10"
                      >
                        <MessageCircle className="h-4 w-4 text-[#c66348]" strokeWidth={1.7} />
                        {tc("askQuestion")}
                      </a>
                    )}
                  </form>
                )}
              </div>

              <div className="mt-5 space-y-3 text-[13px]">
                {[
                  [tu("rooms"), `${selectedUnit.rooms} ${t("room")}`],
                  [tu("area"), `${selectedUnit.area} m²`],
                  [tu("floor"), `${activeFloor.number} / ${sortedFloors.length}`],
                  [tu("status"), selectedStatus.label],
                  [tc("quantity"), tc("oneUnit")],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-[#8f8172]">{label}</span>
                    <span className="font-semibold text-[#f4eadc]">{value}</span>
                  </div>
                ))}
              </div>

              {selectedPhotos.length > 0 && (
                <div className="mt-5 space-y-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] border border-[#f0d7be]/10 bg-[#efeae0]">
                    <Image src={getFullImageUrl(selectedPhotos[0])} alt="Apartment image" fill className="object-contain p-2" sizes="330px" />
                  </div>
                  {selectedPhotos.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedPhotos.slice(1, 4).map((photo, index) => (
                        <span key={photo} className="relative aspect-[4/3] overflow-hidden rounded-[5px] border border-[#f0d7be]/10 bg-[#efeae0]">
                          <Image src={getThumbnailUrl(photo, 96)} alt={`Apartment image ${index + 2}`} fill className="object-contain p-1" sizes="96px" />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="hidden xl:block" aria-hidden="true" />
          )}
        </aside>

        <aside className="bg-[#0d1011] px-5 pb-6 pt-7 text-[#f4eadc] lg:border-l lg:border-[#f0d7be]/10 lg:px-6 xl:order-3">
          <h2 className="font-display text-[27px] font-semibold leading-none text-[#fff4e8]">{t("encourageFloor")}</h2>
          <p className="mt-3 text-[13px] leading-5 text-[#b8aa9a]">
            {t("floorPlanSubtitle")}
          </p>

          <div className="mt-5 overflow-hidden rounded-[6px] border border-[#f0d7be]/10">
            {sortedFloors.map((floor) => {
              const stats = getFloorStats(floor);
              const isSelected = activeFloorId === floor.id;

              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => { setActiveFloorId(floor.id); onFloorSelect(floor.id); }}
                  className={`flex min-h-[52px] w-full items-center justify-between border-b border-[#f0d7be]/9 px-4 text-left last:border-b-0 ${
                    isSelected
                      ? "bg-[#a94f38] text-[#fff7ee] shadow-[inset_0_0_0_1px_rgba(255,138,95,0.42)]"
                      : "bg-[#0d1011] text-[#e7d8c7] hover:bg-[#151819]"
                  }`}
                >
                  <span>
                    <span className="block text-[15px] font-semibold">{t("floor")} {floor.number}</span>
                    <span className="mt-0.5 block text-[12px] font-medium text-[#bba998]">{t("floorUnitCount", { count: stats.total })}</span>
                  </span>
                  <span className="flex items-center gap-3 text-[12px] font-semibold text-[#a8d995]">
                    {t("floorAvailableCount", { count: stats.available })}
                    <ArrowRight className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? "text-[#f7d2bf]" : "text-[#5a4f46]"}`} strokeWidth={1.6} />
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
      {leadUnit && (
        <ApartmentLeadModal
          source="interactive-floor"
          onClose={() => setLeadUnit(null)}
          allUnits={modalUnits}
          telegramUrl={telegramUrl}
          unit={{
            id: leadUnit.id,
            unitNumber: leadUnit.unitNumber,
            displayNumber: leadUnit.displayNumber,
            rooms: leadUnit.rooms,
            area: leadUnit.area,
            status: leadUnit.status,
            pricePerM2: leadUnit.pricePerM2,
            totalPrice: leadUnit.totalPrice,
            floorNumber: leadUnit.floorNumber,
            basePricePerM2: leadUnit.basePricePerM2,
            buildingName: leadUnit.buildingName || building.name,
            sketchImage: leadUnit.sketchImage,
            sketchImage2: leadUnit.sketchImage2,
            sketchImage3: leadUnit.sketchImage3,
            sketchImage4: leadUnit.sketchImage4,
          }}
        />
      )}
      {selectedUnit && !leadUnit && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#f0d7be]/12 bg-[#101414]/96 px-4 py-3 text-[#f4eadc] shadow-[0_-18px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl xl:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[27px] font-semibold leading-none text-[#fff4e8]">
                {selectedUnit.displayNumber}
              </p>
              <p className="mt-1 truncate text-[12px] font-medium text-[#b8aa9a]">
                {selectedUnit.area} m² · {formatPrice(selectedUnitPrice)}
              </p>
            </div>
            {resolvedTelegramUrl && (
              <a
                href={resolvedTelegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] border border-[#c66348]/45 text-[#f0a383] transition hover:bg-[#c66348]/10"
              >
                <Send className="h-5 w-5" strokeWidth={1.7} />
              </a>
            )}
            <button
              type="button"
              onClick={() => setLeadUnit(selectedUnit)}
              className="h-11 shrink-0 rounded-[6px] bg-[#c66348] px-5 text-[14px] font-semibold text-white transition hover:bg-[#d37152]"
            >
              {tc("bookApartment")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
