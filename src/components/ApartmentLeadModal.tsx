"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { Building2, CircleCheck, Layers, MessageCircle, Ruler, Send, X } from "lucide-react";
import { getFullImageUrl, getThumbnailUrl } from "@/lib/cloudinary";
import { capturePublicEvent, collectLeadTracking } from "@/lib/public-lead-client";
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

const resolveTelegramUrl = (url?: string | null): string | null => {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://t.me/${url.replace(/^@/, "")}`;
};

export default function ApartmentLeadModal({ unit, allUnits = [], telegramUrl, source, onClose }: Props) {
  const t = useTranslations("contact");
  const tu = useTranslations("unit");
  const [activeUnit, setActiveUnit] = useState(unit);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const resolvedTelegramUrl = resolveTelegramUrl(telegramUrl);
  // Track whether the user has started typing (for lead_form_start event)
  const hasStartedRef = useRef(false);

  const statusLabel = (status: string) => {
    if (status === "reserved") return tu("reserved");
    if (status === "sold") return tu("sold");
    return tu("available");
  };

  const formatPrice = (value: number | null | undefined) => {
    if (!value) return t("priceOnRequest", { ns: "apartments" });
    return `${Math.round(value).toLocaleString("ru-RU")} so'm`;
  };

  useEffect(() => {
    setActiveUnit(unit);
    setFormData({ name: "", phone: "" });
    setSubmitted(false);
    setError("");
    hasStartedRef.current = false;
    capturePublicEvent("lead_form_view", { source, unitId: unit.id });
  }, [unit, source]);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const photos = useMemo(() => {
    const imgs = [activeUnit.sketchImage, activeUnit.sketchImage2, activeUnit.sketchImage3, activeUnit.sketchImage4].filter(Boolean) as string[];
    setActivePhotoIdx(0); // reset photo when unit changes
    return imgs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnit.id]);

  // Units with the same layout (rooms + area) — used for floor picker
  const sameLayoutUnits = useMemo(
    () =>
      allUnits
        .filter((u) => u.rooms === activeUnit.rooms && u.area === activeUnit.area)
        .sort((a, b) => a.floorNumber - b.floorNumber),
    [allUnits, activeUnit.rooms, activeUnit.area]
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

  function handleFormInputChange(field: "name" | "phone", value: string) {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      capturePublicEvent("lead_form_start", { source, unitId: activeUnit.id });
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const submitLead = async (leadSource: "kvartiralar" | "interactive-floor" | "waitlist") => {
    setSubmitting(true);
    setError("");
    capturePublicEvent("lead_form_submit", { source: leadSource, unitId: activeUnit.id });

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          unitId: activeUnit.id,
          unitNumber: displayNumber,
          projectName: `${activeUnit.buildingName || "Residence"} - ${activeUnit.floorNumber}`,
          ...collectLeadTracking(leadSource),
        }),
      });

      if (!response.ok) {
        capturePublicEvent("lead_form_error", { source: leadSource, unitId: activeUnit.id });
        setError(t("error"));
        return false;
      }

      setSubmitted(true);
      capturePublicEvent("lead_form_success", { source: leadSource, unitId: activeUnit.id });
      return true;
    } catch {
      capturePublicEvent("lead_form_error", { source: leadSource, unitId: activeUnit.id });
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
        <div className="flex min-w-0 flex-col gap-3 border-b border-[#f0d7be]/10 p-4 md:border-b-0 md:border-r md:p-5">
          {/* Main image */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-[#efeae0]">
            {photos[activePhotoIdx] ? (
              <Image
                src={getFullImageUrl(photos[activePhotoIdx])}
                alt={`Apartment ${displayNumber}`}
                fill
                className="object-contain p-3"
                sizes="(min-width: 768px) 520px, calc(100vw - 48px)"
              />
            ) : (
              <div className="grid h-full place-items-center text-[14px] font-medium text-[#6f6256]">
                {t("planNotUploaded")}
              </div>
            )}
          </div>

          {/* Photo thumbnails — clickable strip */}
          {photos.length > 1 && (
            <div className="flex gap-2">
              {photos.map((photo, idx) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[5px] border-2 transition ${
                    idx === activePhotoIdx
                      ? "border-[#c66348]"
                      : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  <Image
                    src={getThumbnailUrl(photo, 80)}
                    alt={`Photo ${idx + 1}`}
                    fill
                    className="object-contain bg-[#efeae0] p-1"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Floor picker */}
          {sameLayoutUnits.length > 1 && (
            <div className="mt-auto pt-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8f8172]">
                {tu("floor")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sameLayoutUnits.map((u) => {
                  const isActive = u.id === activeUnit.id;
                  const isUnavailable = u.status !== "available";
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setActiveUnit(u);
                        setFormData({ name: "", phone: "" });
                        setSubmitted(false);
                        setError("");
                      }}
                      className={`h-8 min-w-8 rounded-[5px] px-2.5 text-[13px] font-semibold transition ${
                        isActive
                          ? "bg-[#c66348] text-white"
                          : isUnavailable
                          ? "border border-[#f0d7be]/10 text-[#5a504a] line-through"
                          : "border border-[#f0d7be]/15 text-[#d7c8b7] hover:border-[#c66348] hover:text-white"
                      }`}
                    >
                      {u.floorNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 md:overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-[#cdbdac]">{t("selectedApartment")}</p>
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
              aria-label={tu("apartment")}
            >
              <X className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2 text-center text-[12px] font-medium text-[#d7c8b7]">
            {[
              { icon: Layers, value: `${activeUnit.floorNumber} ${tu("floor")}` },
              { icon: Ruler, value: `${activeUnit.area} m²` },
              { icon: MessageCircle, value: `${activeUnit.rooms} ${tu("rooms")}` },
              { icon: Building2, value: activeUnit.buildingName || t("buildingDefault") },
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
              <p className="text-[12px] font-medium text-[#8f8172]">{tu("totalPrice")}</p>
              <p className="mt-2 text-[18px] font-semibold leading-snug text-[#fff4e8]">{formatPrice(totalPrice)}</p>
            </div>
            <div className="p-3">
              <p className="text-[12px] font-medium text-[#8f8172]">{tu("pricePerM2")}</p>
              <p className="mt-2 text-[15px] font-semibold leading-snug text-[#d7c8b7]">{formatPrice(pricePerM2)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-[13px]">
            {[
              [tu("rooms"), `${activeUnit.rooms} ${tu("rooms")}`],
              [tu("area"), `${activeUnit.area} m²`],
              [tu("floor"), `${activeUnit.floorNumber}`],
              [tu("status"), statusLabel(activeUnit.status)],
              [t("quantity"), t("oneUnit")],
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
                <p className="mt-3 text-[15px] font-semibold text-[#fff4e8]">{t("thankYouSent")}</p>
                <p className="mt-1 text-[12px] font-medium text-[#b8aa9a]">{t("weWillContactSoon")}</p>
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
                  onChange={(event) => handleFormInputChange("name", event.target.value)}
                  className="h-12 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                  placeholder={t("namePlaceholder")}
                  autoComplete="name"
                />
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  value={formData.phone}
                  onChange={(event) => handleFormInputChange("phone", event.target.value)}
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
                  {submitting ? t("submitting") : t("bookApartment")}
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
                  <h3 className="text-[15px] font-semibold text-[#fff4e8]">{t("notifyWhenAvailable")}</h3>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#b8aa9a]">
                    {t("notifyWhenUnavailable", { status: statusLabel(activeUnit.status).toLowerCase() })}
                  </p>
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(event) => handleFormInputChange("name", event.target.value)}
                      className="h-11 w-full rounded-[6px] border border-[#f0d7be]/12 bg-[#0c0f10] px-4 text-[14px] font-medium text-[#fff4e8] outline-none transition placeholder:text-[#7b7065] focus:border-[#d58a69]"
                      placeholder={t("namePlaceholder")}
                      autoComplete="name"
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={formData.phone}
                      onChange={(event) => handleFormInputChange("phone", event.target.value)}
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
                      {submitting ? t("submitting") : t("notify")}
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
