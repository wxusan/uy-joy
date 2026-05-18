"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface Floor {
  id: string;
  number: number;
  units: { id: string }[];
}

interface Building {
  id: string;
  name: string;
  sortOrder: number;
  frontViewImage: string | null;
  backViewImage: string | null;
  leftViewImage: string | null;
  rightViewImage: string | null;
  floors: Floor[];
}

interface Project {
  id: string;
  name: string;
  buildings: Building[];
}

interface Props {
  initialProject: Project;
  projectId: string;
}

export default function BuildingsClient({ initialProject, projectId }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [project, setProject] = useState<Project>(initialProject);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingBuildingId, setUploadingBuildingId] = useState<string | null>(null);

  const loadProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    setProject(await res.json());
  };

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    setLoading(true);
    await fetch("/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBuildingName, projectId, sortOrder: project.buildings.length }),
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
    if (!confirm(t("confirmDeleteBuildingMsg", { name }))) return;
    setLoading(true);
    await fetch(`/api/buildings/${id}`, { method: "DELETE" });
    await loadProject();
    setLoading(false);
  };

  const handleImageUpload = async (buildingId: string, field: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!confirm(t("confirmDeleteImage"))) return;
    setUploadingBuildingId(buildingId);
    await fetch(`/api/buildings/${buildingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: null }),
    });
    await loadProject();
    setUploadingBuildingId(null);
  };

  const sortedBuildings = [...project.buildings].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-neutral-950">{t("buildings")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{project.name}</p>
        </div>
        <Link
          href="/portal/management-x7k9/projects"
          className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          ← {t("projects")}
        </Link>
      </div>

      <form onSubmit={handleAddBuilding} className="rounded-[8px] border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text" value={newBuildingName} onChange={(e) => setNewBuildingName(e.target.value)}
            placeholder={t("newBuildingName")} disabled={loading}
            className="min-h-11 flex-1 rounded-[6px] border border-neutral-200 px-4 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
          />
          <button type="submit" disabled={loading || !newBuildingName.trim()}
            className="min-h-11 rounded-[6px] bg-black px-6 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400">
            {t("addBuilding")}
          </button>
        </div>
      </form>

      {sortedBuildings.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">{t("noBuildingsYet")}</div>
      ) : (
        <div className="space-y-3">
          {sortedBuildings.map((building) => {
            const totalUnits = building.floors.reduce((sum, f) => sum + f.units.length, 0);
            return (
              <div key={building.id} className="flex flex-col gap-4 rounded-[8px] border border-neutral-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
                <div className="grid flex-shrink-0 grid-cols-4 gap-2">
                  {([
                    { field: "frontViewImage", label: t("front"), image: building.frontViewImage },
                    { field: "backViewImage", label: t("back"), image: building.backViewImage },
                    { field: "leftViewImage", label: t("left"), image: building.leftViewImage },
                    { field: "rightViewImage", label: t("right"), image: building.rightViewImage },
                  ] as { field: string; label: string; image: string | null }[]).map(({ field, label, image }) => (
                    <div key={field} className="flex w-[72px] flex-col items-center gap-1">
                      <div className="group relative h-[64px] w-[72px] overflow-hidden rounded-[6px] border border-neutral-200 bg-neutral-100">
                        {image ? (
                          <>
                            <Image src={image} alt={label} fill className="object-cover" sizes="72px" />
                            <button onClick={() => handleImageDelete(building.id, field)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white opacity-0 transition hover:bg-neutral-800 group-hover:opacity-100">
                              ✕
                            </button>
                          </>
                        ) : (
                          <label className="flex h-full w-full cursor-pointer items-center justify-center px-1 text-center text-xs font-medium text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700">
                            {t("uploadBuildingImage")}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => handleImageUpload(building.id, field, e)}
                              disabled={uploadingBuildingId === building.id} />
                          </label>
                        )}
                      </div>
                      <span className="text-center text-[10px] leading-tight text-neutral-500">{label}</span>
                      {image && (
                        <label className="cursor-pointer text-[9px] font-medium text-neutral-500 hover:text-neutral-900">
                          {t("replace")}
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => handleImageUpload(building.id, field, e)}
                            disabled={uploadingBuildingId === building.id} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                <div className="min-w-0 flex-1">
                  {editingId === building.id ? (
                    <div className="flex flex-wrap gap-2">
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="rounded-[6px] border border-neutral-200 px-3 py-2 text-sm font-semibold outline-none transition focus:border-neutral-400" autoFocus />
                      <button onClick={() => handleUpdateBuilding(building.id)}
                        className="rounded-[6px] bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">{tc("save")}</button>
                      <button onClick={() => setEditingId(null)}
                        className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">{tc("cancel")}</button>
                    </div>
                  ) : (
                    <h3 className="truncate text-base font-semibold text-neutral-950">{building.name}</h3>
                  )}
                  <p className="mt-1 text-sm text-neutral-500">{building.floors.length} {t("floors")} · {totalUnits} {t("units")}</p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={`/portal/management-x7k9/projects/${projectId}/buildings/${building.id}/floors`}
                    className="rounded-[6px] bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">
                    {t("manageFloors")}
                  </Link>
                  <button onClick={() => { setEditingId(building.id); setEditName(building.name); }}
                    className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                    {tc("edit")}
                  </button>
                  <button onClick={() => handleDeleteBuilding(building.id, building.name)}
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
