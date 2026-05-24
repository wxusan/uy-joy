"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import FloorPositionEditor from "@/components/admin/FloorPositionEditor";

interface Floor {
  id: string;
  number: number;
  basePricePerM2: number | null;
  floorPlanImage: string | null;
  positionData: { yStart?: number; yEnd?: number; polygon?: { x: number; y: number }[]; label?: { x: number; y: number } | null } | string | null;
  units: { id: string; status: string }[];
}

interface Building {
  id: string;
  name: string;
  projectId: string;
  frontViewImage: string | null;
  floors: Floor[];
}

interface Props {
  initialBuilding: Building;
  buildingId: string;
  projectId: string;
}

export default function FloorsClient({ initialBuilding, buildingId, projectId }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [building, setBuilding] = useState<Building>(initialBuilding);
  const [newFloorNumber, setNewFloorNumber] = useState("");
  const [newFloorPrice, setNewFloorPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "range">("single");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangePrice, setRangePrice] = useState("");

  const loadBuilding = async () => {
    const res = await fetch(`/api/buildings/${buildingId}`);
    setBuilding(await res.json());
  };

  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    const floorNum = parseInt(newFloorNumber);
    if (isNaN(floorNum)) return;
    setLoading(true);
    await fetch("/api/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: floorNum, buildingId, basePricePerM2: newFloorPrice ? parseFloat(newFloorPrice) : null }),
    });
    setNewFloorNumber("");
    setNewFloorPrice("");
    await loadBuilding();
    setLoading(false);
  };

  const handleAddRangeFloors = async (e: React.FormEvent) => {
    e.preventDefault();
    const startFloor = parseInt(rangeFrom);
    const endFloor = parseInt(rangeTo);
    const basePrice = rangePrice ? parseFloat(rangePrice) : null;
    if (isNaN(startFloor) || isNaN(endFloor) || startFloor > endFloor) return;
    setLoading(true);
    for (let i = startFloor; i <= endFloor; i++) {
      await fetch("/api/floors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: i, buildingId, basePricePerM2: basePrice }),
      });
    }
    setRangeFrom(""); setRangeTo(""); setRangePrice("");
    await loadBuilding();
    setLoading(false);
  };

  const handleDeleteFloor = async (id: string, number: number) => {
    if (!confirm(t("confirmDeleteFloorMsg", { number }))) return;
    setLoading(true);
    await fetch(`/api/floors/${id}`, { method: "DELETE" });
    await loadBuilding();
    setLoading(false);
  };

  const handleSaveFloorPositions = async (
    floorPositions: {
      floorId: string;
      positionData: { yStart?: number; yEnd?: number; polygon?: { x: number; y: number }[]; label?: { x: number; y: number } | null };
    }[]
  ) => {
    setLoading(true);
    await fetch(`/api/buildings/${buildingId}/floor-positions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorPositions }),
    });
    await loadBuilding();
    setShowPositionEditor(false);
    setLoading(false);
  };

  const sortedFloors = [...building.floors].sort((a, b) => b.number - a.number);

  return (
    <div className="space-y-4">
      {showPositionEditor && building.frontViewImage && (
        <FloorPositionEditor
          buildingImage={building.frontViewImage}
          floors={building.floors.map((f) => ({ id: f.id, number: f.number, positionData: f.positionData }))}
          onSave={handleSaveFloorPositions}
          onCancel={() => setShowPositionEditor(false)}
        />
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[22px] font-semibold text-neutral-950">{building.name} - {t("floors")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{building.floors.length} {t("floors")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {building.frontViewImage && building.floors.length > 0 && (
            <button onClick={() => setShowPositionEditor(true)}
              className="rounded-[6px] bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">
              {t("editFloorPositions")}
            </button>
          )}
          <Link href={`/portal/management-x7k9/projects/${projectId}/buildings`}
            className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
            ← {t("backToBuildings")}
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-neutral-200 bg-white shadow-sm">
        <div className="flex border-b border-neutral-200 bg-neutral-50 p-1">
          <button onClick={() => setAddMode("single")}
            className={`flex-1 rounded-[6px] py-2.5 text-sm font-medium transition ${addMode === "single" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-900"}`}>
            + {t("addFloor")}
          </button>
          <button onClick={() => setAddMode("range")}
            className={`flex-1 rounded-[6px] py-2.5 text-sm font-medium transition ${addMode === "range" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-900"}`}>
            ++ {t("addMultipleFloors")}
          </button>
        </div>
        <div className="p-4">
          {addMode === "single" ? (
            <form onSubmit={handleAddFloor} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">{t("floorNumber")}</label>
                <input type="number" value={newFloorNumber} onChange={(e) => setNewFloorNumber(e.target.value)}
                  placeholder="1" disabled={loading}
                  className="w-28 rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">{t("basePricePerM2")} ({t("optional")})</label>
                <input type="number" value={newFloorPrice} onChange={(e) => setNewFloorPrice(e.target.value)}
                  placeholder={t("egPrice")} disabled={loading}
                  className="w-44 rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400" />
              </div>
              <button type="submit" disabled={loading || !newFloorNumber}
                className="rounded-[6px] bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400">
                {loading ? "..." : t("addFloor")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddRangeFloors} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">{t("fromFloor")}</label>
                <input type="number" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
                  placeholder="1" disabled={loading}
                  className="w-24 rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400" />
              </div>
              <div className="self-end pb-2 text-lg text-neutral-400">→</div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">{t("toFloor")}</label>
                <input type="number" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)}
                  placeholder="9" disabled={loading}
                  className="w-24 rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">{t("basePricePerM2")} ({t("optional")})</label>
                <input type="number" value={rangePrice} onChange={(e) => setRangePrice(e.target.value)}
                  placeholder={t("egPrice")} disabled={loading}
                  className="w-44 rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400" />
              </div>
              <div className="flex flex-col gap-1">
                {rangeFrom && rangeTo && parseInt(rangeFrom) <= parseInt(rangeTo) && (
                  <p className="text-xs text-neutral-500">
                    {t("floorsWillBeCreated", { count: parseInt(rangeTo) - parseInt(rangeFrom) + 1 })}
                  </p>
                )}
                <button type="submit" disabled={loading || !rangeFrom || !rangeTo || parseInt(rangeFrom) > parseInt(rangeTo)}
                  className="rounded-[6px] bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400">
                  {loading ? "..." : t("addFloors")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {sortedFloors.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">{t("noFloorsYet")}</div>
      ) : (
        <div className="space-y-3">
          {sortedFloors.map((floor) => {
            const available = floor.units.filter((u) => u.status === "available").length;
            const total = floor.units.length;
            return (
              <div key={floor.id} className="flex flex-col gap-4 rounded-[8px] border border-neutral-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[6px] border border-neutral-200 bg-neutral-50">
                  <span className="text-2xl font-semibold text-neutral-700">{floor.number}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-neutral-950">{t("floor")} {floor.number}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {total > 0 ? `${available}/${total} ${t("available")}` : t("noUnitsOnFloor")} ·{" "}
                    {floor.basePricePerM2 ? `${(floor.basePricePerM2 / 1_000_000).toFixed(1)}M/m²` : t("noBasePrice")}
                  </p>
                </div>
                {total > 0 && (
                  <div className="flex h-2 w-24 overflow-hidden rounded-full bg-neutral-100">
                    <div className="bg-neutral-900" style={{ width: `${(available / total) * 100}%` }} />
                    <div className="bg-neutral-500" style={{ width: `${(floor.units.filter((u) => u.status === "reserved").length / total) * 100}%` }} />
                    <div className="bg-neutral-300" style={{ width: `${(floor.units.filter((u) => u.status === "sold").length / total) * 100}%` }} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={`/portal/management-x7k9/projects/${projectId}/buildings/${buildingId}/floors/${floor.id}/editor`}
                    className="rounded-[6px] bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">
                    {t("floorPlanEditor")}
                  </Link>
                  <button onClick={() => handleDeleteFloor(floor.id, floor.number)}
                    className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                    {tc("delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
