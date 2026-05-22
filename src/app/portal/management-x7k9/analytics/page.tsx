"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { roleHasPlatformPermission } from "@/lib/platform-plans";

export default function AnalyticsPage() {
    const { data: session } = useSession();
    const t = useTranslations("admin");
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!roleHasPlatformPermission(role, "technicalSettings")) {
        return <p className="text-slate-500">{t("accessDenied")}</p>;
    }

    const dashboardUrl = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL;

    return (
        <div className="h-full">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold font-heading">{t("analytics")}</h1>
                <a
                    href="https://us.posthog.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:text-emerald-700 transition"
                >
                    {t("openPosthog")}
                </a>
            </div>

            {dashboardUrl ? (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
                    <iframe
                        src={dashboardUrl}
                        className="w-full h-full border-0"
                        title={t("analytics")}
                        allow="clipboard-read; clipboard-write"
                    />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h2 className="text-lg font-semibold text-slate-700 mb-2">{t("posthogNotConnected")}</h2>
                    <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                        {t("posthogDescription")}
                    </p>
                    <div className="bg-slate-50 rounded-lg p-4 text-left max-w-md mx-auto">
                        <p className="text-xs font-mono text-slate-600 mb-2">{t("posthogAddToEnv")}</p>
                        <code className="text-xs font-mono text-emerald-600 break-all">
                            NEXT_PUBLIC_POSTHOG_DASHBOARD_URL=https://us.posthog.com/shared/your-dashboard-id
                        </code>
                    </div>
                    <div className="mt-6 space-y-2 text-sm text-slate-500">
                        <p>{t("posthogSteps")}</p>
                        <ol className="text-left max-w-md mx-auto space-y-1">
                            <li>1. {t("posthogStep1")} (<a href="https://us.posthog.com" target="_blank" className="text-emerald-600 hover:underline">posthog.com</a>)</li>
                            <li>2. {t("posthogStep2")}</li>
                            <li>3. {t("posthogStep3")}: <code className="bg-slate-100 px-1 rounded text-xs">NEXT_PUBLIC_POSTHOG_DASHBOARD_URL</code></li>
                            <li>4. {t("posthogStep4")}</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}
