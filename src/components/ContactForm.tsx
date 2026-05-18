"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CircleCheck, Clock3, MapPin, Phone, Send } from "lucide-react";

interface Props {
  projectId: string;
  projectName: string;
  phoneNumber?: string | null;
  telegramUrl?: string | null;
  salesOfficeAddress?: string | null;
}

const resolveTelegramUrl = (url?: string | null): string | null => {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://t.me/${url.replace(/^@/, "")}`;
};

export default function ContactForm({
  projectId,
  projectName,
  phoneNumber,
  telegramUrl,
  salesOfficeAddress,
}: Props) {
  const t = useTranslations("contact");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const resolvedTelegramUrl = resolveTelegramUrl(telegramUrl);

  const telegramHandle = resolvedTelegramUrl
    ? "@" + resolvedTelegramUrl.replace(/^https?:\/\/t\.me\//, "").split("?")[0]
    : null;

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
          source: "bosh-sahifa",
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
      <div className="border border-[#d8cabc] bg-[#fbf7ef]/80 p-8 text-center shadow-[0_20px_55px_rgba(41,31,21,0.08)]">
        <CircleCheck className="mx-auto mb-4 h-11 w-11 text-[#2f9d72]" strokeWidth={1.6} />
        <p className="font-heading text-[18px] font-semibold text-[#15120f]">{t("success")}</p>
        {resolvedTelegramUrl && (
          <a
            href={resolvedTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-[6px] border border-[#d8cabc] px-4 py-2 text-[13px] font-semibold text-[#b75f43] transition hover:border-[#c66348] hover:bg-[#efe4d8]/65"
          >
            <Send className="h-4 w-4" strokeWidth={1.7} />
            {t("telegramShortcut")}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="border border-[#d8cabc] bg-[#f8f1e8]/70 shadow-[0_24px_70px_rgba(41,31,21,0.1)] backdrop-blur-sm">
      <div className="p-6 md:p-8">
        <h3 className="font-display text-[30px] font-semibold leading-none tracking-normal text-[#15120f]">
          {t("salesTitle")}
        </h3>
        <p className="mt-3 text-[14px] font-medium leading-6 text-[#6f675e]">
          {t("salesSubtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("name")}
              className="h-12 w-full border border-[#d2c4b6] bg-transparent px-4 text-[14px] font-medium text-[#15120f] outline-none transition placeholder:text-[#8a7d70] focus:border-[#b75f43]"
              required
            />

            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phone")}
              className="h-12 w-full border border-[#d2c4b6] bg-transparent px-4 text-[14px] font-medium text-[#15120f] outline-none transition placeholder:text-[#8a7d70] focus:border-[#b75f43]"
              required
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-[52px] w-full items-center justify-center gap-4 bg-[#c66348] px-6 font-heading text-[15px] font-semibold text-white transition-colors hover:bg-[#d87355] disabled:bg-[#c99a89]"
          >
            {loading ? t("sending") : t("requestCallback")}
            <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
          </button>
          <p className="text-[12px] font-semibold leading-5 text-[#6f675e]">{t("responseSLA")}</p>
          <p className="text-[12px] font-medium leading-5 text-[#7a6f65]">
            {t("privacyNoticePrefix")}{" "}
            <Link href="/privacy" className="font-semibold text-[#b75f43] underline-offset-4 hover:underline">
              {t("privacyNoticeLink")}
            </Link>{" "}
            {t("privacyNoticeSuffix")}
          </p>
        </form>
      </div>

      <div className="grid border-t border-[#d8cabc] sm:grid-cols-2">
        {phoneNumber && (
          <a
            href={`tel:${phoneNumber.replace(/\s/g, "")}`}
            className="flex gap-4 border-b border-[#d8cabc] p-6 transition-colors hover:bg-[#efe4d8]/65 sm:border-r"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[#c66348] text-white">
              <Phone className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block font-heading text-[15px] font-semibold text-[#15120f]">{phoneNumber}</span>
              <span className="mt-1 block text-[13px] font-medium text-[#6f675e]">{t("callAnytime")}</span>
            </span>
          </a>
        )}

        <div className="flex gap-4 border-b border-[#d8cabc] p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-[#b9aa9c] text-[#15120f]">
            <Clock3 className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <span>
            <span className="block font-heading text-[15px] font-semibold text-[#15120f]">{t("weekdayHours")}</span>
            <span className="mt-1 block text-[13px] font-medium text-[#6f675e]">{t("weekendHours")}</span>
          </span>
        </div>

        {salesOfficeAddress && (
          <div className="flex gap-4 p-6 sm:border-r sm:border-[#d8cabc]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[#c66348] text-white">
              <MapPin className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block font-heading text-[15px] font-semibold text-[#15120f]">{t("salesOffice")}</span>
              <span className="mt-1 block text-[13px] font-medium text-[#6f675e]">{salesOfficeAddress}</span>
            </span>
          </div>
        )}

        {resolvedTelegramUrl && telegramHandle && (
          <a
            href={resolvedTelegramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex gap-4 p-6 transition-colors hover:bg-[#efe4d8]/65"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[#c66348] text-white">
              <Send className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block font-heading text-[15px] font-semibold text-[#15120f]">Telegram</span>
              <span className="mt-1 block text-[13px] font-medium text-[#6f675e]">{telegramHandle}</span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
