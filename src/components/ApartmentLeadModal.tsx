"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { Building2, CircleCheck, Layers, MessageCircle, Ruler, Send, X } from "lucide-react";
import { getFullImageUrl, getThumbnailUrl } from "@/lib/cloudinary";
import SimilarUnits from "@/components/SimilarUnits";

export interface LeadModalUnit {
  id: string;
  unitNumber: string;
  displayNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  floorNumber: number;
  basePricePerM2?: number | null;
  buildingName?: string;
  sketchImage?: string | null;
  sketchImage2?: string | null;
  sketchImage3?: string | null;
  sketchImage4?: string | null;
}

interface Props {
  unit: LeadModalUnit;
  allUnits?: LeadModalUnit[];
  telegramUrl?: string | null;
  source: "kvartiralar" | "interactive-floor";
  onClose: () => void;
}

const statusLabel = (status: string) => {
  if (status === "reserved") return "Bron qilingan";
  if (status === "sold") return "Sotilgan";
  return "Mavjud";
};

const formatPrice = (value: number | null | undefined) => {
  if (!value) return "Narx belgilanmagan";
  return `${Math.round(value).toLocaleString("ru-RU")} so'm`;
};

const resolveTelegramUrl = (url?: string | null): string | null => {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://t.me/${url.replace(/^@/, "")}`;
};

