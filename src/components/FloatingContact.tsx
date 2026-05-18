"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { BadgeHelp, BedDouble, CheckCircle2, ChevronLeft, Clock, LifeBuoy, Phone, Send, Sparkles, X } from "lucide-react";
import posthog from "posthog-js";
import { isWithinSalesHours } from "@/lib/sales-hours";

const roomOptions = ["1", "2", "3", "4+"] as const;

interface FloatingContactProps {
  phoneNumber?: string | null;
  telegramUrl?: string | null;
}

export default function FloatingContact({ phoneNumber, telegramUrl }: FloatingContactProps) {
  const t = useTranslations("contact");
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [step, setStep] = useState<"rooms" | "contact" | "success">("rooms");
  const [rooms, setRooms] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [withinSalesHours, setWithinSalesHours] = useState(() => isWithinSalesHours());

  useEffect(() => {
    const updateSalesHours = () => setWithinSalesHours(isWithinSalesHours());
    updateSalesHours();
    const interval = window.setInterval(updateSalesHours, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  if (pathname?.startsWith("/portal")) return null;

  const closeHelp = () => {
    setIsHelpOpen(false);
    window.setTimeout(() => {
      setStep("rooms");
      setRooms("");
      setName("");
      setPhone("");
      setLoading(false);
      setError("");
    }, 220);
  };

  const openHelp = () => {
    setIsOpen(false);
    setIsHelpOpen(true);
    posthog.capture("Help Chooser Opened", { source: "floating_contact" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          projectId: "N/A",
          projectName: `Matchmaker: ${rooms}`,
          source: "floating_matchmaker",
        }),
      });

      if (!response.ok) {
        setError(t("error"));
        return;
      }

      posthog.capture("Help Chooser Completed", { rooms });
      setStep("success");
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  // Build telegram URL: if tenant supplies a bare username or full URL, normalise it
  const resolvedTelegramUrl = telegramUrl
    ? telegramUrl.startsWith("http")
      ? telegramUrl
      : `https://t.me/${telegramUrl.replace(/^@/, "")}`
    : null;

  const actions = [
    ...(resolvedTelegramUrl
      ? [
          {
            id: "telegram",
            label: t("telegramChat"),
            href: resolvedTelegramUrl,
            icon: Send,
            className: "bottom-[8px] right-[82px] delay-[20ms]",
            target: "_blank",
          },
        ]
      : []),
    ...(phoneNumber
      ? [
          {
            id: "call",
            label: t("callUs"),
            href: `tel:${phoneNumber.replace(/\s/g, "")}`,
            icon: Phone,
            className: "bottom-[74px] right-[58px] delay-[70ms]",
          },
        ]
      : []),
    {
      id: "help",
      label: t("helpChoose"),
      onClick: openHelp,
      icon: BadgeHelp,
      className: "bottom-[122px] right-[0px] delay-[120ms]",
    },
  ] as const;

  return (
    <>
      <div className="fixed bottom-5 right-4 z-50 h-[204px] w-[188px] pointer-events-none md:bottom-8 md:right-8">
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          {actions.map((action) => {
            const Icon = action.icon;
            const baseClass =
              "group absolute pointer-events-auto flex items-center gap-3 rounded-full text-[#f7efe4] outline-none transition-all duration-300 ease-out";
            const motionClass = isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-75 opacity-0 pointer-events-none";
            const iconClass =
              "flex h-12 w-12 items-center justify-center rounded-full border border-[#f0c982]/35 bg-[rgba(24,25,23,0.74)] shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-200 group-hover:border-[#dc704f]/80 group-hover:bg-[#d66545] group-hover:text-white md:h-14 md:w-14";
            const label = (
              <span className="max-w-[150px] translate-x-2 whitespace-nowrap rounded-full border border-[#f0d7be]/12 bg-[rgba(18,18,16,0.72)] px-3 py-2 text-[12px] font-semibold opacity-0 shadow-[0_14px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 md:text-[13px]">
                {action.label}
              </span>
            );

            if ("href" in action) {
              return (
                <a
                  key={action.id}
                  href={action.href}
                  target={action.target}
                  rel={action.target ? "noopener noreferrer" : undefined}
                  aria-label={action.label}
                  className={`${baseClass} ${action.className} ${motionClass}`}
                >
                  {label}
                  <span className={iconClass}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                </a>
              );
            }

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                className={`${baseClass} ${action.className} ${motionClass}`}
              >
                {label}
                <span className={iconClass}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? t("closeActions") : t("openActions")}
          onClick={() => setIsOpen((value) => !value)}
          className="pointer-events-auto absolute bottom-0 right-0 flex h-16 w-16 items-center justify-center rounded-full border border-[#f0c982]/70 bg-[rgba(21,24,24,0.78)] text-[#fff7ec] shadow-[0_24px_58px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition-all duration-300 hover:border-[#dc704f] hover:bg-[#2a211d] active:scale-95 md:h-[72px] md:w-[72px]"
        >
          <span className="absolute inset-[-7px] rounded-full border border-[#d9b76f]/35 opacity-70" />
          {withinSalesHours ? (
            <span
              className={`absolute right-3 top-3 h-3 w-3 rounded-full bg-[#21c79a] shadow-[0_0_24px_rgba(33,199,154,0.85)] transition-all duration-300 ${
                isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
              }`}
            />
          ) : (
            <span
              title={t("repliesWithin")}
              className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#2a211d] text-[#f0c982] shadow-[0_0_18px_rgba(240,201,130,0.45)] transition-all duration-300 ${
                isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
              }`}
            >
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          )}
          <LifeBuoy
            className={`absolute h-6 w-6 transition-all duration-300 ${
              isOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
            strokeWidth={1.8}
          />
          <X
            className={`absolute h-6 w-6 transition-all duration-300 ${
              isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
            }`}
            strokeWidth={1.8}
          />
        </button>
      </div>

      {isHelpOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-end bg-[#090907]/45 p-0 backdrop-blur-[3px] md:p-8">
          <button
            type="button"
            aria-label={t("closeActions")}
            className="absolute inset-0 cursor-default"
            onClick={closeHelp}
          />

          <section className="relative w-full overflow-hidden rounded-t-[26px] border border-[#f0d7be]/15 bg-[rgba(20,21,19,0.92)] text-[#f6eadb] shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 md:max-w-[420px] md:rounded-[22px]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f1c98c]/55 to-transparent" />
            <button
              type="button"
              onClick={closeHelp}
              aria-label={t("closeActions")}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#f0d7be]/12 bg-white/[0.04] text-[#e9d8c0] transition-colors hover:bg-white/[0.08]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 md:p-7">
              {step !== "success" && (
                <div className="mb-7 pr-10">
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d86b4c]/30 bg-[#d86b4c]/12 px-3 py-1 text-[12px] font-semibold text-[#f0a383]">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("helpChoose")}
                  </p>
                  <h2 className="font-heading text-[26px] font-medium leading-tight tracking-normal text-[#fff8ec]">
                    {t("matchTitle")}
                  </h2>
                  <p className="mt-3 max-w-[340px] text-sm leading-6 text-[#d7c8b6]/78">
                    {t("matchIntro")}
                  </p>
                </div>
              )}

              {step === "rooms" && (
                <div className="animate-in fade-in slide-in-from-right-3 duration-300">
                  <p className="mb-3 text-sm font-semibold text-[#f0dfca]">{t("roomsPrompt")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {roomOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setRooms(t(`room${option.replace("+", "Plus")}`));
                          setStep("contact");
                        }}
                        className="group flex min-h-[78px] items-center gap-3 rounded-[14px] border border-[#f0d7be]/12 bg-white/[0.045] px-4 text-left transition-all duration-200 hover:border-[#d96b4b]/65 hover:bg-[#d96b4b]/12"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0d7be]/10 text-[#f0c982] transition-colors group-hover:bg-[#d96b4b] group-hover:text-white">
                          <BedDouble className="h-5 w-5" strokeWidth={1.8} />
                        </span>
                        <span className="text-[16px] font-semibold text-[#fff7ec]">
                          {t(`room${option.replace("+", "Plus")}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === "contact" && (
                <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right-3 duration-300">
                  <button
                    type="button"
                    onClick={() => setStep("rooms")}
                    className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-[#d7c8b6]/75 transition-colors hover:text-[#fff4e5]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("back")}
                  </button>

                  <div className="mb-5 rounded-[14px] border border-[#f0d7be]/12 bg-white/[0.045] px-4 py-3 text-sm text-[#f0dfca]">
                    {t("selectedRooms")}: <span className="font-semibold text-[#fff7ec]">{rooms}</span>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[#f0dfca]">{t("name")}</span>
                      <input
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={t("namePlaceholder")}
                        className="w-full rounded-[14px] border border-[#f0d7be]/14 bg-white/[0.055] px-4 py-3.5 text-[#fff7ec] outline-none transition-all placeholder:text-[#d7c8b6]/42 focus:border-[#d86b4c]/75 focus:bg-white/[0.08] focus:ring-4 focus:ring-[#d86b4c]/15"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[#f0dfca]">{t("phone")}</span>
                      <input
                        required
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+998 XX XXX XX XX"
                        className="w-full rounded-[14px] border border-[#f0d7be]/14 bg-white/[0.055] px-4 py-3.5 text-[#fff7ec] outline-none transition-all placeholder:text-[#d7c8b6]/42 focus:border-[#d86b4c]/75 focus:bg-white/[0.08] focus:ring-4 focus:ring-[#d86b4c]/15"
                      />
                    </label>
                  </div>

                  {error && <p className="mt-4 text-sm font-semibold text-[#ff9f8f]">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-[14px] bg-[#d66948] px-5 py-4 text-[15px] font-semibold text-white shadow-[0_18px_38px_rgba(214,105,72,0.22)] transition-all hover:bg-[#e07855] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  >
                    {loading ? t("sending") : t("submit")}
                  </button>
                  <p className="mt-3 text-[11px] font-medium leading-5 text-[#d7c8b6]/72">
                    {t("privacyNoticePrefix")}{" "}
                    <Link href="/privacy" className="font-semibold text-[#f0a383] underline-offset-4 hover:underline">
                      {t("privacyNoticeLink")}
                    </Link>{" "}
                    {t("privacyNoticeSuffix")}
                  </p>
                </form>
              )}

              {step === "success" && (
                <div className="py-7 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#86c879]/30 bg-[#86c879]/12 text-[#9bd58f]">
                    <CheckCircle2 className="h-10 w-10" strokeWidth={1.6} />
                  </div>
                  <h2 className="font-heading text-[26px] font-medium text-[#fff8ec]">{t("thankYou")}</h2>
                  <p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-[#d7c8b6]/78">{t("willContact")}</p>
                  <p className="mx-auto mt-2 max-w-[260px] text-[11px] font-semibold leading-5 text-[#d7c8b6]/60">{t("responseSLA")}</p>
                  {resolvedTelegramUrl && (
                    <a
                      href={resolvedTelegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#f0d7be]/15 bg-white/[0.06] px-5 py-2.5 text-[12px] font-semibold text-[#f0c982] transition-colors hover:bg-white/[0.1]"
                    >
                      <Send className="h-3.5 w-3.5" strokeWidth={1.7} />
                      {t("telegramShortcut")}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={closeHelp}
                    className="mt-4 rounded-full border border-[#f0d7be]/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-[#fff7ec] transition-colors hover:bg-white/[0.1]"
                  >
                    {t("done")}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
