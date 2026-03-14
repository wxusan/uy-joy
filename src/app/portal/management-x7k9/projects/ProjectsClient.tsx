"use client";

import { useState } from "react";
import Link from "next/link";
import TopViewMapper from "@/components/admin/TopViewMapper";
import { Building2, Home, Map, Languages, Save } from "lucide-react";

type Lang = "uz" | "ru" | "en";

interface Building {
  id: string;
  name: string;
  polygonData: { x: number; y: number }[] | null;
}

interface Project {
  id: string;
  name: string;
  nameTranslations: string | null;
  description: string | null;
  descriptionTranslations: string | null;
  topViewImage: string | null;
  expectedYear: number | null;
  buildings: Building[];
}

interface Props {
  initialProject: Project | null;
}

export default function ProjectsClient({ initialProject }: Props) {
  const [project, setProject] = useState<Project | null>(initialProject);
  const [uploadingTopView, setUploadingTopView] = useState(false);
  const [showMapper, setShowMapper] = useState(false);

  // Multilingual text editor
  const [activeLang, setActiveLang] = useState<Lang>("uz");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const parseTrans = (json: string | null | undefined): Record<Lang, string> => {
    try { return { uz: "", ru: "", en: "", ...JSON.parse(json || "{}") }; }
    catch { return { uz: "", ru: "", en: "" }; }
  };

  const [names, setNames] = useState<Record<Lang, string>>(() =>
    parseTrans(initialProject?.nameTranslations)
  );
  const [descs, setDescs] = useState<Record<Lang, string>>(() =>
    parseTrans(initialProject?.descriptionTranslations)
  );

  const saveTexts = async () => {
    if (!project) return;
    setSaving(true);
    const nameJson = JSON.stringify({ uz: names.uz, ru: names.ru, en: names.en });
    const descJson = JSON.stringify({ uz: descs.uz, ru: descs.ru, en: descs.en });
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: names.uz || project.name,
        nameTranslations: nameJson,
        description: descs.uz || project.description,
        descriptionTranslations: descJson,
      }),
    });
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const loadProject = async () => {
    if (!project) return;
    const r = await fetch(`/api/projects/${project.id}`);
    setProject(await r.json());
  };

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

  if (!project) return <p className="text-slate-500">Loyiha topilmadi.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Loyiha</h1>
        <div className="flex gap-4 text-sm">
          <a href={`/projects/${project.id}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
            Saytda ko&apos;rish →
          </a>
          <a href={`/projects/${project.id}/explore`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
            Floor plan →
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Majmua ustidan ko&apos;rinishi</h2>
        <p className="text-sm text-slate-500 mb-4">Foydalanuvchilar bu rasmda binolarni bosib ko&apos;radi</p>
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-48 h-36 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
            {project.topViewImage ? (
              <img src={project.topViewImage} alt="Top view" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Map className="w-8 h-8 text-slate-300" />
                <span className="text-xs">Rasm yo&apos;q</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${uploadingTopView ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
              {uploadingTopView ? "Yuklanmoqda..." : "Rasm yuklash"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingTopView}
                onChange={(e) => e.target.files?.[0] && handleTopViewUpload(e.target.files[0])} />
            </label>
            {project.topViewImage && project.buildings?.length > 0 && (
              <button onClick={() => setShowMapper(true)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition">
                Binolar hududlarini belgilash
              </button>
            )}
          </div>
        </div>
      </div>

      {showMapper && project.topViewImage && (
        <TopViewMapper
          imageUrl={project.topViewImage}
          buildings={project.buildings.map((b) => ({ id: b.id, name: b.name, polygonData: b.polygonData || null }))}
          onClose={() => setShowMapper(false)}
          onSaved={async () => { setShowMapper(false); await loadProject(); }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href={`/portal/management-x7k9/projects/${project.id}/buildings`}
          className="group bg-white rounded-xl shadow-sm border p-6 hover:border-purple-400 hover:shadow-md transition">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 group-hover:text-purple-700 transition">Binolarni boshqarish</h3>
              <p className="text-sm text-slate-500 mt-1">Binolar qo&apos;shish, rasm yuklash, qavatlarni tahrirlash</p>
              <p className="text-xs text-purple-600 font-medium mt-2">{project.buildings?.length || 0} ta bino →</p>
            </div>
          </div>
        </Link>

        <Link href={`/portal/management-x7k9/projects/${project.id}/units`}
          className="group bg-white rounded-xl shadow-sm border p-6 hover:border-emerald-400 hover:shadow-md transition">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition">
              <Home className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 group-hover:text-emerald-700 transition">Kvartiralar holati</h3>
              <p className="text-sm text-slate-500 mt-1">Bo&apos;sh, band, sotilgan kvartiralarni boshqarish</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Multilingual text editor */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Languages className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-800">Loyiha nomi va tavsifi</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Saytda ko&apos;rsatiladigan matnlar — O&apos;zbek / Rus / Ingliz</p>

        {/* Language tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-5">
          {(["uz", "ru", "en"] as Lang[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${
                activeLang === lang
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {lang === "uz" ? "🇺🇿 UZ" : lang === "ru" ? "🇷🇺 RU" : "🇬🇧 EN"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loyiha nomi</label>
            <input
              type="text"
              value={names[activeLang]}
              onChange={(e) => setNames({ ...names, [activeLang]: e.target.value })}
              placeholder={activeLang === "uz" ? "Navruz Residence" : activeLang === "ru" ? "Навруз Резиденс" : "Navruz Residence"}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Majmua haqida (tavsif)</label>
            <textarea
              rows={4}
              value={descs[activeLang]}
              onChange={(e) => setDescs({ ...descs, [activeLang]: e.target.value })}
              placeholder={activeLang === "uz" ? "Toshkent markazida zamonaviy turar-joy majmuasi..." : activeLang === "ru" ? "Современный жилой комплекс в центре Ташкента..." : "Premium residential complex in the heart of Tashkent..."}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>
        </div>

        <button
          onClick={saveTexts}
          disabled={saving}
          className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            saveSuccess
              ? "bg-emerald-100 text-emerald-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saqlanmoqda..." : saveSuccess ? "Saqlandi ✓" : "Saqlash"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mt-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Topshirish yili</h2>
        <p className="text-sm text-slate-500 mb-3">Loyiha qachon topshiriladi (masalan: 2028)</p>
        <div className="flex items-center gap-3">
          <input
            type="number" min={2024} max={2040} placeholder="2028"
            value={project.expectedYear || ""}
            onChange={async (e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              setProject({ ...project, expectedYear: val });
              await fetch(`/api/projects/${project.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expectedYear: val }),
              });
            }}
            className="w-32 px-3 py-2 border rounded-lg text-lg font-semibold"
          />
          <span className="text-sm text-slate-400">yil</span>
        </div>
      </div>
    </div>
  );
}
