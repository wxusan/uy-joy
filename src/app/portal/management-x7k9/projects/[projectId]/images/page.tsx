"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import TopViewMapper from "@/components/admin/TopViewMapper";
import TranslatedInput from "@/components/admin/TranslatedInput";

interface Floor {
  id: string;
  number: number;
}

interface Building {
  id: string;
  name: string;
  frontViewImage: string | null;
  positionData: string | null;
  floors: Floor[];
}

interface Project {
  id: string;
  name: string;
  nameTranslations: string | null;
  description: string | null;
  descriptionTranslations: string | null;
  address: string | null;
  addressTranslations: string | null;
  topViewImage: string | null;
  buildings: Building[];
}

export default function ProjectImagesPage() {
  const params = useParams();
  const t = useTranslations("admin");
  const [project, setProject] = useState<Project | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [form, setForm] = useState({ name: "", nameTranslations: "", description: "", descriptionTranslations: "", address: "", addressTranslations: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadProject = async () => {
    const r = await fetch(`/api/projects/${params.projectId}`);
    const data = await r.json();
    setProject(data);
    setForm({
      name: data.name || "",
      nameTranslations: data.nameTranslations || "",
      description: data.description || "",
      descriptionTranslations: data.descriptionTranslations || "",
      address: data.address || "",
      addressTranslations: data.addressTranslations || "",
    });
  };

  useEffect(() => { loadProject(); }, [params.projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const uploadImage = async (file: File) => {
    if (!project) return;
    setUploading("project-topview");
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "project");
    formData.append("id", project.id);
    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();
      await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topViewImage: url }),
      });
      setMessage({ type: "success", text: "Rasm muvaffaqiyatli yuklandi!" });
      setProject({ ...project, topViewImage: url });
    } catch {
      setMessage({ type: "error", text: "Rasm yuklashda xatolik" });
    } finally {
      setUploading(null);
    }
  };

  if (!project) return <p className="text-slate-500">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bosh sahifa ma&apos;lumotlari</h1>
          <p className="text-slate-500 text-sm">{project.name}</p>
        </div>
        <Link href={`/portal/management-x7k9/projects`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Loyihaga qaytish
        </Link>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${ message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800" }`}>
          {message.text}
        </div>
      )}

      {/* Project Info (text fields) */}
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Loyiha ma&apos;lumotlari</h2>
        <TranslatedInput
          label={t("projectName")}
          value={form.name}
          translationsJson={form.nameTranslations}
          onChange={(v, tr) => setForm({ ...form, name: v, nameTranslations: tr })}
          placeholder={t("projectName")}
        />
        <TranslatedInput
          label={t("description")}
          value={form.description}
          translationsJson={form.descriptionTranslations}
          onChange={(v, tr) => setForm({ ...form, description: v, descriptionTranslations: tr })}
          multiline
          placeholder={t("description")}
        />
        <TranslatedInput
          label={t("address")}
          value={form.address}
          translationsJson={form.addressTranslations}
          onChange={(v, tr) => setForm({ ...form, address: v, addressTranslations: tr })}
          placeholder={t("address")}
        />
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-2 rounded-lg font-medium transition">
            {saving ? t("saving") : t("saveChanges")}
          </button>
          {saved && <span className="text-emerald-600 text-sm font-medium">✓ Saqlandi!</span>}
        </div>
      </form>

      {/* Project Top View */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Loyiha ustidan ko&apos;rinishi</h2>
        <p className="text-sm text-slate-500 mb-4">
          Butun majmuaning yuqoridan ko&apos;rinishi. Foydalanuvchilar bu rasmda binolarni bosadi.
        </p>
        <div className="flex items-start gap-6">
          <div className="w-48 h-36 bg-slate-100 rounded-lg overflow-hidden">
            {project.topViewImage ? (
              <img src={project.topViewImage} alt="Top view" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                Rasm yo&apos;q
              </div>
            )}
          </div>
          <div className="space-y-3">
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              className="hidden" id="project-topview" disabled={uploading !== null} />
            <label htmlFor="project-topview"
              className={`inline-block px-4 py-2 rounded-lg cursor-pointer transition ${
                uploading === "project-topview" ? "bg-slate-200 text-slate-500" : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}>
              {uploading === "project-topview" ? "Yuklanmoqda..." : "Rasm yuklash"}
            </label>
            {project.topViewImage && project.buildings.length > 0 && (
              <button onClick={() => setShowMapper(true)}
                className="block px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">
                Binolar hududlarini belgilang
              </button>
            )}
          </div>
        </div>
      </section>
      {showMapper && project?.topViewImage && (
        <TopViewMapper
          imageUrl={project.topViewImage}
          buildings={project.buildings.map(b => ({ id: b.id, name: b.name, positionData: (b as any).positionData || null }))}
          onClose={() => setShowMapper(false)}
          onSaved={async () => { setShowMapper(false); await loadProject(); setMessage({ type:'success', text:'Saved building areas' }); }}
        />
      )}

      {/* Building Selection */}
      <section className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Binolar</h2>
        <p className="text-sm text-slate-500 mb-4">
          Bino rasmlarini boshqarish uchun binoni tanlang
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {project.buildings.map((building) => (
            <Link
              key={building.id}
              href={`/portal/management-x7k9/projects/${params.projectId}/images/${building.id}`}
              className="group block"
            >
              <div className="bg-slate-50 rounded-xl p-4 border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50 transition">
                {/* Building Preview */}
                <div className="w-full aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden mb-3">
                  {building.frontViewImage ? (
                    <img
                      src={building.frontViewImage}
                      alt={building.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="text-4xl">🏢</span>
                    </div>
                  )}
                </div>
                
                {/* Building Info */}
                <h3 className="font-semibold text-slate-800 group-hover:text-emerald-700 transition">
                  {building.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {building.floors.length} ta qavat
                </p>
                
                {/* Arrow */}
                <div className="mt-2 text-emerald-600 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  Rasmlarni boshqarish →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
