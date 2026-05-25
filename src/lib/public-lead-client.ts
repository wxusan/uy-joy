"use client";

import posthog from "posthog-js";

type UtmKey = "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "utmTerm";
const queryToBodyKey: Record<string, UtmKey> = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
};

function readStoredUtm() {
  try {
    const raw = window.sessionStorage.getItem("uyjoy:first-utm");
    return raw ? (JSON.parse(raw) as Partial<Record<UtmKey, string>>) : {};
  } catch {
    return {};
  }
}

function getAnalyticsSessionId() {
  try {
    const key = "uyjoy:analytics-session-id";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(key, generated);
    return generated;
  } catch {
    return undefined;
  }
}

export function collectLeadTracking(source: string) {
  const url = new URL(window.location.href);
  const trackedSource = (url.searchParams.get("source") || url.searchParams.get("ref") || source).slice(0, 80);
  const stored = readStoredUtm();
  const utm: Partial<Record<UtmKey, string>> = { ...stored };
  for (const [queryKey, bodyKey] of Object.entries(queryToBodyKey)) {
    const value = url.searchParams.get(queryKey);
    if (value && !utm[bodyKey]) utm[bodyKey] = value.slice(0, 160);
  }
  try {
    if (Object.keys(utm).length > 0 && !window.sessionStorage.getItem("uyjoy:first-utm")) {
      window.sessionStorage.setItem("uyjoy:first-utm", JSON.stringify(utm));
    }
  } catch {
    // Storage can be blocked; lead capture should continue.
  }
  return {
    source: trackedSource,
    analyticsSessionId: getAnalyticsSessionId(),
    ...utm,
    campaign: utm.utmCampaign,
    referrer: document.referrer || undefined,
    landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 400),
    preferredLanguage: document.cookie.match(/(?:^|; )locale=([^;]+)/)?.[1] || undefined,
  };
}

export function capturePublicEvent(event: string, properties: Record<string, unknown>) {
  const safeProperties: Record<string, unknown> = {
    ...properties,
    analyticsSessionId: getAnalyticsSessionId(),
    referrer: document.referrer || undefined,
    landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 400),
  };
  delete safeProperties.phone;
  delete safeProperties.name;
  posthog.capture(event, safeProperties);
  fetch("/api/analytics/public-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName: event, properties: safeProperties }),
    keepalive: true,
  }).catch(() => {
    // Local reporting should never interrupt the public journey.
  });
}
