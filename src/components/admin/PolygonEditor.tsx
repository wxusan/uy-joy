"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ImageCoordinateStage from "@/components/ImageCoordinateStage";

export interface Point {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
}

export interface Polygon {
  id: string;
  points: Point[];
  unitId?: string;
  color?: string;
  label?: string;
}

interface Props {
  imageUrl: string | null;
  polygons: Polygon[];
  selectedId: string | null;
  onPolygonCreate: (points: Point[]) => void;
  onPolygonUpdate: (id: string, points: Point[]) => void;
  onPolygonSelect: (id: string | null) => void;
  onPolygonDelete: (id: string) => void;
}

const distanceBetween = (a: Point, b: Point) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const getPathString = (points: Point[], close = true) => {
  if (points.length < 2) return "";
  return `${points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}${close ? " Z" : ""}`;
};

export default function PolygonEditor({
  imageUrl,
  polygons,
  selectedId,
  onPolygonCreate,
  onPolygonUpdate,
  onPolygonSelect,
  onPolygonDelete,
}: Props) {
  const ta = useTranslations("admin");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [draggedVertex, setDraggedVertex] = useState<{ polygonId: string; vertexIndex: number } | null>(null);

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(false);
  };

  const undoLastPoint = () => {
    const nextPoints = currentPoints.slice(0, -1);
    setCurrentPoints(nextPoints);
    if (nextPoints.length === 0) setIsDrawing(false);
  };

  const handleCanvasClick = (point: Point) => {
    if (draggedVertex) return;

    if (!isDrawing) {
      setIsDrawing(true);
      setCurrentPoints([point]);
      onPolygonSelect(null);
      return;
    }

    const firstPoint = currentPoints[0];
    if (currentPoints.length >= 3 && distanceBetween(point, firstPoint) < 3) {
      onPolygonCreate(currentPoints);
      cancelDrawing();
      return;
    }

    setCurrentPoints((points) => [...points, point]);
  };

  const handleMouseMove = (point: Point) => {
    if (!draggedVertex) return;

    const polygon = polygons.find((p) => p.id === draggedVertex.polygonId);
    if (!polygon) return;

    const nextPoints = [...polygon.points];
    nextPoints[draggedVertex.vertexIndex] = point;
    onPolygonUpdate(draggedVertex.polygonId, nextPoints);
  };

  const handleMouseUp = () => {
    setDraggedVertex(null);
  };

  const handleVertexMouseDown = (e: React.MouseEvent, polygonId: string, vertexIndex: number) => {
    e.stopPropagation();
    setDraggedVertex({ polygonId, vertexIndex });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDrawing) cancelDrawing();
        else onPolygonSelect(null);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        const isTyping =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT" ||
            (active as HTMLElement).isContentEditable);

        if (!isTyping && selectedId && !isDrawing) onPolygonDelete(selectedId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawing, selectedId, onPolygonSelect, onPolygonDelete]);

  if (!imageUrl) {
    return (
      <div className="flex h-[min(74vh,780px)] min-h-[560px] w-full items-center justify-center rounded-[8px] border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500">
        {ta("uploadFloorPlanToDraw")}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2">
        <p className="rounded-[5px] bg-white/85 px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-sm ring-1 ring-neutral-200 backdrop-blur">
          {isDrawing ? ta("drawingPoints", { count: currentPoints.length }) : ta("clickToDrawHint")}
        </p>

        {isDrawing && (
          <>
            <button
              type="button"
              onClick={undoLastPoint}
              className="rounded-[5px] bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-800 shadow-sm ring-1 ring-neutral-200 transition hover:bg-white"
            >
              {ta("removeLastPoint")}
            </button>
            <button
              type="button"
              onClick={cancelDrawing}
              className="rounded-[5px] bg-black px-2 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-neutral-800"
            >
              {ta("clearPoints")}
            </button>
          </>
        )}
      </div>

      <ImageCoordinateStage
        src={imageUrl}
        alt="Floor plan"
        className="relative h-[min(74vh,780px)] min-h-[560px] w-full cursor-crosshair overflow-hidden rounded-[8px] bg-neutral-100"
        imageClassName="select-none"
        sizes="(min-width: 1280px) calc(100vw - 430px), 100vw"
        onPointClick={handleCanvasClick}
        onPointMouseMove={handleMouseMove}
        onStageMouseUp={handleMouseUp}
        onStageMouseLeave={handleMouseUp}
        precisionCursor
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ pointerEvents: "none" }}
        >
          {polygons.map((polygon) => {
            const isSelected = polygon.id === selectedId;
            const cx = polygon.points.reduce((sum, point) => sum + point.x, 0) / polygon.points.length;
            const cy = polygon.points.reduce((sum, point) => sum + point.y, 0) / polygon.points.length;

            return (
              <g key={polygon.id}>
                <path
                  d={getPathString(polygon.points)}
                  className={isSelected ? "fill-black/10 stroke-black" : "fill-black/[0.04] stroke-black/50"}
                  strokeWidth={isSelected ? 0.34 : 0.22}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "all", cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPolygonSelect(polygon.id);
                  }}
                />

                {isSelected &&
                  polygon.points.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r={0.42}
                      className="fill-white stroke-black"
                      strokeWidth={0.14}
                      vectorEffect="non-scaling-stroke"
                      style={{ pointerEvents: "all", cursor: "move" }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => handleVertexMouseDown(e, polygon.id, i)}
                    />
                  ))}

                {polygon.points.length > 0 && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="2.45"
                    fontWeight="700"
                    fill="#111111"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: "none" }}
                  >
                    {polygon.label || ""}
                  </text>
                )}
              </g>
            );
          })}

          {currentPoints.length > 0 && (
            <g>
              <path
                d={getPathString(currentPoints, false)}
                fill="none"
                className="stroke-black"
                strokeWidth={0.28}
                strokeDasharray="1.4,1"
                vectorEffect="non-scaling-stroke"
              />
              {currentPoints.map((point, i) => (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={i === 0 ? 0.5 : 0.34}
                  className="fill-white stroke-black"
                  strokeWidth={0.14}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}
        </svg>
      </ImageCoordinateStage>
    </div>
  );
}
