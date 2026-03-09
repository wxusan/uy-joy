"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function AnalyticsPage() {
    const { data: session } = useSession();
    const t = useTranslations("admin");
    const role = (session?.user as any)?.role;

    if (role !== "developer") {
        return <p className="text-slate-500">{t("accessDenied")}</p>;
    }

    const dashboardUrl = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL;

    return (
        <div className="h-full">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold font-heading">{t("analytics") || "Analytics"}</h1>
                <a
                    href="https://us.posthog.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:text-emerald-700 transition"
                >
                    Open PostHog ↗
                </a>
            </div>

            {dashboardUrl ? (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
                    <iframe
                        src={dashboardUrl}
                        className="w-full h-full border-0"
                        title="PostHog Analytics Dashboard"
                        allow="clipboard-read; clipboard-write"
                    />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h2 className="text-lg font-semibold text-slate-700 mb-2">PostHog Dashboard Not Connected</h2>
                    <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                        To see analytics here, create a shared dashboard in PostHog and add the URL
                        to your environment variables.
                    </p>
                    <div className="bg-slate-50 rounded-lg p-4 text-left max-w-md mx-auto">
                        <p className="text-xs font-mono text-slate-600 mb-2">Add to .env:</p>
                        <code className="text-xs font-mono text-emerald-600 break-all">
                            NEXT_PUBLIC_POSTHOG_DASHBOARD_URL=https://us.posthog.com/shared/your-dashboard-id
                        </code>
                    </div>
                    <div className="mt-6 space-y-2 text-sm text-slate-500">
                        <p>Steps:</p>
                        <ol className="text-left max-w-md mx-auto space-y-1">
                            <li>1. Go to <a href="https://us.posthog.com" target="_blank" className="text-emerald-600 hover:underline">posthog.com</a> → your project</li>
                            <li>2. Create a Dashboard → click Share → copy the shared link</li>
                            <li>3. Add <code className="bg-slate-100 px-1 rounded text-xs">NEXT_PUBLIC_POSTHOG_DASHBOARD_URL</code> to your .env</li>
                            <li>4. Restart the dev server</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}
