"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { roleHasPlatformPermission } from "@/lib/platform-plans";

interface FAQ {
  id: string;
  questionUz: string;
  questionEn: string;
  questionRu: string;
  answerUz: string;
  answerEn: string;
  answerRu: string;
  sortOrder: number;
}

const emptyFAQ = {
  questionUz: "",
  questionEn: "",
  questionRu: "",
  answerUz: "",
  answerEn: "",
  answerRu: "",
};

export default function FAQsPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyFAQ);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFAQs = async () => {
    const res = await fetch("/api/faqs");
    if (!res.ok) {
      setFaqs([]);
      return;
    }
    const data = await res.json();
    setFaqs(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadFAQs();
  }, []);

  const handleSave = async () => {
    if (!formData.questionUz || !formData.answerUz) {
      alert(t("requireUzQuestion"));
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await fetch(`/api/faqs/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      await loadFAQs();
      setEditingId(null);
      setIsAdding(false);
      setFormData(emptyFAQ);
    } catch (error) {
      console.error("Error:", error);
      alert(t("errorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteQuestion"))) return;

    try {
      await fetch(`/api/faqs/${id}`, { method: "DELETE" });
      await loadFAQs();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setIsAdding(false);
    setFormData({
      questionUz: faq.questionUz,
      questionEn: faq.questionEn,
      questionRu: faq.questionRu,
      answerUz: faq.answerUz,
      answerEn: faq.answerEn,
      answerRu: faq.answerRu,
    });
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData(emptyFAQ);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData(emptyFAQ);
  };

  if (!roleHasPlatformPermission(role, "managePublicContent")) {
    return (
      <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
        {t("accessDenied")}
      </p>
    );
  }

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
          <h1 className="text-2xl font-bold">{t("faqTitle")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t("faqSubtitle")}
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={startAdd}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            {t("addQuestion")}
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            {editingId ? t("editQuestion") : t("newQuestion")}
          </h2>

          <div className="space-y-6">
            {/* Uzbek */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-3">{t("uzLang")}</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t("questionLabel")}
                  value={formData.questionUz}
                  onChange={(e) => setFormData({ ...formData, questionUz: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder={t("answerLabel")}
                  value={formData.answerUz}
                  onChange={(e) => setFormData({ ...formData, answerUz: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg resize-none"
                />
              </div>
            </div>

            {/* English */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-medium text-slate-700 mb-3">{t("enLang")}</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t("questionLabel")}
                  value={formData.questionEn}
                  onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder={t("answerLabel")}
                  value={formData.answerEn}
                  onChange={(e) => setFormData({ ...formData, answerEn: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg resize-none"
                />
              </div>
            </div>

            {/* Russian */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-medium text-slate-700 mb-3">{t("ruLang")}</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t("questionLabel")}
                  value={formData.questionRu}
                  onChange={(e) => setFormData({ ...formData, questionRu: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder={t("answerLabel")}
                  value={formData.answerRu}
                  onChange={(e) => setFormData({ ...formData, answerRu: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-slate-300 transition"
            >
              {saving ? t("saving") : tc("save")}
            </button>
            <button
              onClick={cancelEdit}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center">
          <span className="text-4xl mb-4 block">❓</span>
          <p className="text-slate-500">{t("noQuestionsYet")}</p>
          <p className="text-slate-400 text-sm mt-2">
            {t("addFirstQuestion")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className="bg-white rounded-xl shadow-sm border p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-slate-800">
                      {faq.questionUz}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-2">
                    {faq.answerUz}
                  </p>
                  {(faq.questionEn || faq.questionRu) && (
                    <div className="flex gap-2 mt-2">
                      {faq.questionEn && (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">🇬🇧 EN</span>
                      )}
                      {faq.questionRu && (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">🇷🇺 RU</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(faq)}
                    className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    {tc("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  >
                    {tc("delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-amber-800 text-sm">
          <strong>ℹ</strong> {t("faqNote")}
        </p>
      </div>
    </div>
  );
}
