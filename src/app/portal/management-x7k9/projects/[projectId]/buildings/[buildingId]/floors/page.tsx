"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import FloorPositionEditor from "@/components/admin/FloorPositionEditor";

interface Floor {
  id: string;
  number: number;
  basePricePerM2: number | null;
  floorPlanImage: string | null;
  positionData: string | null;
  units: { id: string; status: string }[];
}

interface Building {
  id: string;
  name: string;
  projectId: string;
  frontViewImage: string | null;
  floors: Floor[];
}

export default function FloorsPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const params = useParams();
  const [building, setBuilding] = useState<Building | null>(null);
  const [newFloorNumber, setNewFloorNumber] = useState("");
  const [newFloorPrice, setNewFloorPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "range">("single");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangePrice, setRangePrice] = useState("");

  const loadBuilding = async () => {
    const res = await fetch(`/api/buildings/${params.buildingId}`);
    const data = await res.json();
    setBuilding(data);
  };

  useEffect(() => {
    loadBuilding();
  }, [params.buildingId]);

  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    const floorNum = parseInt(newFloorNumber);
    if (isNaN(floorNum)) return;
    setLoading(true);

    await fetch("/api/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: floorNum,
        buildingId: params.buildingId,
        basePricePerM2: newFloorPrice ? parseFloat(newFloorPrice) : null,
      }),
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
        body: JSON.stringify({
          number: i,
          buildingId: params.buildingId,
          basePricePerM2: basePrice,
        }),
      });
    }
    setRangeFrom("");
    setRangeTo("");
    setRangePrice("");
    await loadBuilding();
    setLoading(false);
  };

  const handleUpdateFloor = async (id: string) => {
    setLoading(true);
    await fetch(`/api/floors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: parseInt(editNumber),
        basePricePerM2: editPrice ? parseFloat(editPrice) : null,
      }),
    });
    setEditingId(null);
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
    floorPositions: { floorId: string; positionData: string }[]
  ) => {
    setLoading(true);
    await fetch(`/api/buildings/${params.buildingId}/floor-positions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorPositions }),
    });
    await loadBuilding();
    setShowPositionEditor(false);
    setLoading(false);
  };

  if (!building) {
    return <p className="text-slate-500">{t("loading")}</p>;
  }

  const sortedFloors = [...building.floors].sort((a, b) => b.number - a.number);

  return (
    <div>
      {/* Floor Position Editor Modal */}
      {showPositionEditor && building.frontViewImage && (
        <FloorPositionEditor
          buildingImage={building.frontViewImage}
          floors={building.floors.map((f) => ({
            id: f.id,
            number: f.number,
            positionData: f.positionData,
          }))}
          onSave={handleSaveFloorPositions}
          onCancel={() => setShowPositionEditor(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{building.name} - {t("floors")}</h1>
          <p className="text-slate-500 text-sm">{building.floors.length} {t("floors")}</p>
        </div>
        <div className="flex gap-3 items-center">
          {building.frontViewImage && building.floors.length > 0 && (
            <button
              onClick={() => setShowPositionEditor(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
            >
              📍 {t("editFloorPositions")}
            </button>
          )}
          <Link
            href={`/portal/management-x7k9/projects/${params.projectId}/buildings`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← {t("backToBuildings")}
          </Link>
        </div>
      </div>

      {/* Add Floor Form */}
      <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
        {/* Mode Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setAddMode("single")}
            className={`flex-1 py-2.5 text-sm font-medium transition ${
              addMode === "single"
                ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            + {t("addFloor")}
          </button>
          <button
            onClick={() => setAddMode("range")}
            className={`flex-1 py-2.5 text-sm font-medium transition ${
              addMode === "range"
                ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            ++ {t("addMultipleFloors")}
          </button>
        </div>

        <div className="p-4">
          {addMode === "single" ? (
            <form onSubmit={handleAddFloor} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("floorNumber")}</label>
                <input
                  type="number"
                  value={newFloorNumber}
                  onChange={(e) => setNewFloorNumber(e.target.value)}
                  placeholder="1"
                  className="w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("basePricePerM2")} (optional)</label>
                <input
                  type="number"
                  value={newFloorPrice}
                  onChange={(e) => setNewFloorPrice(e.target.value)}
                  placeholder="e.g. 6500000"
                  className="w-44 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newFloorNumber}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-300 transition text-sm"
              >
                {loading ? "..." : t("addFloor")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddRangeFloors} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("fromFloor")}</label>
                <input
                  type="number"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  placeholder="1"
                  className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  disabled={loading}
                />
              </div>
              <div className="pb-2 text-slate-400 text-lg self-end">→</div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("toFloor")}</label>
                <input
                  type="number"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  placeholder="9"
                  className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("basePricePerM2")} (optional)</label>
                <input
                  type="number"
                  value={rangePrice}
                  onChange={(e) => setRangePrice(e.target.value)}
                  placeholder="e.g. 6500000"
                  className="w-44 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1">
                {rangeFrom && rangeTo && parseInt(rangeFrom) <= parseInt(rangeTo) && (
                  <p className="text-xs text-blue-600">
                    {t("floorsWillBeCreated", { count: parseInt(rangeTo) - parseInt(rangeFrom) + 1 })}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !rangeFrom || !rangeTo || parseInt(rangeFrom) > parseInt(rangeTo)}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 transition text-sm"
                >
                  {loading ? "..." : t("addFloors")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Floors List */}
      {sortedFloors.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500">
          {t("noFloorsYet")}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedFloors.map((floor) => {
            const available = floor.units.filter((u) => u.status === "available").length;
            const total = floor.units.length;

            return (
              <div
                key={floor.id}
                className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4"
              >
                {/* Floor Info */}
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-600">{floor.number}</span>
                </div>

                <div className="flex-1">
                  {editingId === floor.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        className="w-20 px-2 py-1 border rounded"
                        placeholder={t("floorNumber")}
                      />
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-32 px-2 py-1 border rounded"
                        placeholder={t("basePricePerM2")}
                      />
                      <button
                        onClick={() => handleUpdateFloor(floor.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                      >
                        {tc("save")}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-slate-200 rounded text-sm"
                      >
                        {tc("cancel")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-slate-800">{t("floor")} {floor.number}</h3>
                      <p className="text-sm text-slate-500">
                        {total > 0 ? `${available}/${total} ${t("available")}` : t("noUnitsOnFloor")} ·{" "}
                        {floor.basePricePerM2
                          ? `${(floor.basePricePerM2 / 1_000_000).toFixed(1)}M/m²`
                          : t("noBasePrice")}
                      </p>
                    </>
                  )}
                </div>

                {/* Status Indicator */}
                {total > 0 && (
                  <div className="flex h-3 w-24 rounded-full overflow-hidden bg-slate-100">
                    <div
                      className="bg-green-500"
                      style={{ width: `${(available / total) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-400"
                      style={{
                        width: `${
                          (floor.units.filter((u) => u.status === "reserved").length / total) * 100
                        }%`,
                      }}
                    />
                    <div
                      className="bg-red-400"
                      style={{
                        width: `${
                          (floor.units.filter((u) => u.status === "sold").length / total) * 100
                        }%`,
                      }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/portal/management-x7k9/projects/${params.projectId}/buildings/${params.buildingId}/floors/${floor.id}/editor`}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                  >
                    {t("floorPlanEditor")}
                  </Link>
                  <button
                    onClick={() => {
                      setEditingId(floor.id);
                      setEditNumber(floor.number.toString());
                      setEditPrice(floor.basePricePerM2?.toString() || "");
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition"
                  >
                    {tc("edit")}
                  </button>
                  <button
                    onClick={() => handleDeleteFloor(floor.id, floor.number)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition"
                  >
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