export default function ApartmentLeadModal({ unit, allUnits = [], telegramUrl, source, onClose }: Props) {
  const t = useTranslations("contact");
  const [activeUnit, setActiveUnit] = useState(unit);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const resolvedTelegramUrl = resolveTelegramUrl(telegramUrl);

  useEffect(() => {
    setActiveUnit(unit);
    setFormData({ name: "", phone: "" });
    setSubmitted(false);
    setError("");
  }, [unit]);

  const photos = useMemo(
    () =>
      [activeUnit.sketchImage, activeUnit.sketchImage2, activeUnit.sketchImage3, activeUnit.sketchImage4].filter(
        Boolean
      ) as string[],
    [activeUnit.sketchImage, activeUnit.sketchImage2, activeUnit.sketchImage3, activeUnit.sketchImage4]
  );
  const displayNumber = activeUnit.displayNumber;
  const pricePerM2 = activeUnit.pricePerM2 ?? activeUnit.basePricePerM2 ?? null;
  const totalPrice = activeUnit.totalPrice ?? (pricePerM2 ? Math.round(pricePerM2 * activeUnit.area) : null);
  const isAvailable = activeUnit.status === "available";

  useEffect(() => {
    posthog.capture("Viewed Apartment", {
      apartment_number: displayNumber,
      block: activeUnit.buildingName,
      floor: activeUnit.floorNumber,
      rooms: activeUnit.rooms,
      square_meters: activeUnit.area,
      source,
    });
  }, [activeUnit.area, activeUnit.buildingName, activeUnit.floorNumber, activeUnit.rooms, displayNumber, source]);

  const submitLead = async (leadSource: "kvartiralar" | "interactive-floor" | "waitlist") => {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          unitId: activeUnit.id,
          unitNumber: displayNumber,
          projectName: `${activeUnit.buildingName || "UyJoy"} - ${activeUnit.floorNumber}-qavat`,
          source: leadSource,
        }),
      });

      if (!response.ok) {
        setError(t("error"));
        return false;
      }

      setSubmitted(true);
      return true;
    } catch {
      setError(t("error"));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAvailable) return;
    if (!formData.name.trim() || !formData.phone.trim()) return;

    const ok = await submitLead(source);
    if (ok) {
      posthog.capture("Contacted Sales", {
        apartment_number: displayNumber,
        block: activeUnit.buildingName,
        floor: activeUnit.floorNumber,
        rooms: activeUnit.rooms,
        square_meters: activeUnit.area,
        source,
      });
    }
  };

  const handleWaitlistSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    const ok = await submitLead("waitlist");
    if (ok) {
      posthog.capture("Joined Waitlist", {
        apartment_number: displayNumber,
        block: activeUnit.buildingName,
        floor: activeUnit.floorNumber,
        rooms: activeUnit.rooms,
        square_meters: activeUnit.area,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="grid max-h-[92vh] w-full max-w-[900px] overflow-y-auto rounded-[8px] border border-[#f0d7be]/12 bg-[#111414] text-[#f4eadc] shadow-[0_30px_90px_rgba(0,0,0,0.48)] md:grid-cols-[minmax(0,1fr)_360px] md:overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 border-b border-[#f0d7be]/10 p-4 md:border-b-0 md:border-r md:p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-[#efeae0]">
            {photos[0] ? (
              <Image
                src={getFullImageUrl(photos[0])}
                alt={`Apartment ${displayNumber}`}
                fill
                className="object-contain p-3"
                sizes="(min-width: 768px) 520px, calc(100vw - 48px)"
              />
            ) : (
              <div className="grid h-full place-items-center text-[14px] font-medium text-[#6f6256]">
                Reja hali yuklanmagan
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.slice(1, 4).map((photo, index) => (
                <span key={photo} className="relative aspect-[4/3] overflow-hidden rounded-[5px] bg-[#efeae0]">
                  <Image
                    src={getThumbnailUrl(photo, 160)}
                    alt={`Apartment ${displayNumber} ${index + 2}`}
                    fill
                    className="object-contain p-1.5"
                    sizes="150px"
                  />
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 md:overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-[#cdbdac]">Tanlangan xonadon</p>
              <div className="mt-3 flex items-center gap-3">
                <h2 className="font-display text-[40px] font-semibold leading-none text-[#fff4e8]">{displayNumber}</h2>
                <span className="rounded-full bg-[#203625] px-3 py-1 text-[12px] font-semibold text-[#a7d891]">
                  {statusLabel(activeUnit.status)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full text-[#cdbdac] transition hover:bg-white/6 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2 text-center text-[12px] font-medium text-[#d7c8b7]">
            {[
              { icon: Layers, value: `${activeUnit.floorNumber}-qavat` },
              { icon: Ruler, value: `${activeUnit.area} m²` },
              { icon: MessageCircle, value: `${activeUnit.rooms} xona` },
              { icon: Building2, value: activeUnit.buildingName || "Bino" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.value} className="min-w-0">
                  <Icon className="mx-auto mb-2 h-5 w-5 text-[#bcae9d]" strokeWidth={1.5} />
                  <span className="block truncate">{item.value}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-[6px] border border-[#f0d7be]/10">
            <div className="border-r border-[#f0d7be]/10 p-3">
              <p className="text-[12px] font-medium text-[#8f8172]">Umumiy narx</p>
              <p className="mt-2 text-[18px] font-semibold leading-snug text-[#fff4e8]">{formatPrice(totalPrice)}</p>
            </div>
            <div className="p-3">
              <p className="text-[12px] font-medium text-[#8f8172]">Narx / m²</p>
              <p className="mt-2 text-[15px] font-semibold leading-snug text-[#d7c8b7]">{formatPrice(pricePerM2)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-[13px]">
            {[
              ["Xonalar soni", `${activeUnit.rooms} xona`],
              ["Maydon", `${activeUnit.area} m²`],
              ["Qavat", `${activeUnit.floorNumber}`],
              ["Holati", statusLabel(activeUnit.status)],
              ["Soni", "1 ta"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-[#8f8172]">{label}</span>
                <span className="font-semibold text-[#f4eadc]">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-7">
            {submitted ? (
              <div className="rounded-[6px] border border-[#9fd287]/25 bg-[#9fd287]/10 p-4 text-center">
                <CircleCheck className="mx-auto h-8 w-8 text-[#9fd287]" strokeWidth={1.7} />
                <p className="mt-3 text-[15px] font-semibold text-[#fff4e8]">Rahmat, so&apos;rovingiz yuborildi.</p>
                <p className="mt-1 text-[12px] font-medium text-[#b8aa9a]">Tez orada siz bilan bog&apos;lanamiz.</p>
                {resolvedTelegramUrl && (
                  <a
                    href={resolvedTelegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-[6px] border border-[#9fd287]/25 px-4 py-2 text-[12px] font-semibold text-[#d5f0ca] transition hover:bg-[#9fd287]/10"
                  >
                    <Send className="h-3.5 w-3.5" strokeWidth={1.7} />
                    {t("telegramShortcut")}
                  </a>
                )}
              </div>
            ) : isAvailable ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  className="h-12 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                  placeholder="Ismingiz"
                  autoComplete="name"
                />
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  className="h-12 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                  placeholder="+998 XX XXX XX XX"
                  autoComplete="tel"
                />
                {error && <p className="text-[12px] font-semibold text-[#ff9f8f]">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-[6px] bg-[#c66348] text-[14px] font-semibold text-white transition hover:bg-[#d37152] disabled:opacity-60"
                >
                  {submitting ? "Yuborilmoqda..." : "Xonadonni bron qilish"}
                </button>
                <p className="text-[11px] font-semibold leading-5 text-[#cdbdac]">{t("responseSLA")}</p>
                <p className="text-[11px] font-medium leading-5 text-[#b8aa9a]">
                  {t("privacyNoticePrefix")}{" "}
                  <Link href="/privacy" className="font-semibold text-[#f0a383] underline-offset-4 hover:underline">
                    {t("privacyNoticeLink")}
                  </Link>{" "}
                  {t("privacyNoticeSuffix")}
                </p>
              </form>
            ) : (
              <div className="space-y-5">
                <form
                  onSubmit={handleWaitlistSubmit}
                  className="rounded-[6px] border border-[#f0d7be]/10 bg-white/[0.03] p-4"
                >
                  <h3 className="text-[15px] font-semibold text-[#fff4e8]">O&apos;xshash xonadon ochilsa xabar bering</h3>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#b8aa9a]">
                    Bu xonadon hozir {statusLabel(activeUnit.status).toLowerCase()}. Navbatga yoziling, savdo bo&apos;limi mos variantlarni yuboradi.
                  </p>
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      className="h-11 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                      placeholder="Ismingiz"
                      autoComplete="name"
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={formData.phone}
                      onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                      className="h-11 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                      placeholder="+998 XX XXX XX XX"
                      autoComplete="tel"
                    />
                    {error && <p className="text-[12px] font-semibold text-[#ff9f8f]">{error}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-11 w-full rounded-[6px] bg-[#c66348] text-[14px] font-semibold text-white transition hover:bg-[#d37152] disabled:opacity-60"
                    >
                      {submitting ? "Yuborilmoqda..." : "Xabar berish"}
                    </button>
                    <p className="text-[11px] font-medium leading-5 text-[#b8aa9a]">
                      {t("privacyNoticePrefix")}{" "}
                      <Link href="/privacy" className="font-semibold text-[#f0a383] underline-offset-4 hover:underline">
                        {t("privacyNoticeLink")}
                      </Link>{" "}
                      {t("privacyNoticeSuffix")}
                    </p>
                  </div>
                </form>

                <SimilarUnits
                  currentUnit={activeUnit}
                  units={allUnits}
                  onSelect={(nextUnit) => {
                    setActiveUnit(nextUnit);
                    setFormData({ name: "", phone: "" });
                    setSubmitted(false);
                    setError("");
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
