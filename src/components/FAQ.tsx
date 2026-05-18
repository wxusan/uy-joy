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

  const faqItems = (items || [])
    .map((item) => ({
      question: getLocalizedText(item, "question"),
      answer: getLocalizedText(item, "answer"),
    }))
    .filter((item) => item.question && item.answer);

  return (
    <div className="relative">
      <div className="mb-8">
        <h2 className="font-display text-[38px] font-semibold leading-[0.98] tracking-normal text-[#15120f] md:text-[50px]">
          {t("heading")}
        </h2>
        <div className="mt-5 h-[2px] w-16 bg-[#c66348]" />
        <p className="mt-5 max-w-[540px] text-[15px] font-medium leading-7 text-[#6f675e]">
          {t("subtitle")}
        </p>
      </div>

      {faqItems.length === 0 ? (
        <div className="border-t border-[#d8cabc] py-8 text-[14px] font-medium text-[#8a7d70]">
          {t("noItems")}
        </div>
      ) : (
        <div className="border-t border-[#d8cabc]">
          {faqItems.map((item, idx) => (
          <div key={idx} className="border-b border-[#d8cabc]">
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="group flex w-full items-center gap-5 py-6 text-left transition-colors hover:text-[#c66348]"
            >
              <span className="w-8 shrink-0 font-display text-[20px] font-semibold leading-none text-[#b75f43]">
                {idx + 1}.
              </span>
              <span className="flex-1 font-heading text-[17px] font-semibold leading-6 text-[#15120f] transition-colors group-hover:text-[#b75f43]">
                {item.question}
              </span>
              <span className="ml-4 text-[26px] font-light leading-none text-[#b75f43]">
                {openIndex === idx ? "-" : "+"}
              </span>
            </button>

            {openIndex === idx && (
              <div className="pb-7 pl-[52px] pr-12 text-[14px] font-medium leading-7 text-[#6f675e]">
                {item.answer}
              </div>
            )}
          </div>
          ))}
        </div>
      )}
    </div>
  );
}
