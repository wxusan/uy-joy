"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Point = { x: number; y: number };

interface BuildingItem {
  id: string;
  name: string;
  positionData: string | null;
}

interface Props {
  imageUrl: string;
  buildings: BuildingItem[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TopViewMapper({ imageUrl, buildings, onClose, onSaved }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(buildings[0]?.id || null);
  const [polygons, setPolygons] = useState<Record<string, Point[]>>({});
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial: Record<string, Point[]> = {};
    for (const b of buildings) {
      if (b.positionData) {
        try {
          const data = JSON.parse(b.positionData);
          // Support both old rect format and new polygon format
          if (Array.isArray(data)) {
            initial[b.id] = data;
          } else if (data.x !== undefined) {
            // Convert old rect to polygon
            initial[b.id] = [
              { x: data.x, y: data.y },
              { x: data.x + data.width, y: data.y },
              { x: data.x + data.width, y: data.y + data.height },
              { x: data.x, y: data.y + data.height },
            ];
          }
        } catch {}
      }
    }
    setPolygons(initial);
  }, [buildings]);

  const getPoint = (e: React.MouseEvent): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!activeId) return;
    const pt = getPoint(e);
    setCurrentPoints((prev) => [...prev, pt]);
  };

  const handleDoubleClick = () => {
    if (!activeId || currentPoints.length < 3) return;
    setPolygons((prev) => ({ ...prev, [activeId]: currentPoints }));
    setCurrentPoints([]);
  };

  const clearBuilding = (id: string) => {
    setPolygons((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeId === id) setCurrentPoints([]);
  };

  const toSvgPath = (points: Point[]) => {
    if (points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  };

  const save = async () => {
    setSaving(true);
    await Promise.all(
      buildings.map(async (b) => {
        const pts = polygons[b.id];
        const body = { positionData: pts && pts.length >= 3 ? JSON.stringify(pts) : null };
        await fetch(`/api/buildings/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      })
    );
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Binolar hududlarini belgilash</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">Yopish</button>
            <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-auto">
          <div className="col-span-8">
            <div
              ref={containerRef}
              className="relative w-full aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden cursor-crosshair"
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
            >
              <Image src={imageUrl} alt="Top view" fill className="object-cover select-none pointer-events-none" />
              
              {/* SVG overlay for polygons */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Completed polygons */}
                {Object.entries(polygons).map(([id, pts]) => {
                  const isActive = id === activeId;
                  const isHovered = id === hoveredId;
                  const building = buildings.find(b => b.id === id);
                  return (
                    <g key={id}>
                      <path
                        d={toSvgPath(pts)}
                        fill={isActive || isHovered ? "rgba(16, 185, 129, 0.3)" : "transparent"}
                        stroke={isActive ? "#10b981" : isHovered ? "#10b981" : "transparent"}
                        strokeWidth={isActive ? 0.5 : 0.3}
                        className="transition-all duration-200"
                        onMouseEnter={() => setHoveredId(id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{ cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); setActiveId(id); }}
                      />
                      {/* Label */}
                      {(isActive || isHovered) && pts.length > 0 && (
                        <text
                          x={pts.reduce((a, p) => a + p.x, 0) / pts.length}
                          y={pts.reduce((a, p) => a + p.y, 0) / pts.length}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[3px] font-bold fill-white pointer-events-none"
                          style={{ textShadow: "0 0 2px rgba(0,0,0,0.8)" }}
                        >
                          {building?.name}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Current drawing points */}
                {currentPoints.length > 0 && (
                  <>
                    <path
                      d={currentPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={0.4}
                      strokeDasharray="1 0.5"
                    />
                    {currentPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={0.8} fill="#10b981" />
                    ))}
                  </>
                )}
              </svg>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 O&apos;ng tomondan binoni tanlang, keyin rasmda nuqtalarni bosib polygon chizing. Yakunlash uchun ikki marta bosing.
            </p>
          </div>
          <div className="col-span-4 space-y-2">
            <h3 className="font-medium">Binolar</h3>
            {buildings.map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition ${
                  activeId === b.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <button
                  onClick={() => { setActiveId(b.id); setCurrentPoints([]); }}
                  className="flex-1 text-left"
                >
                  <span className="font-medium">{b.name}</span>
                  <span className={`ml-2 text-xs ${polygons[b.id] ? "text-emerald-600" : "text-slate-400"}`}>
                    {polygons[b.id] ? `✓ ${polygons[b.id].length} nuqta` : "Belgilanmagan"}
                  </span>
                </button>
                {polygons[b.id] && (
                  <button
                    onClick={() => clearBuilding(b.id)}
                    className="text-red-500 hover:text-red-700 text-sm px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {currentPoints.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">
                  {currentPoints.length} nuqta qo&apos;yildi. Yakunlash uchun ikki marta bosing yoki davom eting.
                </p>
                <button
                  onClick={() => setCurrentPoints([])}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  Bekor qilish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
