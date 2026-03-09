"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog } from "@/lib/posthog";
import posthog from "posthog-js";

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        initPostHog();
    }, []);

    // Track page views on route change
    useEffect(() => {
        if (!posthog.__loaded) return;

        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
        posthog.capture("$pageview", { $current_url: url });
    }, [pathname, searchParams]);

    return <>{children}</>;
}
