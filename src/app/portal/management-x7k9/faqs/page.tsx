"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

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
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyFAQ);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFAQs = async () => {
    const res = await fetch("/api/faqs");
    const data = await res.json();
    setFaqs(data);
  };

  useEffect(() => {
    loadFAQs();
  }, []);

  const handleSave = async () => {
    if (!formData.questionUz || !formData.answerUz) {
      alert("Savol va javobni kiriting (kamida O&apos;zbek tilida)");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        // Update
        await fetch(`/api/faqs/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        // Create
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
      alert("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu savolni o&apos;chirmoqchimisiz?")) return;

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
          <h1 className="text-2xl font-bold">FAQ - Savollar va Javoblar</h1>
          <p className="text-slate-500 text-sm mt-1">
            Bosh sahifada ko&apos;rinadigan savollar
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={startAdd}
            className="px-4 py-2 bg-navy-900 text-white rounded-lg font-medium hover:bg-navy-800 transition"
          >
            + Savol qo&apos;shish
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            {editingId ? "Savolni tahrirlash" : "Yangi savol"}
          </h2>

          <div className="space-y-6">
            {/* Uzbek */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-3">🇺🇿 O&apos;zbek tilida</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Savol"
                  value={formData.questionUz}
                  onChange={(e) => setFormData({ ...formData, questionUz: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder="Javob"
                  value={formData.answerUz}
                  onChange={(e) => setFormData({ ...formData, answerUz: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg resize-none"
                />
              </div>
            </div>

            {/* English */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-medium text-slate-700 mb-3">🇬🇧 English</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Question"
                  value={formData.questionEn}
                  onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder="Answer"
                  value={formData.answerEn}
                  onChange={(e) => setFormData({ ...formData, answerEn: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg resize-none"
                />
              </div>
            </div>

            {/* Russian */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-medium text-slate-700 mb-3">🇷🇺 Русский</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Вопрос"
                  value={formData.questionRu}
                  onChange={(e) => setFormData({ ...formData, questionRu: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder="Ответ"
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
              className="px-6 py-2 bg-navy-900 text-white rounded-lg font-medium hover:bg-navy-800 disabled:bg-slate-300 transition"
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              onClick={cancelEdit}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      )}

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center">
          <span className="text-4xl mb-4 block">❓</span>
          <p className="text-slate-500">Hali savollar yo&apos;q.</p>
          <p className="text-slate-400 text-sm mt-2">
            Yuqoridagi tugmani bosib birinchi savolni qo&apos;shing.
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
                    <span className="bg-navy-900 text-white text-xs px-2 py-1 rounded">
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
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  >
                    O&apos;chirish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-amber-800 text-sm">
          💡 <strong>Eslatma:</strong> Agar bazada savollar bo&apos;lmasa, bosh sahifada standart savollar ko&apos;rinadi. 
          Kamida bitta savol qo&apos;shsangiz, faqat siz qo&apos;shgan savollar ko&apos;rinadi.
        </p>
      </div>
    </div>
  );
}
