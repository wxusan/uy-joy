"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopViewMapper from "@/components/admin/TopViewMapper";

export default function AdminProjects() {
  const [project, setProject] = useState<any>(null);
  const [uploadingTopView, setUploadingTopView] = useState(false);
  const [showMapper, setShowMapper] = useState(false);

  const loadProject = async () => {
    const r = await fetch("/api/projects");
    const list = await r.json();
    const first = list[0];
    if (!first) return;
    const r2 = await fetch(`/api/projects/${first.id}`);
    setProject(await r2.json());
  };

  useEffect(() => { loadProject(); }, []);

  const handleTopViewUpload = async (file: File) => {
    if (!project) return;
    setUploadingTopView(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "project");
    formData.append("id", project.id);
    const r = await fetch("/api/upload", { method: "POST", body: formData });
    const { url } = await r.json();
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topViewImage: url }),
    });
    setUploadingTopView(false);
    await loadProject();
  };

  if (!project) return <p className="text-slate-500">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loyiha</h1>
        <div className="flex gap-4 text-sm">
          <a href={`/projects/${project.id}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
            Saytda ko&apos;rish →
          </a>
          <a href={`/projects/${project.id}/explore`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
            Floor plan →
          </a>
        </div>
      </div>

      {/* Top-View Image + Mapper */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Majmua ustidan ko&apos;rinishi</h2>
        <p className="text-sm text-slate-500 mb-4">Foydalanuvchilar bu rasmda binolarni bosib ko&apos;radi</p>
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-48 h-36 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
            {project.topViewImage ? (
              <img src={project.topViewImage} alt="Top view" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <span className="text-3xl">🗺️</span>
                <span className="text-xs">Rasm yo&apos;q</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
              uploadingTopView ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}>
              {uploadingTopView ? "Yuklanmoqda..." : "📷 Rasm yuklash"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingTopView}
                onChange={(e) => e.target.files?.[0] && handleTopViewUpload(e.target.files[0])} />
            </label>
            {project.topViewImage && project.buildings?.length > 0 && (
              <button onClick={() => setShowMapper(true)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition">
                🗺 Binolar hududlarini belgilash
              </button>
            )}
          </div>
        </div>
      </div>

      {showMapper && project.topViewImage && (
        <TopViewMapper
          imageUrl={project.topViewImage}
          buildings={project.buildings.map((b: any) => ({ id: b.id, name: b.name, positionData: b.positionData || null }))}
          onClose={() => setShowMapper(false)}
          onSaved={async () => { setShowMapper(false); await loadProject(); }}
        />
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={`/portal/management-x7k9/projects/${project.id}/buildings`}
          className="group bg-white rounded-xl shadow-sm border p-6 hover:border-purple-400 hover:shadow-md transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-purple-200 transition">🏢</div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 group-hover:text-purple-700 transition">Binolarni boshqarish</h3>
              <p className="text-sm text-slate-500 mt-1">Binolar qo&apos;shish, rasm yuklash, qavatlarni tahrirlash</p>
              <p className="text-xs text-purple-600 font-medium mt-2">{project.buildings?.length || 0} ta bino →</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/portal/management-x7k9/projects/${project.id}/units`}
          className="group bg-white rounded-xl shadow-sm border p-6 hover:border-emerald-400 hover:shadow-md transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-emerald-200 transition">🏠</div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 group-hover:text-emerald-700 transition">Kvartiralar holati</h3>
              <p className="text-sm text-slate-500 mt-1">Bo&apos;sh, band, sotilgan kvartiralarni boshqarish</p>
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
