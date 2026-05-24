"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { useTranslations } from "next-intl";

export type ReservationTone = "active" | "expiring" | "expired";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TASHKENT_TIME_FORMAT = new Intl.DateTimeFormat("uz-UZ", {
  timeZone: "Asia/Tashkent",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function getReservationTone(
  expiresAt: string | Date | null | undefined,
  status?: string | null,
  now: Date = new Date()
): ReservationTone | null {
  if (status && status !== "reserved") return null;
  if (!expiresAt) return null;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return "expired";
  if (diff <= DAY_MS) return "expiring";
  return "active";
}

function getTone(expiresAt: Date, now: Date): ReservationTone {
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return "expired";
  if (diff <= DAY_MS) return "expiring";
  return "active";
}

function toneStyle(tone: ReservationTone) {
  if (tone === "expired") {
    return {
      borderColor: "rgba(220, 38, 38, 0.35)",
      background: "rgba(254, 226, 226, 0.72)",
      color: "var(--a-danger)",
    };
  }
  if (tone === "expiring") {
    return {
      borderColor: "rgba(217, 119, 6, 0.35)",
      background: "rgba(254, 243, 199, 0.72)",
      color: "var(--a-warning)",
    };
  }
  return {
    borderColor: "var(--a-border)",
    background: "var(--a-bg-subtle)",
    color: "var(--a-text-secondary)",
  };
}

export default function ReservationCountdown({
  expiresAt,
  status = "reserved",
  href,
  compact = false,
  className = "",
}: {
  expiresAt: string | Date | null | undefined;
  status?: string | null;
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("admin");
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const date = useMemo(() => (expiresAt ? new Date(expiresAt) : null), [expiresAt]);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!date || status !== "reserved" || Number.isNaN(date.getTime())) return null;
  if (!mounted) return null;

  const tone = getTone(date, now);
  const styles = toneStyle(tone);
  const title = tone === "expired" ? t("reservationExpired") : tone === "expiring" ? t("reservationExpiringSoon") : t("reservationActive");
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / DAY_MS);
  const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
  const minutes = Math.max(1, Math.floor((diff % HOUR_MS) / (60 * 1000)));
  const body =
    diff <= 0
      ? t("reservationCountdownExpired")
      : days > 0
        ? t("reservationCountdownDaysHours", { days, hours })
        : hours > 0
          ? t("reservationCountdownHoursMinutes", { hours, minutes })
          : t("reservationCountdownMinutes", { minutes });
  const dateText = TASHKENT_TIME_FORMAT.format(date);
  const content = (
    <span
      suppressHydrationWarning
      className={`inline-flex ${compact ? "items-center" : "items-start"} gap-2 rounded border px-2.5 py-2 text-[12px] font-medium ${className}`}
      style={styles}
    >
      <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold">{title}: {body}</span>
        {!compact ? <span style={{ color: "var(--a-text-tertiary)" }}>{t("reservationExpiresAt")} {dateText}</span> : null}
      </span>
    </span>
  );

  return href ? (
    <Link href={href} className="inline-flex hover:opacity-85">
      {content}
    </Link>
  ) : content;
}
