"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface FAQItem {
  id?: string;
  question?: string;
  answer?: string;
  questionUz?: string;
  questionEn?: string;
  questionRu?: string;
  answerUz?: string;
  answerEn?: string;
  answerRu?: string;
}

interface Props {
  items?: FAQItem[];
  locale?: string;
}

export default function FAQ({ items, locale = "uz" }: Props) {
  const t = useTranslations("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Get question/answer based on locale
  const getLocalizedText = (item: FAQItem, type: "question" | "answer"): string => {
    if (type === "question") {
      if (item.question) return item.question;
      if (locale === "uz" && item.questionUz) return item.questionUz;
      if (locale === "en" && item.questionEn) return item.questionEn;
      if (locale === "ru" && item.questionRu) return item.questionRu;
      return item.questionUz || item.questionEn || item.questionRu || "";
    } else {
      if (item.answer) return item.answer;
      if (locale === "uz" && item.answerUz) return item.answerUz;
      if (locale === "en" && item.answerEn) return item.answerEn;
      if (locale === "ru" && item.answerRu) return item.answerRu;
      return item.answerUz || item.answerEn || item.answerRu || "";
    }
  };

  // Build FAQ items from database or use default translations
  const faqItems = items && items.length > 0 
    ? items.map(item => ({
        question: getLocalizedText(item, "question"),
        answer: getLocalizedText(item, "answer"),
      }))
    : [
        { question: t("q1"), answer: t("a1") },
        { question: t("q2"), answer: t("a2") },
        { question: t("q3"), answer: t("a3") },
        { question: t("q4"), answer: t("a4") },
      ];

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-800 mb-6">
        {t("title")}
      </h3>
      
      <div className="space-y-3">
        {faqItems.map((item, idx) => (
          <div
            key={idx}
            className="border border-slate-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition"
            >
              <span className="font-medium text-slate-700">{item.question}</span>
              <span className={`text-slate-400 transition-transform ${openIndex === idx ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            
            {openIndex === idx && (
              <div className="px-4 pb-4 text-slate-600 border-t border-slate-100 pt-3">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
