"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Floor {
  id: string;
  number: number;
  floorPlanImage: string | null;
}

interface Building {
  id: string;
  name: string;
  frontViewImage: string | null;
  backViewImage: string | null;
  leftViewImage: string | null;
  rightViewImage: string | null;
  floors: Floor[];
}

export default function BuildingImagesPage() {
  const params = useParams();
  const tc = useTranslations("common");
  const [building, setBuilding] = useState<Building | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadBuilding = () => {
    fetch(`/api/buildings/${params.buildingId}`)
      .then((r) => r.json())
      .then(setBuilding);
  };

  useEffect(() => {
    loadBuilding();
  }, [params.buildingId]);

  const uploadImage = async (file: File, type: string, id: string, field: string) => {
    setUploading(`${type}-${id}-${field}`);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("id", id);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const { url } = await uploadRes.json();

      // Update the database with the new URL
      const endpoint = type === "building" 
        ? `/api/buildings/${id}` 
        : `/api/floors/${id}`;

      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: url }),
      });

      setMessage({ type: "success", text: "Rasm muvaffaqiyatli yuklandi!" });
      loadBuilding();
    } catch {
      setMessage({ type: "error", text: "Rasm yuklashda xatolik" });
    } finally {
      setUploading(null);
    }
  };

  const deleteImage = async (type: string, id: string, field: string) => {
    if (!confirm("Rasmni o'chirmoqchimisiz?")) return;
    setUploading(`${type}-${id}-${field}`);
    setMessage(null);

    try {
      const endpoint = type === "building" 
        ? `/api/buildings/${id}` 
        : `/api/floors/${id}`;

      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: null }),
      });

      setMessage({ type: "success", text: "Rasm o'chirildi!" });
      loadBuilding();
    } catch {
      setMessage({ type: "error", text: "O'chirishda xatolik" });
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string,
    id: string,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file, type, id, field);
    }
  };

  if (!building) {
    return <p className="text-slate-500">{tc("loading")}</p>;
  }

  const viewLabels: Record<string, string> = {
    front: "Old ko\u2019rinish",
    back: "Orqa ko\u2019rinish",
    left: "Chap ko\u2019rinish",
    right: "O\u2019ng ko\u2019rinish",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{building.name}</h1>
          <p className="text-slate-500 text-sm">Bino rasmlarini boshqarish</p>
        </div>
        <Link
          href={`/portal/management-x7k9/projects/${params.projectId}/images`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Rasmlarga qaytish
        </Link>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Building Views */}
      <section className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Bino ko&apos;rinishlari</h2>
        <p className="text-sm text-slate-500 mb-4">
          Binoning old, orqa, chap va o&apos;ng tomonlaridan rasmlarini yuklang.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(["front", "back", "left", "right"] as const).map((view) => {
            const fieldName = `${view}ViewImage` as keyof Building;
            const imageUrl = building[fieldName] as string | null;
            const uploadKey = `building-${building.id}-${fieldName}`;

            return (
              <div key={view}>
                <p className="text-sm font-medium text-slate-700 mb-2">{viewLabels[view]}</p>
                <div className="w-full aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden mb-2 relative group">
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt={`${view} view`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => deleteImage("building", building.id, fieldName)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-sm"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                      Rasm yo&apos;q
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "building", building.id, fieldName)}
                  className="hidden"
                  id={uploadKey}
                  disabled={uploading !== null}
                />
                <label
                  htmlFor={uploadKey}
                  className={`block text-center px-3 py-1.5 rounded text-sm cursor-pointer transition ${
                    uploading === uploadKey
                      ? "bg-slate-200 text-slate-500"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {uploading === uploadKey ? "Yuklanmoqda..." : imageUrl ? "O'zgartirish" : "Yuklash"}
                </label>
              </div>
            );
          })}
        </div>
      </section>

      {/* Floor Plans */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Qavat rejalari</h2>
        <p className="text-sm text-slate-500 mb-4">
          Har bir qavat uchun reja rasmini yuklang. Bu rasmlar kvartiralarni ko&apos;rsatish uchun ishlatiladi.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {building.floors
            .sort((a, b) => b.number - a.number)
            .map((floor) => {
              const uploadKey = `floor-${floor.id}-floorPlanImage`;

              return (
                <div key={floor.id} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm font-semibold text-slate-700 mb-2 text-center">
                    {floor.number}-qavat
                  </p>
                  <div className="w-full aspect-square bg-white rounded-lg overflow-hidden mb-2 border relative group">
                    {floor.floorPlanImage ? (
                      <>
                        <img
                          src={floor.floorPlanImage}
                          alt={`Floor ${floor.number} plan`}
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => deleteImage("floor", floor.id, "floorPlanImage")}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Rasm yo&apos;q
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "floor", floor.id, "floorPlanImage")}
                    className="hidden"
                    id={uploadKey}
                    disabled={uploading !== null}
                  />
                  <label
                    htmlFor={uploadKey}
                    className={`block text-center px-3 py-1.5 rounded text-sm cursor-pointer transition ${
                      uploading === uploadKey
                        ? "bg-slate-200 text-slate-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {uploading === uploadKey ? "..." : floor.floorPlanImage ? "O'zgartirish" : "Yuklash"}
                  </label>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
