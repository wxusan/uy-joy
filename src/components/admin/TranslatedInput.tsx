"use client";

import { useState } from "react";
import { Translations, parseTranslations, createTranslationsJson } from "@/lib/translations";
import { SHOW_AI } from "@/lib/flags";

interface Props {
  label: string;
  value: string;
  translationsJson: string | null;
  onChange: (value: string, translationsJson: string) => void;
  multiline?: boolean;
  placeholder?: string;
  context?: string; // Optional context for better AI translations
}

const LANGUAGES = [
  { code: "uz", label: "🇺🇿 O'zbek" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "en", label: "🇬🇧 English" },
] as const;

export default function TranslatedInput({
  label,
  value,
  translationsJson,
  onChange,
  multiline = false,
  placeholder,
  context,
}: Props) {
  const [showTranslations, setShowTranslations] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const translations = parseTranslations(translationsJson);

  const handleMainChange = (newValue: string) => {
    onChange(newValue, translationsJson || "");
  };

  const handleTranslationChange = (lang: keyof Translations, text: string) => {
    const updated = { ...translations, [lang]: text };
    onChange(value, createTranslationsJson(updated));
  };

  const fetchAiTranslations = async () => {
    if (!value.trim()) {
      setAiError("Asosiy matnni kiriting");
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: value,
          existingTranslations: translations,
          context: context || label,
        }),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const err = await response.json();
          detail = err?.detail || err?.error || "";
        } catch {
          try { detail = await response.text(); } catch {}
        }
        throw new Error(`AI tarjimasi muvaffaqiyatsiz bo'ldi${detail ? `: ${detail}` : ''}`);
      }

      const data = await response.json();
      
      if (data.translations) {
        // Apply AI translations
        const updated = {
          ...translations,
          uz: data.translations.uz || translations.uz || "",
          ru: data.translations.ru || translations.ru || "",
          en: data.translations.en || translations.en || "",
        };
        onChange(value, createTranslationsJson(updated));
      }
    } catch (error) {
      console.error("AI translation error:", error);
      setAiError("Tarjima qilishda xatolik yuz berdi");
    } finally {
      setAiLoading(false);
    }
  };

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <button
          type="button"
          onClick={() => setShowTranslations(!showTranslations)}
          className="text-xs text-blue-600 hover:underline"
        >
          {showTranslations ? "Tarjimalarni yashirish" : "🌐 Tarjima qo\u2019shish"}
        </button>
      </div>

      {/* Main input (default language) */}
      <InputComponent
        type="text"
        value={value}
        onChange={(e) => handleMainChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
          multiline ? "h-24 resize-none" : ""
        }`}
      />

      {/* Translation inputs */}
      {showTranslations && (
        <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-lg border">
          {/* AI Translation Button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Har bir til uchun tarjimani qo&apos;shing. Bo&apos;sh bo&apos;lsa, asosiy matn ishlatiladi.
            </p>
            {SHOW_AI && (
              <button
                type="button"
                onClick={fetchAiTranslations}
                disabled={aiLoading || !value.trim()}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  aiLoading
                    ? "bg-slate-200 text-slate-500 cursor-wait"
                    : !value.trim()
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {aiLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Tarjima qilinmoqda...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    AI bilan tarjima
                  </>
                )}
              </button>
            )}
          </div>

          {aiError && (
            <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {aiError}
            </p>
          )}

          {/* Language inputs */}
          <div className="space-y-2">
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="flex items-center gap-2">
                <span className="text-sm w-24 flex-shrink-0">{lang.label}</span>
                <InputComponent
                  type="text"
                  value={translations[lang.code] || ""}
                  onChange={(e) => handleTranslationChange(lang.code, e.target.value)}
                  placeholder={`${label} (${lang.label.split(" ")[1]})`}
                  className={`flex-1 px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-emerald-500 outline-none ${
                    multiline ? "h-16 resize-none" : ""
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
