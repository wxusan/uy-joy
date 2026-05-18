"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import TopViewMapper from "@/components/admin/TopViewMapper";
import { Building2, Home, Map, ArrowUpRight, Upload, Image as ImageIcon, Trash2 } from "lucide-react";

interface Building {
  id: string;
  name: string;
  frontViewImage: string | null;
  backViewImage: string | null;
  leftViewImage: string | null;
  rightViewImage: string | null;
  polygonData: { x: number; y: number }[] | null;
  floors?: { id: string }[];
}

interface Project {
  id: string;
  name: string;
  topViewImage: string | null;
  buildings: Building[];
}

interface HeroImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

interface Props {
  initialProject: Project | null;
  initialHeroImages: HeroImage[];
}

export default function ProjectsClient({ initialProject, initialHeroImages }: Props) {
  const t = useTranslations("admin");
  const [project, setProject] = useState<Project | null>(initialProject);
  const [uploadingTopView, setUploadingTopView] = useState(false);
  const [showMapper, setShowMapper] = useState(false);
  const [heroImages, setHeroImages] = useState<HeroImage[]>(initialHeroImages);
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

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

  const loadHeroImages = async () => {
    const r = await fetch("/api/hero-images");
    setHeroImages(await r.json());
  };

  const handleHeroUpload = async (file: File) => {
    if (heroImages.length >= 3) return;
    setUploadingHero(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "hero");
      formData.append("id", `hero-${Date.now()}`);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const { url } = await uploadRes.json();
      const createRes = await fetch("/api/hero-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!createRes.ok) throw new Error("Failed to save hero image");

      await loadHeroImages();
    } catch (error) {
      console.error("Hero upload failed:", error);
      alert(t("failedToSubmit"));
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = "";
    }
  };

  const handleHeroDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteImage"))) return;
    await fetch(`/api/hero-images/${id}`, { method: "DELETE" });
    await loadHeroImages();
  };

  if (!project) {
    return (
      <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
        {t("projectNotFound")}
      </p>
    );
  }

  const getBuildingPreview = (building: Building) =>
    building.frontViewImage ||
    building.backViewImage ||
    building.leftViewImage ||
    building.rightViewImage;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{t("projectsTitle")}</h1>
          <p className="a-page-sub">{t("projectsSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/projects/${project.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="a-btn"
          >
            {t("viewOnSite")}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <a
            href={`/projects/${project.id}/explore`}
            target="_blank"
            rel="noopener noreferrer"
            className="a-btn"
          >
            {t("floorPlan")}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Top-view image */}
      <section className="a-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: "var(--a-text)" }}>
              {t("topViewTitle")}
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--a-text-secondary)" }}>
              {t("topViewHint")}
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
                <span className="text-[11px]">{t("noImage")}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label
              className={`a-btn ${uploadingTopView ? "" : "a-btn-primary"}`}
              style={{ cursor: uploadingTopView ? "not-allowed" : "pointer" }}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadingTopView ? t("uploading") : t("uploadImage")}
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
                {t("mapBuildingAreas")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Homepage hero images */}
      <section className="a-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: "var(--a-text)" }}>
              {t("homepageImages")}
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--a-text-secondary)" }}>
              {t("homepageImagesHint")}
            </p>
          </div>
          <label
            className={`a-btn ${heroImages.length >= 3 || uploadingHero ? "" : "a-btn-primary"}`}
            style={{
              cursor: heroImages.length >= 3 || uploadingHero ? "not-allowed" : "pointer",
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            {uploadingHero ? t("uploading") : heroImages.length >= 3 ? t("limitReached") : t("upload")}
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={heroImages.length >= 3 || uploadingHero}
              onChange={(e) => e.target.files?.[0] && handleHeroUpload(e.target.files[0])}
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {heroImages.length === 0 ? (
            <div
              className="flex h-24 items-center justify-center gap-2 rounded border border-dashed sm:col-span-3"
              style={{
                borderColor: "var(--a-border)",
                color: "var(--a-text-tertiary)",
                background: "var(--a-bg-subtle)",
              }}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[12px]">{t("noHomepageImagesYet")}</span>
            </div>
          ) : (
            heroImages.map((image, index) => (
              <div
                key={image.id}
                className="group relative h-24 overflow-hidden rounded"
                style={{
                  background: "var(--a-bg-subtle)",
                  border: "1px solid var(--a-border)",
                }}
              >
                <img
                  src={image.imageUrl}
                  alt={`Homepage image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                  #{index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => handleHeroDelete(image.id)}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label={t("deleteImage")}
                  title={t("deleteImage")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
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
          {t("inventory")}
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
              {t("buildings")}
            </div>
            <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
              {t("buildingsDescription")}
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
        {project.buildings?.length > 0 && (
          <div
            className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
            style={{ borderBottom: "1px solid var(--a-border)" }}
          >
            {project.buildings.map((building) => {
              const preview = getBuildingPreview(building);

              return (
                <Link
                  key={building.id}
                  href={`/portal/management-x7k9/projects/${project.id}/images/${building.id}`}
                  className="group overflow-hidden rounded"
                  style={{
                    background: "var(--a-bg-subtle)",
                    border: "1px solid var(--a-border)",
                  }}
                >
                  <div className="relative h-28 overflow-hidden bg-[var(--a-bg-active)]">
                    {preview ? (
                      <img
                        src={preview}
                        alt={building.name}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center gap-2 text-[12px]"
                        style={{ color: "var(--a-text-tertiary)" }}
                      >
                        <ImageIcon className="h-4 w-4" />
                        {t("noBuildingImage")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium" style={{ color: "var(--a-text)" }}>
                        {building.name}
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
                        {building.floors?.length || 0} {t("floors")}
                      </div>
                    </div>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: "var(--a-text-tertiary)" }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
              {t("units")}
            </div>
            <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
              {t("unitsDescription")}
            </div>
          </div>
          <ArrowUpRight
            className="w-3.5 h-3.5"
            style={{ color: "var(--a-text-tertiary)" }}
          />
        </Link>
      </section>
    </div>
  );
}
