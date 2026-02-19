"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PolygonEditor, { Point, Polygon } from "@/components/admin/PolygonEditor";
import { SHOW_AI } from "@/lib/flags";

interface Unit {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  polygonData: string | null;
  labelX: number | null;
  labelY: number | null;
  sketchImage:  string | null;
  sketchImage2: string | null;
  sketchImage3: string | null;
  sketchImage4: string | null;
}

interface Floor {
  id: string;
  number: number;
  basePricePerM2: number | null;
  floorPlanImage: string | null;
  units: Unit[];
  building: {
    id: string;
    name: string;
    projectId: string;
  };
}

export default function FloorPlanEditorPage() {
  const params = useParams();
  const t = useTranslations("admin");
  const [floor, setFloor] = useState<Floor | null>(null);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiDetecting, setAiDetecting] = useState(false);
  const [copying, setCopying] = useState(false);

  // Form state for selected unit (rooms/area as strings so user can freely edit)
  const [unitForm, setUnitForm] = useState({
    unitNumber: "",
    rooms: "1",
    area: "0",
    status: "available",
    pricePerM2: "",
  });

  // Ref to floor so we can read latest floor without adding to effect deps
  const floorRef = useRef<Floor | null>(null);
  useEffect(() => {
    floorRef.current = floor;
  }, [floor]);

  // Load floor data
  const loadFloor = useCallback(async () => {
    const res = await fetch(`/api/floors/${params.floorId}`);
    const data = await res.json();
    setFloor({
      ...data,
      building: data.building || { id: params.buildingId, name: "", projectId: params.projectId },
    });

    // Convert units to polygons
    const polys: Polygon[] = data.units
      .filter((u: Unit) => u.polygonData)
      .map((u: Unit) => ({
        id: u.id,
        points: JSON.parse(u.polygonData!),
        unitId: u.id,
        color: getStatusColor(u.status),
        label: u.unitNumber,
      }));
    setPolygons(polys);
  }, [params.floorId, params.buildingId, params.projectId]);

  useEffect(() => {
    loadFloor();
  }, [loadFloor]);

  // Update form ONLY when selected unit changes (not on every floor reload)
  // This prevents the form from resetting after image upload
  useEffect(() => {
    if (selectedPolygonId) {
      const unit = floorRef.current?.units.find((u) => u.id === selectedPolygonId);
      if (unit) {
        setUnitForm({
          unitNumber: unit.unitNumber,
          rooms: unit.rooms.toString(),
          area: unit.area.toString(),
          status: unit.status,
          pricePerM2: unit.pricePerM2?.toString() || "",
        });
      }
    } else {
      setUnitForm({ unitNumber: "", rooms: "1", area: "0", status: "available", pricePerM2: "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPolygonId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "rgba(34, 197, 94, 0.5)";
      case "reserved":
        return "rgba(234, 179, 8, 0.5)";
      case "sold":
        return "rgba(239, 68, 68, 0.4)";
      default:
        return "rgba(34, 197, 94, 0.5)";
    }
  };

  // Handle floor plan image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "floor");
    formData.append("id", params.floorId as string);

    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await uploadRes.json();

      await fetch(`/api/floors/${params.floorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanImage: url }),
      });

      await loadFloor();
    } catch (error) {
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // Handle polygon creation
  const handlePolygonCreate = async (points: Point[]) => {
    const nextNum = (floor?.units.length || 0) + 1;
    const floorNum = floor?.number || 1;
    // e.g. floor 7 unit 1 → "701", unit 10 → "710"
    const defaultUnitNumber = `${floorNum}${String(nextNum).padStart(2, "0")}`;

    // Create a new unit with this polygon
    setSaving(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitNumber: defaultUnitNumber,
          floorId: params.floorId,
          rooms: 1,
          area: 50,
          status: "available",
          polygonData: JSON.stringify(points),
        }),
      });
      const newUnit = await res.json();

      // Add to local state
      setPolygons([
        ...polygons,
        {
          id: newUnit.id,
          points,
          unitId: newUnit.id,
          color: getStatusColor("available"),
          label: defaultUnitNumber,
        },
      ]);

      await loadFloor();
      setSelectedPolygonId(newUnit.id);
    } catch (error) {
      alert("Failed to create unit");
    } finally {
      setSaving(false);
    }
  };

  // Handle polygon update
  const handlePolygonUpdate = async (id: string, points: Point[]) => {
    // Update local state immediately for smooth dragging
    setPolygons((prev) =>
      prev.map((p) => (p.id === id ? { ...p, points } : p))
    );

    // Debounced save to server
    await fetch(`/api/units/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polygonData: JSON.stringify(points) }),
    });
  };

  // Handle polygon deletion
  const handlePolygonDelete = async (id: string) => {
    if (!confirm("Delete this unit?")) return;

    setSaving(true);
    try {
      await fetch(`/api/units/${id}`, { method: "DELETE" });
      setPolygons((prev) => prev.filter((p) => p.id !== id));
      setSelectedPolygonId(null);
      await loadFloor();
    } catch (error) {
      alert("Failed to delete unit");
    } finally {
      setSaving(false);
    }
  };

  // Handle unit form save
  const handleUnitSave = async () => {
    if (!selectedPolygonId) return;

    setSaving(true);
    try {
      await fetch(`/api/units/${selectedPolygonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitNumber: unitForm.unitNumber,
          rooms: parseInt(unitForm.rooms) || 1,
          area: parseFloat(unitForm.area) || 0,
          status: unitForm.status,
          pricePerM2: unitForm.pricePerM2 ? parseFloat(unitForm.pricePerM2) : null,
        }),
      });

      // Update polygon color and label
      setPolygons((prev) =>
        prev.map((p) =>
          p.id === selectedPolygonId
            ? { ...p, color: getStatusColor(unitForm.status), label: unitForm.unitNumber }
            : p
        )
      );

      await loadFloor();
    } catch (error) {
      alert("Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  // Handle AI detection
  const handleAIDetect = async () => {
    if (!floor?.floorPlanImage) {
      alert("Please upload a floor plan image first");
      return;
    }

    setAiDetecting(true);
    try {
      const res = await fetch("/api/ai/detect-apartments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: floor.floorPlanImage }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "AI detection failed");
      }

      const { apartments } = await res.json();

      // Create units for each detected apartment
      for (const apt of apartments) {
        await fetch("/api/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitNumber: `Auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            floorId: params.floorId,
            rooms: apt.suggestedRooms || 1,
            area: apt.suggestedArea || 50,
            status: "available",
            polygonData: JSON.stringify(apt.polygon),
          }),
        });
      }

      await loadFloor();
      alert(`AI detected ${apartments.length} apartments!`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "AI detection failed";
      alert(message);
    } finally {
      setAiDetecting(false);
    }
  };

  // Copy layout to all floors
  const handleCopyToAllFloors = async () => {
    if (!floor?.units.length) {
      alert("No units to copy. Draw some apartments first.");
      return;
    }

    if (!confirm(
      "This will copy the current floor plan (image + all units) to ALL other floors in this building.\n\n" +
      "Existing units on other floors will be DELETED and replaced.\n\n" +
      "Continue?"
    )) {
      return;
    }

    setCopying(true);
    try {
      const res = await fetch(`/api/floors/${params.floorId}/copy-to-all`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`✅ ${data.message}`);
      } else {
        throw new Error(data.error || "Copy failed");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Copy failed";
      alert(message);
    } finally {
      setCopying(false);
    }
  };

  // Delete floor plan image
  const handleImageDelete = async () => {
    if (!confirm("Qavat rejasi rasmini o'chirmoqchimisiz?")) return;
    setUploading(true);
    try {
      await fetch(`/api/floors/${params.floorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanImage: null }),
      });
      await loadFloor();
    } catch {
      alert("O'chirishda xatolik");
    } finally {
      setUploading(false);
    }
  };

  if (!floor) {
    return <p className="text-slate-500">{t("loading")}</p>;
  }

  const selectedUnit = floor.units.find((u) => u.id === selectedPolygonId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("floorPlanEditor")}</h1>
          <p className="text-slate-500 text-sm">
            {floor.building?.name} · {t("floor")} {floor.number}
          </p>
        </div>
        <Link
          href={`/portal/management-x7k9/projects/${params.projectId}/buildings/${params.buildingId}/floors`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← {t("backToFloors")}
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="lg:col-span-2">
          {/* Image Upload */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Qavat rejasi rasmi</h3>
                <p className="text-sm text-slate-500">
                  {floor.floorPlanImage ? "Rasm yuklandi" : "Boshlash uchun rasm yuklang"}
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="floor-image-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="floor-image-upload"
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
                    uploading
                      ? "bg-slate-200 text-slate-500"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {uploading ? t("loading") : floor.floorPlanImage ? "Rasmni o'zgartirish" : "Rasm yuklash"}
                </label>
                {floor.floorPlanImage && (
                  <button
                    onClick={handleImageDelete}
                    disabled={uploading}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:bg-slate-300 transition"
                  >
                    🗑 O&apos;chirish
                  </button>
                )}
                {SHOW_AI && (
                  <button
                    onClick={handleAIDetect}
                    disabled={aiDetecting || !floor.floorPlanImage}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-slate-300 transition"
                  >
                    {aiDetecting ? "Aniqlanmoqda..." : "🤖 AI Aniqlash"}
                  </button>
                )}
                <button
                  onClick={handleCopyToAllFloors}
                  disabled={copying || floor.units.length === 0}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-slate-300 transition"
                  title="Barcha qavatlarga nusxalash"
                >
                  {copying ? "Nusxalanmoqda..." : "📋 Barcha qavatlarga nusxalash"}
                </button>
              </div>
            </div>
          </div>

          {/* Polygon Editor */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <PolygonEditor
              imageUrl={floor.floorPlanImage}
              polygons={polygons}
              selectedId={selectedPolygonId}
              onPolygonCreate={handlePolygonCreate}
              onPolygonUpdate={handlePolygonUpdate}
              onPolygonSelect={setSelectedPolygonId}
              onPolygonDelete={handlePolygonDelete}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Unit Details Form */}
          {selectedPolygonId && selectedUnit ? (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold mb-4">Kvartira ma&apos;lumotlari</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kvartira raqami</label>
                  <input
                    type="text"
                    value={unitForm.unitNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Xonalar</label>
                    <input
                      type="number"
                      value={unitForm.rooms}
                      onChange={(e) => setUnitForm({ ...unitForm, rooms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      min={1}
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maydon (m²)</label>
                    <input
                      type="number"
                      value={unitForm.area}
                      onChange={(e) => setUnitForm({ ...unitForm, area: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("status")}</label>
                  <select
                    value={unitForm.status}
                    onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="available">{t("available")}</option>
                    <option value="reserved">{t("reserved")}</option>
                    <option value="sold">{t("sold")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Narx/m² (ixtiyoriy)
                  </label>
                  <input
                    type="number"
                    value={unitForm.pricePerM2}
                    onChange={(e) => setUnitForm({ ...unitForm, pricePerM2: e.target.value })}
                    placeholder={floor.basePricePerM2?.toString() || "Asosiy narxni ishlatish"}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                {/* Photos (up to 4) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rasmlar (4 tagacha)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["sketchImage", "sketchImage2", "sketchImage3", "sketchImage4"] as const).map((field, idx) => {
                      const photo = selectedUnit[field];
                      const slotNum = idx + 1;
                      return (
                        <div key={field} className="relative border rounded-lg overflow-hidden bg-slate-50 aspect-video flex items-center justify-center">
                          {photo ? (
                            <>
                              <img src={photo} alt={`Photo ${slotNum}`} className="w-full h-full object-cover" />
                              <button
                                onClick={async () => {
                                  await fetch(`/api/units/${selectedPolygonId}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ [field]: null }),
                                  });
                                  await loadFloor();
                                }}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full flex items-center justify-center"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                type="file"
                                accept="image/*"
                                id={`photo-upload-${slotNum}`}
                                className="hidden"
                                disabled={uploadingSlot !== null}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setUploadingSlot(slotNum);
                                  try {
                                    const fd = new FormData();
                                    fd.append("file", file);
                                    fd.append("type", "unit");
                                    fd.append("id", selectedPolygonId!);
                                    const res = await fetch("/api/upload", { method: "POST", body: fd });
                                    const { url } = await res.json();
                                    await fetch(`/api/units/${selectedPolygonId}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ [field]: url }),
                                    });
                                    await loadFloor();
                                  } catch {
                                    alert("Failed to upload");
                                  } finally {
                                    setUploadingSlot(null);
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <label
                                htmlFor={`photo-upload-${slotNum}`}
                                className="flex flex-col items-center gap-1 cursor-pointer text-slate-400 hover:text-emerald-600 transition p-2 text-center"
                              >
                                {uploadingSlot === slotNum ? (
                                  <span className="text-xs">{t("loading")}</span>
                                ) : (
                                  <>
                                    <span className="text-lg">📷</span>
                                    <span className="text-xs">{slotNum}-rasm</span>
                                  </>
                                )}
                              </label>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleUnitSave}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-300 transition"
                >
                  {saving ? t("saving") : "Saqlash"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-500">
              <p>Polygon chizing yoki kvartira ma&apos;lumotlarini tahrirlash uchun tanlang</p>
            </div>
          )}

          {/* Units List */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold mb-3">Kvartiralar ({floor.units.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {floor.units.length === 0 ? (
                <p className="text-sm text-slate-500">Hali kvartiralar yo&apos;q. Qavat rejasida polygon chizing.</p>
              ) : (
                floor.units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedPolygonId(unit.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                      selectedPolygonId === unit.id
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{unit.unitNumber}</p>
                      <p className="text-xs text-slate-500">
                        {unit.rooms}R · {unit.area}m²
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        unit.status === "available"
                          ? "bg-green-100 text-green-700"
                          : unit.status === "reserved"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {unit.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
