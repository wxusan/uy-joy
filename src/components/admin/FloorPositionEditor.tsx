"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { SHOW_AI } from "@/lib/flags";

interface Floor {
  id: string;
  number: number;
  positionData: string | null;
}

interface Props {
  buildingImage: string;
  floors: Floor[];
  onSave: (floorPositions: { floorId: string; positionData: string }[]) => void;
  onCancel: () => void;
}

interface FloorPosition {
  floorId: string;
  floorNumber: number;
  yStart: number; // percentage from top
  yEnd: number;   // percentage from top
}

export default function FloorPositionEditor({ buildingImage, floors, onSave, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<FloorPosition[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<number | null>(null);
  const [hoveredFloor, setHoveredFloor] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Initialize positions from existing data
  useEffect(() => {
    const initialPositions: FloorPosition[] = floors.map((floor) => {
      let yStart = 0;
      let yEnd = 0;
      
      if (floor.positionData) {
        try {
          const data = JSON.parse(floor.positionData);
          yStart = data.yStart ?? 0;
          yEnd = data.yEnd ?? 0;
        } catch {
          // Invalid JSON, use defaults
        }
      }
      
      return {
        floorId: floor.id,
        floorNumber: floor.number,
        yStart,
        yEnd,
      };
    });
    
    setPositions(initialPositions);
  }, [floors]);

  const getYPercent = (e: React.MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    return Math.max(0, Math.min(100, (y / rect.height) * 100));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedFloor) return;
    const y = getYPercent(e);
    setIsDrawing(true);
    setDrawStart(y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !selectedFloor || drawStart === null) return;
    
    const y = getYPercent(e);
    const yStart = Math.min(drawStart, y);
    const yEnd = Math.max(drawStart, y);
    
    setPositions((prev) =>
      prev.map((p) =>
        p.floorId === selectedFloor ? { ...p, yStart, yEnd } : p
      )
    );
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDrawStart(null);
  };

  const handleSave = () => {
    const floorPositions = positions.map((p) => ({
      floorId: p.floorId,
      positionData: JSON.stringify({ yStart: p.yStart, yEnd: p.yEnd }),
    }));
    onSave(floorPositions);
  };

  const handleAutoDistribute = () => {
    const sortedFloors = [...floors].sort((a, b) => b.number - a.number);
    const totalFloors = sortedFloors.length;
    const floorHeight = 85 / totalFloors; // Leave 10% for roof and 5% for ground
    
    const newPositions = sortedFloors.map((floor, index) => ({
      floorId: floor.id,
      floorNumber: floor.number,
      yStart: 10 + index * floorHeight,
      yEnd: 10 + (index + 1) * floorHeight - 1,
    }));
    
    setPositions(newPositions);
  };

  const handleAIDetect = async () => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const response = await fetch("/api/ai/detect-floors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: buildingImage,
          floorCount: floors.length,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "AI detection failed");
      }
      
      // Match AI results with floor IDs
      const sortedFloors = [...floors].sort((a, b) => b.number - a.number);
      const newPositions = sortedFloors.map((floor) => {
        const aiFloor = data.floors.find((f: { floorNumber: number }) => f.floorNumber === floor.number);
        return {
          floorId: floor.id,
          floorNumber: floor.number,
          yStart: aiFloor?.yStart ?? 0,
          yEnd: aiFloor?.yEnd ?? 0,
        };
      });
      
      setPositions(newPositions);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI detection failed");
    } finally {
      setAiLoading(false);
    }
  };

  const sortedPositions = [...positions].sort((a, b) => b.floorNumber - a.floorNumber);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Qavatlar joylashuvini belgilash</h2>
            <p className="text-sm text-slate-500">
              Ro&apos;yxatdan qavatni tanlang, keyin rasmda uning joyini belgilang
            </p>
            {aiError && (
              <p className="text-sm text-red-500 mt-1">Xatolik: {aiError}</p>
            )}
          </div>
          <div className="flex gap-2">
            {SHOW_AI && (
              <button
                onClick={handleAIDetect}
                disabled={aiLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-300 transition flex items-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <span className="animate-spin">⏳</span> Aniqlanmoqda...
                  </>
                ) : (
                  <>
                    <span>🤖</span> AI bilan aniqlash
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleAutoDistribute}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              Avtomatik
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              Saqlash
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex gap-4">
            {/* Image with overlays */}
            <div className="flex-1">
              <div
                ref={containerRef}
                className="relative w-full aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden cursor-crosshair select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <Image
                  src={buildingImage}
                  alt="Building"
                  fill
                  className="object-cover pointer-events-none"
                  sizes="600px"
                />

                {/* Floor overlays */}
                {sortedPositions.map((pos) => {
                  const isSelected = selectedFloor === pos.floorId;
                  const isHovered = hoveredFloor === pos.floorId;
                  const hasPosition = pos.yEnd > pos.yStart;

                  if (!hasPosition) return null;

                  return (
                    <div
                      key={pos.floorId}
                      className={`absolute left-0 right-0 border-y-2 transition-colors ${
                        isSelected
                          ? "bg-emerald-500/50 border-emerald-600"
                          : isHovered
                          ? "bg-blue-500/40 border-blue-500"
                          : "bg-white/30 border-white/60"
                      }`}
                      style={{
                        top: `${pos.yStart}%`,
                        height: `${pos.yEnd - pos.yStart}%`,
                      }}
                    >
                      <div
                        className={`absolute left-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-sm font-bold ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900/70 text-white"
                        }`}
                      >
                        F{pos.floorNumber}
                      </div>
                    </div>
                  );
                })}

                {/* Drawing preview */}
                {isDrawing && selectedFloor && drawStart !== null && (
                  <div
                    className="absolute left-0 right-0 bg-emerald-500/30 border-y-2 border-emerald-500 border-dashed"
                    style={{
                      top: `${Math.min(drawStart, positions.find((p) => p.floorId === selectedFloor)?.yEnd ?? drawStart)}%`,
                      height: `${Math.abs((positions.find((p) => p.floorId === selectedFloor)?.yEnd ?? drawStart) - drawStart)}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Floor list */}
            <div className="w-64 flex flex-col">
              <h3 className="font-semibold text-slate-700 mb-2">Qavatlar</h3>
              <p className="text-xs text-slate-500 mb-3">
                Qavatni tanlang va rasmda joyini chizing
              </p>
              
              <div className="flex-1 overflow-auto space-y-2">
                {sortedPositions.map((pos) => {
                  const isSelected = selectedFloor === pos.floorId;
                  const hasPosition = pos.yEnd > pos.yStart;

                  return (
                    <button
                      key={pos.floorId}
                      onClick={() => setSelectedFloor(isSelected ? null : pos.floorId)}
                      onMouseEnter={() => setHoveredFloor(pos.floorId)}
                      onMouseLeave={() => setHoveredFloor(null)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-medium">Qavat {pos.floorNumber}</span>
                      {hasPosition ? (
                        <span className="text-xs text-green-600">✓ Belgilangan</span>
                      ) : (
                        <span className="text-xs text-slate-400">Belgilanmagan</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected floor info */}
              {selectedFloor && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    <strong>Tanlangan:</strong> Qavat{" "}
                    {positions.find((p) => p.floorId === selectedFloor)?.floorNumber}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Rasmda bosib tortib joyini belgilang
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
