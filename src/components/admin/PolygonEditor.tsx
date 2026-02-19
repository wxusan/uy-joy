"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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

export default function PolygonEditor({
  imageUrl,
  polygons,
  selectedId,
  onPolygonCreate,
  onPolygonUpdate,
  onPolygonSelect,
  onPolygonDelete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [draggedVertex, setDraggedVertex] = useState<{ polygonId: string; vertexIndex: number } | null>(null);

  // Convert pixel coordinates to percentage (0-100) using live bounding rect
  const toPercent = useCallback((px: number, total: number) => (px / total) * 100, []);

  // Get mouse position relative to container as percentage
  const getMousePercent = useCallback(
    (e: React.MouseEvent): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = toPercent(e.clientX - rect.left, rect.width);
      const y = toPercent(e.clientY - rect.top, rect.height);
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    },
    [toPercent]
  );

  // Handle click on canvas
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (draggedVertex) return; // Don't create points while dragging

    const target = e.target as HTMLElement;
    // If clicking on a polygon, select it
    if (target.dataset.polygonId) {
      onPolygonSelect(target.dataset.polygonId);
      return;
    }

    // If not in drawing mode and clicking on empty space, start drawing
    if (!isDrawing) {
      setIsDrawing(true);
      setCurrentPoints([getMousePercent(e)]);
      onPolygonSelect(null);
    } else {
      // Add point to current polygon
      const newPoint = getMousePercent(e);
      const firstPoint = currentPoints[0];

      // If clicking near the first point, close the polygon
      const distance = Math.sqrt(
        Math.pow(newPoint.x - firstPoint.x, 2) + Math.pow(newPoint.y - firstPoint.y, 2)
      );

      if (currentPoints.length >= 3 && distance < 3) {
        // Close polygon (minimum 3 points)
        onPolygonCreate(currentPoints);
        setCurrentPoints([]);
        setIsDrawing(false);
      } else {
        setCurrentPoints([...currentPoints, newPoint]);
      }
    }
  };

  // Handle mouse move for drawing preview and vertex dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedVertex) {
      const newPoint = getMousePercent(e);
      const polygon = polygons.find((p) => p.id === draggedVertex.polygonId);
      if (polygon) {
        const newPoints = [...polygon.points];
        newPoints[draggedVertex.vertexIndex] = newPoint;
        onPolygonUpdate(draggedVertex.polygonId, newPoints);
      }
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setDraggedVertex(null);
  };

  // Handle vertex drag start
  const handleVertexMouseDown = (e: React.MouseEvent, polygonId: string, vertexIndex: number) => {
    e.stopPropagation();
    setDraggedVertex({ polygonId, vertexIndex });
  };

  // Handle escape key to cancel drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDrawing) {
          setCurrentPoints([]);
          setIsDrawing(false);
        } else {
          onPolygonSelect(null);
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        const isTyping =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT" ||
            (active as HTMLElement).isContentEditable);
        if (!isTyping && selectedId && !isDrawing) {
          onPolygonDelete(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawing, selectedId, onPolygonSelect, onPolygonDelete]);

  // Build SVG path directly from percentage points (viewBox is 0 0 100 100)
  const getPathString = (points: Point[]) => {
    if (points.length < 2) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ") + " Z";
  };

  // Get color for polygon based on status
  const getPolygonColor = (polygon: Polygon, isSelected: boolean) => {
    if (isSelected) return "rgba(59, 130, 246, 0.5)"; // Blue when selected
    if (polygon.color) return polygon.color;
    return "rgba(34, 197, 94, 0.4)"; // Default green
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        {isDrawing ? (
          <div className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
            Chizilmoqda... Nuqta qo‘shish uchun bosing, yopish uchun birinchi nuqtaga qaytib bosing
          </div>
        ) : (
          <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm shadow-lg">
            Polygon chizish uchun bosing
          </div>
        )}
        {isDrawing && (
          <button
            onClick={() => {
              setCurrentPoints([]);
              setIsDrawing(false);
            }}
            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg hover:bg-red-600"
          >
            Bekor (Esc)
          </button>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] bg-slate-200 rounded-lg overflow-hidden cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Floor plan"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            Upload a floor plan image first
          </div>
        )}

        {/* SVG overlay — viewBox 0 0 100 100 maps directly to percentage coords */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ pointerEvents: "none" }}
        >
          {polygons.map((polygon) => {
            const isSelected = polygon.id === selectedId;
            const cx = polygon.points.reduce((s, p) => s + p.x, 0) / polygon.points.length;
            const cy = polygon.points.reduce((s, p) => s + p.y, 0) / polygon.points.length;
            return (
              <g key={polygon.id}>
                <path
                  d={getPathString(polygon.points)}
                  fill={getPolygonColor(polygon, isSelected)}
                  stroke={isSelected ? "#2563eb" : "#16a34a"}
                  strokeWidth={isSelected ? 0.6 : 0.4}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "all", cursor: "pointer" }}
                  data-polygon-id={polygon.id}
                />

                {/* Vertices — shown when selected */}
                {isSelected &&
                  polygon.points.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r={1.2}
                      fill="white"
                      stroke="#2563eb"
                      strokeWidth={0.4}
                      vectorEffect="non-scaling-stroke"
                      style={{ pointerEvents: "all", cursor: "move" }}
                      onMouseDown={(e) => handleVertexMouseDown(e, polygon.id, i)}
                    />
                  ))}

                {/* Label — show unit number */}
                {polygon.points.length > 0 && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3"
                    fontWeight="bold"
                    fill="#1e293b"
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: "none" }}
                  >
                    {polygon.label || ""}
                  </text>
                )}
              </g>
            );
          })}

          {/* In-progress drawing */}
          {currentPoints.length > 0 && (
            <g>
              <path
                d={currentPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                fill="none"
                stroke="#9333ea"
                strokeWidth={0.4}
                strokeDasharray="2,1"
                vectorEffect="non-scaling-stroke"
              />
              {currentPoints.map((point, i) => (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={i === 0 ? 1.5 : 0.8}
                  fill={i === 0 ? "#9333ea" : "white"}
                  stroke="#9333ea"
                  strokeWidth={0.4}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Instructions */}
      <div className="mt-3 text-sm text-slate-500">
        <p><strong>Chizish:</strong> Nuqta qo‘shish uchun bosing, yopish uchun birinchi nuqtaga qaytib bosing</p>
        <p><strong>Tahrirlash:</strong> Nuqtalarni sudrab o‘zgartiring • <strong>O‘chirish:</strong> Tanlang + Delete tugmasi</p>
      </div>
    </div>
  );
}
