"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ImageCoordinateStage, { ImagePoint } from "@/components/ImageCoordinateStage";

type Point = ImagePoint;
type FloorPositionData = { yStart?: number; yEnd?: number; polygon?: Point[]; label?: Point | null };
type FloorPositionValue = FloorPositionData | string | null;

interface Floor {
  id: string;
  number: number;
  positionData: FloorPositionValue;
}

interface Props {
  buildingImage: string;
  floors: Floor[];
  onSave: (floorPositions: { floorId: string; positionData: FloorPositionData }[]) => void;
  onCancel: () => void;
}

interface FloorPosition {
  floorId: string;
  floorNumber: number;
  polygon: Point[];
  label: Point | null;
}

const toSvgPoints = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(" ");

const parsePositionData = (positionData: FloorPositionValue): FloorPositionData | null => {
  if (!positionData) return null;
  if (typeof positionData !== "string") return positionData;

  try {
    return JSON.parse(positionData) as FloorPositionData;
  } catch {
    return null;
  }
};

const normalizePosition = (positionValue: FloorPositionValue): Point[] => {
  const positionData = parsePositionData(positionValue);

  if (positionData?.polygon && positionData.polygon.length > 0) return positionData.polygon;

  if (
    typeof positionData?.yStart === "number" &&
    typeof positionData?.yEnd === "number" &&
    positionData.yEnd > positionData.yStart
  ) {
    return [
      { x: 0, y: positionData.yStart },
      { x: 100, y: positionData.yStart },
      { x: 100, y: positionData.yEnd },
      { x: 0, y: positionData.yEnd },
    ];
  }

  return [];
};

const normalizeLabel = (positionValue: FloorPositionValue): Point | null => {
  const positionData = parsePositionData(positionValue);
  return positionData?.label && typeof positionData.label.x === "number" && typeof positionData.label.y === "number"
    ? positionData.label
    : null;
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

    if (x >= minX && x <= maxX && point.x !== nextPoint.x) {
      const progress = (x - point.x) / (nextPoint.x - point.x);
      intersections.push(point.y + progress * (nextPoint.y - point.y));
    }
  });

  if (intersections.length < 2) return null;

  intersections.sort((a, b) => a - b);
  return (intersections[0] + intersections[intersections.length - 1]) / 2;
};

const getAlignedLabel = (points: Point[], labelX: number): Point | null => {
  if (points.length < 3) return null;

  const center = getPolygonCenter(points);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const safeX = Math.min(Math.max(labelX, minX + 1.5), maxX - 1.5);
  const y = getPolygonYAtX(points, safeX);

  return {
    x: y === null ? center.x : safeX,
    y: y ?? center.y,
  };
};

