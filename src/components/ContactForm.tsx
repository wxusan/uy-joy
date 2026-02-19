"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  projectId: string;
  projectName: string;
}

export default function ContactForm({ projectId, projectName }: Props) {
  const t = useTranslations("contact");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          projectId,
          projectName,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setName("");
        setPhone("");
      } else {
        setError(t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-btn p-6 text-center">
        <span className="text-4xl block mb-3">✅</span>
        <p className="text-green-700 font-medium">{t("success")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-btn shadow-card p-5">
      <h3 className="font-heading text-lg font-semibold text-navy-900 mb-4">
        {t("title")}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("name")}
          className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-btn focus:ring-2 focus:ring-navy-900 focus:border-navy-900 outline-none transition text-sm"
          required
        />
        
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phone")}
          className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-btn focus:ring-2 focus:ring-navy-900 focus:border-navy-900 outline-none transition text-sm"
          required
        />
        
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy-900 text-white py-2.5 rounded-btn font-medium hover:bg-navy-800 disabled:bg-navy-400 transition text-sm"
        >
          {loading ? "..." : t("submit")}
        </button>
      </form>
    </div>
  );
}
