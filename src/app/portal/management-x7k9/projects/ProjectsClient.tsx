"use client";

import { useState } from "react";
import Link from "next/link";
import TopViewMapper from "@/components/admin/TopViewMapper";
import { Building2, Home, Map, ArrowUpRight, Save, Upload } from "lucide-react";

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

  if (!project) {
    return (
      <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
        Loyiha topilmadi.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">Project</h1>
          <p className="a-page-sub">Manage buildings, units, content and translations</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/projects/${project.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="a-btn"
          >
            View on site
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <a
            href={`/projects/${project.id}/explore`}
            target="_blank"
            rel="noopener noreferrer"
            className="a-btn"
          >
            Floor plan
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Top-view image */}
      <section className="a-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: "var(--a-text)" }}>
              Top-view of the complex
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--a-text-secondary)" }}>
              Visitors click buildings on this image
            </p>
          </div>
        </div>
        <div className="flex items-start gap-5 flex-wrap">
          <div
            className="w-48 h-32 overflow-hidden flex-shrink-0"
            style={{
              background: "var(--a-bg-subtle)",
              border: "1px solid var(--a-border)",
              borderRadius: "var(--a-radius-sm)",
            }}
          >
            {project.topViewImage ? (
              <img
                src={project.topViewImage}
                alt="Top view"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2"
                style={{ color: "var(--a-text-tertiary)" }}
              >
                <Map className="w-6 h-6" />
                <span className="text-[11px]">No image</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label
              className={`a-btn ${uploadingTopView ? "" : "a-btn-primary"}`}
              style={{ cursor: uploadingTopView ? "not-allowed" : "pointer" }}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadingTopView ? "Uploading…" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingTopView}
                onChange={(e) =>
                  e.target.files?.[0] && handleTopViewUpload(e.target.files[0])
                }
              />
            </label>
            {project.topViewImage && project.buildings?.length > 0 && (
              <button onClick={() => setShowMapper(true)} className="a-btn">
                Map building areas
              </button>
            )}
          </div>
        </div>
      </section>

      {showMapper && project.topViewImage && (
        <TopViewMapper
          imageUrl={project.topViewImage}
          buildings={project.buildings.map((b) => ({
            id: b.id,
            name: b.name,
            polygonData: b.polygonData || null,
          }))}
          onClose={() => setShowMapper(false)}
          onSaved={async () => {
            setShowMapper(false);
            await loadProject();
          }}
        />
      )}

      {/* Manage Buildings / Units — now quiet rows, not big colorful tiles */}
      <section className="a-card overflow-hidden">
        <div
          className="px-4 py-3 text-[13px] font-semibold"
          style={{
            color: "var(--a-text)",
            borderBottom: "1px solid var(--a-border)",
          }}
        >
          Inventory
        </div>
        <Link
          href={`/portal/management-x7k9/projects/${project.id}/buildings`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--a-bg-hover)]"
          style={{ borderBottom: "1px solid var(--a-border)" }}
        >
          <Building2
            className="w-[14px] h-[14px]"
            style={{ color: "var(--a-text-tertiary)" }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: "var(--a-text)" }}>
              Buildings
            </div>
            <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
              Add buildings, upload facade images, edit floors
            </div>
          </div>
          <span className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
            {project.buildings?.length || 0}
          </span>
          <ArrowUpRight
            className="w-3.5 h-3.5"
            style={{ color: "var(--a-text-tertiary)" }}
          />
        </Link>
        <Link
          href={`/portal/management-x7k9/projects/${project.id}/units`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--a-bg-hover)]"
        >
          <Home
            className="w-[14px] h-[14px]"
            style={{ color: "var(--a-text-tertiary)" }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: "var(--a-text)" }}>
              Units
            </div>
            <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
              Manage available, reserved and sold apartments
            </div>
          </div>
          <ArrowUpRight
            className="w-3.5 h-3.5"
            style={{ color: "var(--a-text-tertiary)" }}
          />
        </Link>
      </section>

      {/* Multilingual text editor */}
      <section className="a-card p-4 sm:p-5">
        <h2 className="text-[14px] font-semibold mb-1" style={{ color: "var(--a-text)" }}>
          Project name and description
        </h2>
        <p className="text-[12px] mb-4" style={{ color: "var(--a-text-secondary)" }}>
          Public-facing copy — Uzbek / Russian / English
        </p>

        {/* Language tabs */}
        <div
          className="inline-flex items-center gap-0 mb-4 p-0.5"
          style={{
            background: "var(--a-bg-active)",
            borderRadius: "var(--a-radius-sm)",
          }}
        >
          {(["uz", "ru", "en"] as Lang[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className="px-3 py-1 text-[12px] font-medium uppercase tracking-wide"
              style={{
                background: activeLang === lang ? "var(--a-bg)" : "transparent",
                color:
                  activeLang === lang
                    ? "var(--a-text)"
                    : "var(--a-text-secondary)",
                borderRadius: "calc(var(--a-radius-sm) - 1px)",
                border:
                  activeLang === lang
                    ? "1px solid var(--a-border)"
                    : "1px solid transparent",
              }}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: "var(--a-text-secondary)" }}
            >
              Project name
            </label>
            <input
              type="text"
              value={names[activeLang]}
              onChange={(e) => setNames({ ...names, [activeLang]: e.target.value })}
              placeholder={
                activeLang === "uz"
                  ? "Navruz Residence"
                  : activeLang === "ru"
                  ? "Навруз Резиденс"
                  : "Navruz Residence"
              }
              className="a-input"
            />
          </div>
          <div>
            <label
              className="block text-[12px] font-medium mb-1"
              style={{ color: "var(--a-text-secondary)" }}
            >
              About the complex
            </label>
            <textarea
              rows={4}
              value={descs[activeLang]}
              onChange={(e) => setDescs({ ...descs, [activeLang]: e.target.value })}
              placeholder={
                activeLang === "uz"
                  ? "Toshkent markazida zamonaviy turar-joy majmuasi…"
                  : activeLang === "ru"
                  ? "Современный жилой комплекс в центре Ташкента…"
                  : "Premium residential complex in the heart of Tashkent…"
              }
              className="a-input"
              style={{ resize: "vertical", padding: "8px 10px" }}
            />
          </div>
        </div>

        <button
          onClick={saveTexts}
          disabled={saving}
          className="a-btn a-btn-primary mt-4"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : saveSuccess ? "Saved ✓" : "Save"}
        </button>
      </section>

      {/* Expected year */}
      <section className="a-card p-4 sm:p-5">
        <h2 className="text-[14px] font-semibold mb-1" style={{ color: "var(--a-text)" }}>
          Expected completion
        </h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--a-text-secondary)" }}>
          Year the project is expected to be delivered (e.g. 2028)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={2024}
            max={2040}
            placeholder="2028"
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
            className="a-input"
            style={{ width: 96, fontWeight: 600 }}
          />
          <span className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
            year
          </span>
        </div>
      </section>
    </div>
  );
}
