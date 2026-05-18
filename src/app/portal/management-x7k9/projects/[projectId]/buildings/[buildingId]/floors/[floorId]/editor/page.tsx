"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PolygonEditor, { Point, Polygon } from "@/components/admin/PolygonEditor";
import Image from "next/image";
import { SHOW_AI } from "@/lib/flags";
import { getStatusMeta } from "@/lib/status-style";

interface Unit {
  id: string;
  unitNumber: string;
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
  const tc = useTranslations("common");
  const [floor, setFloor] = useState<Floor | null>(null);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiDetecting, setAiDetecting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [copyConfirmInput, setCopyConfirmInput] = useState("");
  const [copyConfirmInfo, setCopyConfirmInfo] = useState<{
    targetFloors: { id: string; number: number; preservedCount: number }[];
  } | null>(null);
  const [copyConfirmLoading, setCopyConfirmLoading] = useState(false);

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
        points: u.polygonData as Point[],
        unitId: u.id,
        color: getStatusMeta(u.status).fillColor,
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
    } catch {
      alert(t("imageUploadError"));
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
          polygonData: points,
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
          color: getStatusMeta("available").fillColor,
          label: defaultUnitNumber,
        },
      ]);

      await loadFloor();
      setSelectedPolygonId(newUnit.id);
    } catch {
      alert(t("createUnitError"));
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
      body: JSON.stringify({ polygonData: points }),
    });
  };

  // Handle polygon deletion
  const handlePolygonDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteUnit"))) return;

    setSaving(true);
    try {
      await fetch(`/api/units/${id}`, { method: "DELETE" });
      setPolygons((prev) => prev.filter((p) => p.id !== id));
      setSelectedPolygonId(null);
      await loadFloor();
    } catch {
      alert(t("deleteUnitError"));
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
            ? { ...p, color: getStatusMeta(unitForm.status).fillColor, label: unitForm.unitNumber }
            : p
        )
      );

      setSelectedPolygonId(null);
      await loadFloor();
    } catch {
      alert(t("saveUnitError"));
    } finally {
      setSaving(false);
    }
  };

  // Handle AI detection
  const handleAIDetect = async () => {
    if (!floor?.floorPlanImage) {
      alert(t("pleaseUploadFloorPlanFirst"));
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

      // Create units for each detected apartment with floor+order numbering
      const existingCount = floor?.units.length || 0;
      const floorNum = floor?.number || 1;
      for (let i = 0; i < apartments.length; i++) {
        const apt = apartments[i];
        const unitNum = `${floorNum}${String(existingCount + i + 1).padStart(2, "0")}`;
        await fetch("/api/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitNumber: unitNum,
            floorId: params.floorId,
            rooms: apt.suggestedRooms || 1,
            area: apt.suggestedArea || 50,
            status: "available",
            polygonData: JSON.stringify(apt.polygon),
          }),
        });
      }

      await loadFloor();
      alert(t("aiDetectedApartments", { count: apartments.length }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "AI detection failed";
      alert(message);
    } finally {
      setAiDetecting(false);
    }
  };

  // Open the typed-confirm modal: load target floors + count reserved/sold per floor
  const openCopyConfirm = async () => {
    if (!floor?.units.length) {
      alert(t("noUnitsToCopy"));
      return;
    }

    setCopyConfirmLoading(true);
    try {
      const res = await fetch(
        `/api/floors?buildingId=${params.buildingId}`
      );
      const allFloors: { id: string; number: number; units: { status: string }[] }[] = await res.json();
      const targetFloors = allFloors
        .filter((f) => f.id !== params.floorId)
        .sort((a, b) => a.number - b.number)
        .map((f) => ({
          id: f.id,
          number: f.number,
          preservedCount: (f.units || []).filter(
            (u) => u.status === "reserved" || u.status === "sold"
          ).length,
        }));

      setCopyConfirmInfo({ targetFloors });
      setCopyConfirmInput("");
      setCopyConfirmOpen(true);
    } catch {
      alert(t("copyFailed"));
    } finally {
      setCopyConfirmLoading(false);
    }
  };

  // Run the actual copy-to-all once the admin has typed the floor number
  const handleCopyToAllFloors = async () => {
    setCopying(true);
    try {
      const res = await fetch(`/api/floors/${params.floorId}/copy-to-all`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        alert(t("layoutCopied", { count: data.copiedCount }));
        setCopyConfirmOpen(false);
        setCopyConfirmInfo(null);
        setCopyConfirmInput("");
        await loadFloor();
      } else {
        throw new Error(data.error || t("copyFailed"));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("copyFailed");
      alert(message);
    } finally {
      setCopying(false);
    }
  };

  // Renumber all units on this floor to floor+order format (e.g., 701, 702, ...)
  const handleRenumberAll = async () => {
    if (!floor || floor.units.length === 0) return;
    if (!confirm(t("confirmRenumber", { count: floor.units.length, floor: floor.number }))) return;

    setSaving(true);
    try {
      // Sort units by polygon center position (top-to-bottom, left-to-right)
      const unitsWithCenter = floor.units.map(u => {
        let cx = 0, cy = 0;
        if (u.polygonData) {
          try {
            const pts = u.polygonData as { x: number; y: number }[];
            cx = pts.reduce((s: number, p: { x: number }) => s + p.x, 0) / pts.length;
            cy = pts.reduce((s: number, p: { y: number }) => s + p.y, 0) / pts.length;
          } catch { /* ignore */ }
        }
        return { ...u, cx, cy };
      }).sort((a, b) => a.cy - b.cy || a.cx - b.cx);

      for (let i = 0; i < unitsWithCenter.length; i++) {
        const newNum = `${floor.number}${String(i + 1).padStart(2, "0")}`;
        await fetch(`/api/units/${unitsWithCenter[i].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitNumber: newNum }),
        });
      }

      await loadFloor();
      alert(t("renumberSuccess", { count: floor.units.length }));
    } catch {
      alert(t("renumberError"));
    } finally {
      setSaving(false);
    }
  };

  // Delete floor plan image
  const handleImageDelete = async () => {
    if (!confirm(t("confirmDeleteFloorImage"))) return;
    setUploading(true);
    try {
      await fetch(`/api/floors/${params.floorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanImage: null }),
      });
      await loadFloor();
    } catch {
      alert(t("deleteImageError"));
    } finally {
      setUploading(false);
    }
  };

  if (!floor) {
    return <p className="text-slate-500">{t("loading")}</p>;
  }

  const selectedUnit = floor.units.find((u) => u.id === selectedPolygonId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[22px] font-semibold text-neutral-950">{t("floorPlanEditor")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {floor.building?.name} · {t("floor")} {floor.number}
          </p>
        </div>
        <Link
          href={`/portal/management-x7k9/projects/${params.projectId}/buildings/${params.buildingId}/floors`}
          className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          ← {t("backToFloors")}
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Editor Column */}
        <div className="min-w-0 space-y-3">
          {/* Image Upload */}
          <div className="rounded-[8px] border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">{t("floorPlan")}</h3>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {floor.floorPlanImage ? t("floorPlanUploaded") : t("floorPlanUploadHint")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
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
                  className={`cursor-pointer rounded-[6px] px-3 py-2 text-sm font-medium transition ${uploading
                    ? "bg-neutral-100 text-neutral-400"
                    : floor.floorPlanImage
                      ? "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                      : "bg-black text-white hover:bg-neutral-800"
                    }`}
                >
                  {uploading ? t("loading") : floor.floorPlanImage ? t("replaceImage") : t("uploadImage")}
                </label>
                {floor.floorPlanImage && (
                  <button
                    onClick={handleImageDelete}
                    disabled={uploading}
                    className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:text-neutral-400"
                  >
                    {tc("delete")}
                  </button>
                )}
                {SHOW_AI && (
                  <button
                    onClick={handleAIDetect}
                    disabled={aiDetecting || !floor.floorPlanImage}
                    className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:text-neutral-400"
                  >
                    {aiDetecting ? t("aiDetecting") : t("aiDetect")}
                  </button>
                )}
                <button
                  onClick={openCopyConfirm}
                  disabled={copying || copyConfirmLoading || floor.units.length === 0}
                  className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:text-neutral-400"
                  title={t("copyToAllFloors")}
                >
                  {copying ? t("copying") : copyConfirmLoading ? t("loading") : t("copyToAllFloors")}
                </button>
                <button
                  onClick={handleRenumberAll}
                  disabled={saving || floor.units.length === 0}
                  className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:text-neutral-400"
                  title={t("renumber")}
                >
                  {saving ? "..." : t("renumber")}
                </button>
              </div>
            </div>
          </div>

          {/* Polygon Editor */}
          <div className="rounded-[8px] border border-neutral-200 bg-white p-3 shadow-sm">
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
        <div className="space-y-3">
          {/* Unit Details Form */}
          {selectedPolygonId && selectedUnit ? (
            <div className="rounded-[8px] border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-neutral-950">{t("unitDetails")}</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">{t("unitNumberLabel")}</label>
                  <input
                    type="text"
                    value={unitForm.unitNumber}
                    onChange={(e) => setUnitForm({ ...unitForm, unitNumber: e.target.value })}
                    className="w-full rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">{t("roomsLabel")}</label>
                    <input
                      type="number"
                      value={unitForm.rooms}
                      onChange={(e) => setUnitForm({ ...unitForm, rooms: e.target.value })}
                      className="w-full rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">{t("areaM2")}</label>
                    <input
                      type="number"
                      value={unitForm.area}
                      onChange={(e) => setUnitForm({ ...unitForm, area: e.target.value })}
                      className="w-full rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">{t("status")}</label>
                  <select
                    value={unitForm.status}
                    onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                    className="w-full rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400"
                  >
                    <option value="available">{t("available")}</option>
                    <option value="reserved">{t("reserved")}</option>
                    <option value="sold">{t("sold")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    {t("pricePerM2Optional")}
                  </label>
                  <input
                    type="number"
                    value={unitForm.pricePerM2}
                    onChange={(e) => setUnitForm({ ...unitForm, pricePerM2: e.target.value })}
                    placeholder={floor.basePricePerM2?.toString() || t("useBasePrice")}
                    className="w-full rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400"
                  />
                </div>

                {/* Photos (up to 4) */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    {t("photosLabel")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["sketchImage", "sketchImage2", "sketchImage3", "sketchImage4"] as const).map((field, idx) => {
                      const photo = selectedUnit[field];
                      const slotNum = idx + 1;
                      return (
                        <div key={field} className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[6px] border border-neutral-200 bg-neutral-50">
                          {photo ? (
                            <>
                              <Image src={photo} alt={`Photo ${slotNum}`} fill className="object-cover" />
                              <button
                                onClick={async () => {
                                  await fetch(`/api/units/${selectedPolygonId}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ [field]: null }),
                                  });
                                  await loadFloor();
                                }}
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs text-white transition hover:bg-neutral-800"
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
                                    alert(t("imageUploadError"));
                                  } finally {
                                    setUploadingSlot(null);
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <label
                                htmlFor={`photo-upload-${slotNum}`}
                                className="flex cursor-pointer flex-col items-center gap-1 p-2 text-center text-neutral-400 transition hover:text-neutral-900"
                              >
                                {uploadingSlot === slotNum ? (
                                  <span className="text-xs">{t("loading")}</span>
                                ) : (
                                  <>
                                    <span className="text-lg text-slate-400">+</span>
                                    <span className="text-xs">{t("photoSlot", { n: slotNum })}</span>
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
                  className="w-full rounded-[6px] bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:bg-neutral-200"
                >
                  {saving ? t("saving") : tc("save")}
                </button>
                <button
                  type="button"
                  onClick={() => handlePolygonDelete(selectedPolygonId)}
                  disabled={saving}
                  className="w-full rounded-[6px] border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:text-neutral-400"
                >
                  {t("deleteUnit")}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[8px] border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-500">
              <p>{t("drawOrSelectUnit")}</p>
            </div>
          )}

          {/* Units List */}
          <div className="rounded-[8px] border border-neutral-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-neutral-950">{t("unitsListTitle", { count: floor.units.length })}</h3>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {floor.units.length === 0 ? (
                <p className="text-sm text-neutral-500">{t("noUnitsDrawn")}</p>
              ) : (
                floor.units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedPolygonId(unit.id)}
                    className={`flex w-full items-center justify-between rounded-[6px] border p-2 text-left transition ${selectedPolygonId === unit.id
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
                      }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{unit.unitNumber}</p>
                      <p className={`text-xs ${selectedPolygonId === unit.id ? "text-neutral-300" : "text-neutral-500"}`}>
                        {unit.rooms}R · {unit.area}m²
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${selectedPolygonId === unit.id
                        ? "bg-white/15 text-white"
                        : "bg-neutral-100 text-neutral-700"
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

      {/* Copy-to-all typed-confirm modal */}
      {copyConfirmOpen && copyConfirmInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[10px] bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-950">
              {t("copyToAllFloors")}
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              {t("copyConfirmFloors", { floors: copyConfirmInfo.targetFloors.map((f) => f.number).join(", ") || "—" })}
            </p>

            {copyConfirmInfo.targetFloors.length > 0 && (
              <div className="mt-3 rounded-[6px] border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {t("preservedPerFloor")}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-neutral-800">
                  {copyConfirmInfo.targetFloors.map((f) => (
                    <li key={f.id} className="flex items-center justify-between">
                      <span>{t("floor")} {f.number}</span>
                      <span className="text-neutral-500">
                        {t("reservedSoldPreserved", { count: f.preservedCount })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                {t("typeToConfirm", { number: floor.number })}
              </label>
              <input
                type="text"
                value={copyConfirmInput}
                onChange={(e) => setCopyConfirmInput(e.target.value)}
                className="w-full rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-400"
                autoFocus
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCopyConfirmOpen(false);
                  setCopyConfirmInfo(null);
                  setCopyConfirmInput("");
                }}
                disabled={copying}
                className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:text-neutral-400"
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={handleCopyToAllFloors}
                disabled={
                  copying || copyConfirmInput.trim() !== String(floor.number)
                }
                className="rounded-[6px] bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
              >
                {copying ? t("copying") : t("copyToAllFloors")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