export default function FloorPositionEditor({ buildingImage, floors, onSave, onCancel }: Props) {
  const tc = useTranslations("common");
  const ta = useTranslations("admin");
  const [positions, setPositions] = useState<FloorPosition[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<string | null>(null);
  const [mode, setMode] = useState<"polygon" | "label">("polygon");

  useEffect(() => {
    const initialPositions = floors.map((floor) => ({
      floorId: floor.id,
      floorNumber: floor.number,
      polygon: normalizePosition(floor.positionData),
      label: normalizeLabel(floor.positionData),
    }));

    setPositions(initialPositions);
    setSelectedFloor(initialPositions[0]?.floorId ?? null);
  }, [floors]);

  const selectedPosition = positions.find((position) => position.floorId === selectedFloor) ?? null;

  const updateSelectedPolygon = (updater: (points: Point[]) => Point[]) => {
    if (!selectedFloor) return;
    setPositions((prev) =>
      prev.map((position) =>
        position.floorId === selectedFloor
          ? { ...position, polygon: updater(position.polygon) }
          : position
      )
    );
  };

  const handleImageClick = (point: Point) => {
    if (mode === "label") {
      setPositions((prev) =>
        prev.map((position) => ({
          ...position,
          label: getAlignedLabel(position.polygon, point.x),
        }))
      );
      return;
    }

    if (!selectedFloor) return;

    updateSelectedPolygon((points) => [...points, point]);
  };

  const handleUndoPoint = () => {
    updateSelectedPolygon((points) => points.slice(0, -1));
  };

  const handleClearFloor = () => {
    setPositions((prev) =>
      prev.map((position) =>
        position.floorId === selectedFloor ? { ...position, polygon: [], label: null } : position
      )
    );
  };

  const handleAutoDistribute = () => {
    const sortedFloors = [...floors].sort((a, b) => b.number - a.number);
    const totalFloors = Math.max(1, sortedFloors.length);
    const floorHeight = 85 / totalFloors;

    setPositions(
      sortedFloors.map((floor, index) => {
        const yStart = 10 + index * floorHeight;
        const yEnd = 10 + (index + 1) * floorHeight - 1;

        return {
          floorId: floor.id,
          floorNumber: floor.number,
          label: null,
          polygon: [
            { x: 0, y: yStart },
            { x: 100, y: yStart },
            { x: 100, y: yEnd },
            { x: 0, y: yEnd },
          ],
        };
      })
    );
  };

  const handleSave = () => {
    onSave(
      positions.map((position) => ({
        floorId: position.floorId,
        positionData: { polygon: position.polygon, label: position.label },
      }))
    );
  };

  const sortedPositions = [...positions].sort((a, b) => b.floorNumber - a.floorNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-[2px]">
      <div className="flex h-[min(900px,92vh)] w-[min(1480px,94vw)] flex-col overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_28px_90px_rgba(0,0,0,0.22)]">
        <div className="flex min-h-[74px] items-center justify-between gap-4 border-b border-neutral-200 bg-white px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-neutral-950" />
              <h2 className="text-[18px] font-semibold leading-6 text-neutral-950">{ta("editFloorPositions")}</h2>
            </div>
            <p className="mt-1 text-[13px] text-neutral-500">
              {ta("floorPositionSubtitle")}
            </p>
          </div>
          <div className="flex shrink-0 justify-end gap-2">
            <button
              onClick={handleAutoDistribute}
              className="h-9 rounded-[6px] border border-neutral-200 bg-white px-4 text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50 active:bg-neutral-100"
            >
              {ta("autoDistribute")}
            </button>
            <button
              onClick={onCancel}
              className="h-9 rounded-[6px] border border-neutral-200 bg-white px-4 text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50 active:bg-neutral-100"
            >
              {tc("cancel")}
            </button>
            <button
              onClick={handleSave}
              className="h-9 rounded-[6px] bg-neutral-950 px-5 text-[13px] font-medium text-white transition hover:bg-neutral-800 active:bg-black"
            >
              {tc("save")}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-[#fbfbfa] p-4">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="min-h-0 rounded-[8px] border border-neutral-200 bg-white p-3 shadow-sm">
              <ImageCoordinateStage
                src={buildingImage}
                alt="Building"
                sizes="760px"
                className="relative mx-auto h-full min-h-[420px] w-full overflow-hidden rounded-[6px] bg-neutral-100 select-none"
                onPointClick={handleImageClick}
                precisionCursor
              >
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {sortedPositions.map((position) => {
                    const isSelected = selectedFloor === position.floorId;
                    const isHovered = hoveredFloor === position.floorId;
                    if (position.polygon.length < 2) return null;

                    return position.polygon.length >= 3 ? (
                      <polygon
                        key={position.floorId}
                        points={toSvgPoints(position.polygon)}
                        className={
                          isSelected
                            ? "fill-black/10 stroke-black"
                            : isHovered
                            ? "fill-black/[0.06] stroke-black"
                            : "fill-transparent stroke-black/35"
                        }
                        strokeWidth={isSelected ? 0.34 : 0.22}
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : (
                      <polyline
                        key={position.floorId}
                        points={toSvgPoints(position.polygon)}
                        fill="none"
                        className={isSelected ? "stroke-black" : "stroke-black/35"}
                        strokeWidth={0.34}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}

                </svg>
                {sortedPositions.map((position) => {
                  if (!position.label) return null;
                  const isSelected = selectedFloor === position.floorId;

                  return (
                    <button
                      key={`${position.floorId}-label`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedFloor(position.floorId);
                        setMode("label");
                      }}
                      className={`pointer-events-auto absolute grid h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[5px] px-2 text-[13px] font-semibold shadow-sm ${
                        isSelected
                          ? "bg-neutral-950 text-white"
                          : "border border-neutral-200 bg-white/90 text-neutral-950"
                      }`}
                      style={{ left: `${position.label.x}%`, top: `${position.label.y}%` }}
                    >
                      {position.floorNumber}
                    </button>
                  );
                })}
                <div className="pointer-events-none absolute left-4 top-4 rounded-[6px] border border-neutral-200 bg-white/95 px-3 py-2 text-[12px] font-medium text-neutral-950 shadow-sm backdrop-blur">
                  {selectedPosition
                    ? `${ta("floor")} ${selectedPosition.floorNumber}: ${mode === "label" ? ta("setLabelModeHint") : ta("floorPoints", { count: selectedPosition.polygon.length })}`
                    : ta("selectFloorHint")}
                </div>
              </ImageCoordinateStage>
            </div>

            <aside className="flex min-h-0 flex-col rounded-[8px] border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="border-b border-neutral-200 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Editor</p>
                <h3 className="mt-1 text-[17px] font-semibold text-neutral-950">{ta("floors")}</h3>
                <p className="mt-1.5 text-[13px] leading-5 text-neutral-500">
                  {ta("floorPositionInstructions")}
                </p>

                <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    onClick={() => setMode(mode === "polygon" ? "label" : "polygon")}
                    disabled={!selectedPosition}
                    className={`col-span-2 h-10 rounded-[6px] border px-3 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      mode === "label"
                        ? "border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800"
                        : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                    }`}
                  >
                    {mode === "label" ? ta("backToPolygon") : ta("setLabelLine")}
                  </button>
                  <button
                    type="button"
                    onClick={handleUndoPoint}
                    disabled={!selectedPosition?.polygon.length}
                    className="h-10 rounded-[6px] border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {ta("removeLastPoint")}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearFloor}
                    disabled={!selectedPosition?.polygon.length}
                    className="h-10 rounded-[6px] border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {ta("clearPoints")}
                  </button>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
                {sortedPositions.map((position) => {
                  const isSelected = selectedFloor === position.floorId;
                  const isComplete = position.polygon.length >= 3;

                  return (
                    <button
                      key={position.floorId}
                      type="button"
                      onClick={() => setSelectedFloor(position.floorId)}
                      onMouseEnter={() => setHoveredFloor(position.floorId)}
                      onMouseLeave={() => setHoveredFloor(null)}
                      className={`flex h-[48px] w-full items-center justify-between rounded-[6px] border px-3 text-left transition ${
                        isSelected
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="text-[14px] font-semibold">{ta("floor")} {position.floorNumber}</span>
                      <span className={`text-xs ${isSelected ? "text-white/70" : isComplete ? "text-neutral-950" : "text-neutral-400"}`}>
                        {isComplete ? ta("floorPoints", { count: position.polygon.length }) : ta("notMapped")}
                        {position.label ? ta("hasLabel") : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedPosition && (
                <div className="mt-4 rounded-[7px] border border-neutral-200 bg-neutral-50 p-3 text-[13px] text-neutral-700">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-neutral-950">{ta("selectedFloorLabel", { number: selectedPosition.floorNumber })}</strong>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] text-neutral-500 ring-1 ring-neutral-200">
                      {ta("floorPoints", { count: selectedPosition.polygon.length })}
                    </span>
                  </div>
                  <p className="mt-2 leading-5 text-neutral-500">
                    {ta("afterDrawingHint")}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
