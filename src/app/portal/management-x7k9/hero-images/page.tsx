"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import TranslatedInput from "@/components/admin/TranslatedInput";

interface HeroImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export default function HeroImagesPage() {
  const t = useTranslations("admin");
  const [images, setImages] = useState<HeroImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project info state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nameTranslations: "", description: "", descriptionTranslations: "", address: "", addressTranslations: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadProject = async () => {
    const r = await fetch("/api/projects");
    const list = await r.json();
    const first = list[0];
    if (!first) return;
    const r2 = await fetch(`/api/projects/${first.id}`);
    const data = await r2.json();
    setProjectId(data.id);
    setForm({
      name: data.name || "",
      nameTranslations: data.nameTranslations || "",
      description: data.description || "",
      descriptionTranslations: data.descriptionTranslations || "",
      address: data.address || "",
      addressTranslations: data.addressTranslations || "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const loadImages = async () => {
    const res = await fetch("/api/hero-images");
    const data = await res.json();
    setImages(data);
  };

  useEffect(() => {
    loadImages();
    loadProject();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 3) {
      alert("Maksimum 3 ta rasm ruxsat etilgan / Maximum 3 images allowed");
      return;
    }

    setUploading(true);

    try {
      // Upload image
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

      // Create hero image record
      const createRes = await fetch("/api/hero-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!createRes.ok) throw new Error("Failed to save");

      await loadImages();
    } catch (error) {
      console.error("Error:", error);
      alert("Xatolik yuz berdi / Error occurred");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu rasmni o'chirmoqchimisiz? / Delete this image?")) return;

    try {
      await fetch(`/api/hero-images/${id}`, { method: "DELETE" });
      await loadImages();
    } catch (error) {
      console.error("Error:", error);
      alert("O'chirishda xatolik / Delete error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/portal/management-x7k9"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← {t("backToDashboard")}
          </Link>
          <h1 className="text-2xl font-bold">Bosh sahifa info</h1>
          <p className="text-slate-500 text-sm mt-1">
            Loyiha ma&apos;lumotlari va bosh sahifa rasmlari
          </p>
        </div>
      </div>

      {/* Project Info Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border p-6 mb-6 space-y-4">
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

      {/* Upload section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id="hero-upload"
          />
          <label
            htmlFor="hero-upload"
            className={`px-6 py-3 rounded-lg font-medium cursor-pointer transition ${
              images.length >= 3
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-navy-900 text-white hover:bg-navy-800"
            }`}
          >
            {uploading ? "Yuklanmoqda..." : "+ Rasm qoshish"}
          </label>
          <span className="text-slate-500">
            {images.length}/3 ta rasm
          </span>
        </div>
      </div>

      {/* Images grid */}
      {images.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center">
          <span className="text-4xl mb-4 block">🖼️</span>
          <p className="text-slate-500">Hali rasm yo&apos;q. Birinchi rasmni yuklang.</p>
          <p className="text-slate-400 text-sm mt-2">
            Rasmlar bosh sahifaning yuqori qismida ko&apos;rinadi.
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          images.length === 1 ? "grid-cols-1" : 
          images.length === 2 ? "grid-cols-2" : 
          "grid-cols-3"
        }`}>
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative bg-white rounded-xl shadow-sm border overflow-hidden group"
            >
              <div className="aspect-video">
                <img
                  src={img.imageUrl}
                  alt={`Hero ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button
                  onClick={() => handleDelete(img.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                >
                  O&apos;chirish
                </button>
              </div>
              <div className="absolute top-2 left-2 bg-navy-900 text-white px-2 py-1 rounded text-sm">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview note */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-800 text-sm">
          💡 <strong>Ko&apos;rib chiqish:</strong> Bosh sahifaga o&apos;ting va rasmlarni ko&apos;ring. 
          1 ta rasm bo&apos;lsa - to&apos;liq ekranda, 2 ta bo&apos;lsa - yonma-yon, 3 ta bo&apos;lsa - 1 katta + 2 kichik.
        </p>
      </div>
    </div>
  );
}
