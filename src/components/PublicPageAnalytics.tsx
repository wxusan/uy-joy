"use client";

import { useEffect } from "react";
import { capturePublicEvent } from "@/lib/public-lead-client";

export default function PublicPageAnalytics({
  projectId,
  source = "public_page",
  locale,
}: {
  projectId: string;
  source?: string;
  locale: string;
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    capturePublicEvent("public_page_view", {
      projectId,
      source,
      locale,
      landingPath: `${window.location.pathname}${window.location.search}`,
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
    });
  }, [locale, projectId, source]);

  return null;
}
