"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Building {
  id: string;
  name: string;
  sortOrder: number;
  frontViewImage: string | null;
  backViewImage: string | null;
  leftViewImage: string | null;
  rightViewImage: string | null;
  floors: { id: string; number: number; units: { id: string }[] }[];
}

interface Project {
  id: string;
  name: string;
  buildings: Building[];
}

export default function BuildingsPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingBuildingId, setUploadingBuildingId] = useState<string | null>(null);

  const loadProject = async () => {
    const res = await fetch(`/api/projects/${params.projectId}`);
    const data = await res.json();
    setProject(data);
  };

  useEffect(() => {
    loadProject();
  }, [params.projectId]);

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    setLoading(true);

    await fetch("/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newBuildingName,
        projectId: params.projectId,
        sortOrder: project?.buildings.length || 0,
      }),
    });

    setNewBuildingName("");
    await loadProject();
    setLoading(false);
  };

  const handleUpdateBuilding = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(true);

    await fetch(`/api/buildings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });

    setEditingId(null);
    await loadProject();
    setLoading(false);
  };

  const handleDeleteBuilding = async (id: string, name: string) => {
    if (!confirm(`Delete building "${name}"? This will also delete all floors and units.`)) return;
    setLoading(true);

    await fetch(`/api/buildings/${id}`, { method: "DELETE" });
    await loadProject();
    setLoading(false);
  };

  const handleImageUpload = async (
    buildingId: string,
    field: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBuildingId(buildingId);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "building");
    formData.append("id", buildingId);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const { url } = await uploadRes.json();

    await fetch(`/api/buildings/${buildingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: url }),
    });

    await loadProject();
    setUploadingBuildingId(null);
  };

  const handleImageDelete = async (buildingId: string, field: string) => {
    if (!confirm("Rasmni o'chirmoqchimisiz?")) return;
    setUploadingBuildingId(buildingId);
    await fetch(`/api/buildings/${buildingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: null }),
    });
    await loadProject();
    setUploadingBuildingId(null);
  };

  if (!project) {
    return <p className="text-slate-500">{t("loading")}</p>;
  }

  const sortedBuildings = [...project.buildings].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("buildings")}</h1>
          <p className="text-slate-500 text-sm">{project.name}</p>
        </div>
        <Link
          href="/portal/management-x7k9/projects"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Loyihalar
        </Link>
      </div>

      {/* Add Building Form */}
      <form onSubmit={handleAddBuilding} className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newBuildingName}
            onChange={(e) => setNewBuildingName(e.target.value)}
            placeholder={t("newBuildingName")}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newBuildingName.trim()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-300 transition"
          >
            {t("addBuilding")}
          </button>
        </div>
      </form>

      {/* Buildings List */}
      {sortedBuildings.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500">
          {t("noBuildingsYet")}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBuildings.map((building) => {
            const totalUnits = building.floors.reduce((sum, f) => sum + f.units.length, 0);

            return (
              <div
                key={building.id}
                className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4"
              >
                {/* Building Views - 4 angles */}
                <div className="flex gap-2 flex-shrink-0">
                  {([
                    { field: "frontViewImage", label: "Oldingi", image: building.frontViewImage },
                    { field: "backViewImage",  label: "Orqa",    image: building.backViewImage },
                    { field: "leftViewImage",  label: "Chap",    image: building.leftViewImage },
                    { field: "rightViewImage", label: "O\u2019ng",   image: building.rightViewImage },
                  ] as { field: string; label: string; image: string | null }[]).map(({ field, label, image }) => (
                    <div key={field} className="flex flex-col items-center gap-1 w-16">
                      <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden relative group">
                        {image ? (
                          <>
                            <img src={image} alt={label} className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleImageDelete(building.id, field)}
                              className="absolute top-0 right-0 w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-bl-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <label className="w-full h-full flex items-center justify-center text-slate-300 text-lg cursor-pointer hover:bg-slate-200 transition">
                            📷
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(building.id, field, e)}
                              disabled={uploadingBuildingId === building.id}
                            />
                          </label>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
                      {image && (
                        <label className="text-[9px] text-blue-600 hover:underline cursor-pointer">
                          O&apos;zgartirish
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(building.id, field, e)}
                            disabled={uploadingBuildingId === building.id}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                {/* Building Info */}
                <div className="flex-1">
                  {editingId === building.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-1 border rounded-lg text-lg font-semibold"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateBuilding(building.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm"
                      >
                        {tc("save")}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-slate-200 rounded-lg text-sm"
                      >
                        {tc("cancel")}
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-slate-800">{building.name}</h3>
                  )}
                  <p className="text-sm text-slate-500">
                    {building.floors.length} {t("floors")} · {totalUnits} {t("units")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/portal/management-x7k9/projects/${params.projectId}/buildings/${building.id}/floors`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    {t("manageFloors")}
                  </Link>
                  <button
                    onClick={() => {
                      setEditingId(building.id);
                      setEditName(building.name);
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition"
                  >
                    {tc("edit")}
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(building.id, building.name)}
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

      {/* Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
        <p className="font-medium mb-2">💡 {t("tips")}</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>{t("tipUploadFacade")}</li>
          <li>{t("tipFloorPositions")}</li>
          <li>{t("tipFloorPlanEditor")}</li>
        </ul>
      </div>
    </div>
  );
}
