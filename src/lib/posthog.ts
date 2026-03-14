import posthog from "posthog-js";

export const initPostHog = () => {
    if (typeof window === "undefined") return;
    if (posthog.__loaded) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    if (!key) return;

    posthog.init(key, {
        api_host: "/ingest",   // reverse proxy — bypasses ad blockers
        ui_host: host,         // still links back to PostHog dashboard correctly
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
    });
};

export default posthog;
