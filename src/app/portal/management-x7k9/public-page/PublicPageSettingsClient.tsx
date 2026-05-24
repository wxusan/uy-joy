"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, ExternalLink, Send, Upload } from "lucide-react";
import { PUBLIC_PAGE_SECTIONS, type PublicPageSection } from "@/lib/public-page";

type Translation = Partial<Record<"uz" | "ru" | "en", string>>;
type Config = {
  id: string;
  projectId: string;
  brandName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontMode: string;
  heroTitleJson: Translation | null;
  heroSubtitleJson: Translation | null;
  heroImageUrl: string | null;
  formTitleJson: Translation | null;
  formSubtitleJson: Translation | null;
  thankYouTitleJson: Translation | null;
  thankYouMessageJson: Translation | null;
  enabledSections: PublicPageSection[] | null;
  embedAllowedOrigins: string[] | null;
  redirectAfterSubmit: string | null;
};
type FailedTelegram = {
  id: string;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: string | Date;
  lead: { id: string; name: string; phone: string; source: string | null } | null;
};

const locales = ["uz", "ru", "en"] as const;
type TabKey = "Brand" | "Hero" | "Sections" | "Forms" | "Integrations" | "Preview";

function translationValue(value: Translation | null | undefined, locale: "uz" | "ru" | "en") {
  return value?.[locale] || "";
}

export default function PublicPageSettingsClient({
  initialConfig,
  warnings,
  telegramConfigured,
  failedTelegram,
}: {
  initialConfig: Config;
  warnings: string[];
  telegramConfigured: boolean;
  failedTelegram: FailedTelegram[];
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [activeTab, setActiveTab] = useState<TabKey>("Brand");
  const [config, setConfig] = useState<Config>(initialConfig);
  const [status, setStatus] = useState("");
  const enabledSections = useMemo(() => new Set(config.enabledSections || []), [config.enabledSections]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "Brand", label: t("pubBrand") },
    { key: "Hero", label: t("pubHero") },
    { key: "Sections", label: t("pubSections") },
    { key: "Forms", label: t("pubForms") },
    { key: "Integrations", label: t("pubIntegrations") },
    { key: "Preview", label: t("pubPreview") },
  ];

  function setTranslation(field: keyof Config, locale: "uz" | "ru" | "en", value: string) {
    setConfig((current) => ({
      ...current,
      [field]: { ...((current[field] as Translation | null) || {}), [locale]: value },
    }));
  }

  async function save() {
    setStatus(t("pubSaving"));
    const res = await fetch("/api/public-page/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus(payload?.error || t("pubSaveFailed"));
      return;
    }
    setConfig(payload.config);
    setStatus(payload.warnings?.length ? payload.warnings.join(" ") : t("pubSaved"));
    router.refresh();
  }

  async function uploadImage(file: File, field: "logoUrl" | "faviconUrl" | "heroImageUrl") {
    const form = new FormData();
    form.append("file", file);
    form.append("type", "public-page");
    form.append("id", `${config.projectId}-${field}`);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus(payload?.error || t("pubUploadFailed"));
      return;
    }
    setConfig((current) => ({ ...current, [field]: payload.url }));
  }

  async function testTelegram() {
    setStatus(t("pubTelegramTesting"));
    const res = await fetch("/api/integrations/telegram/test", { method: "POST" });
    const payload = await res.json().catch(() => null);
    setStatus(res.ok ? t("pubTelegramTestSent") : payload?.error || t("pubTelegramTestFailed"));
  }

  async function processOutbox() {
    setStatus(t("pubOutboxProcessing"));
    const res = await fetch("/api/integrations/telegram/process-outbox", {
      method: "POST",
      headers: { "x-cron-secret": prompt(t("pubCronSecret")) || "" },
    });
    const payload = await res.json().catch(() => null);
    setStatus(res.ok ? t("pubOutboxProcessed", { count: payload.processed }) : payload?.error || t("pubOutboxFailed"));
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="a-card p-2 flex flex-wrap gap-2">
        {tabs.map(({ key, label }) => (
          <button key={key} className={`a-btn ${activeTab === key ? "a-btn-primary" : ""}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="a-card p-4 text-[13px]" style={{ color: "#9a3412" }}>{warnings.join(" ")}</div>
      ) : null}

      {activeTab === "Brand" ? (
        <div className="a-card p-4 grid gap-3">
          <h2 className="text-[15px] font-semibold">{t("pubBrand")}</h2>
          <input className="a-input" value={config.brandName || ""} onChange={(e) => setConfig({ ...config, brandName: e.target.value })} placeholder={t("pubBrandName")} />
          <div className="grid gap-2 md:grid-cols-5">
            {(["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor"] as const).map((field) => (
              <label key={field} className="grid gap-1 text-[12px] font-semibold">
                {field}
                <input type="color" value={config[field]} onChange={(e) => setConfig({ ...config, [field]: e.target.value })} />
              </label>
            ))}
          </div>
          {(["logoUrl", "faviconUrl"] as const).map((field) => (
            <label key={field} className="a-btn w-fit">
              <Upload className="h-4 w-4" /> {field === "logoUrl" ? t("pubLogo") : t("pubFavicon")}
              <input className="hidden" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], field)} />
            </label>
          ))}
        </div>
      ) : null}

      {activeTab === "Hero" ? (
        <div className="a-card p-4 grid gap-4">
          <h2 className="text-[15px] font-semibold">{t("pubHeroCopy")}</h2>
          {locales.map((locale) => (
            <div key={locale} className="grid gap-2 md:grid-cols-2">
              <input className="a-input" value={translationValue(config.heroTitleJson, locale)} onChange={(e) => setTranslation("heroTitleJson", locale, e.target.value)} placeholder={t("pubTitleLocale", { locale })} />
              <input className="a-input" value={translationValue(config.heroSubtitleJson, locale)} onChange={(e) => setTranslation("heroSubtitleJson", locale, e.target.value)} placeholder={t("pubSubtitleLocale", { locale })} />
            </div>
          ))}
          <label className="a-btn w-fit">
            <Upload className="h-4 w-4" /> {t("pubHeroImage")}
            <input className="hidden" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "heroImageUrl")} />
          </label>
        </div>
      ) : null}

      {activeTab === "Sections" ? (
        <div className="a-card p-4 grid gap-3">
          <h2 className="text-[15px] font-semibold">{t("pubSections")}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {PUBLIC_PAGE_SECTIONS.map((section) => (
              <label key={section} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={enabledSections.has(section)}
                  onChange={(e) => {
                    const next = new Set(enabledSections);
                    if (e.target.checked) next.add(section);
                    else next.delete(section);
                    setConfig({ ...config, enabledSections: Array.from(next) });
                  }}
                />
                {section}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "Forms" ? (
        <div className="a-card p-4 grid gap-4">
          <h2 className="text-[15px] font-semibold">{t("pubFormCopy")}</h2>
          {locales.map((locale) => (
            <div key={locale} className="grid gap-2 md:grid-cols-2">
              <input className="a-input" value={translationValue(config.formTitleJson, locale)} onChange={(e) => setTranslation("formTitleJson", locale, e.target.value)} placeholder={t("pubFormTitleLocale", { locale })} />
              <input className="a-input" value={translationValue(config.thankYouMessageJson, locale)} onChange={(e) => setTranslation("thankYouMessageJson", locale, e.target.value)} placeholder={t("pubThankYouLocale", { locale })} />
            </div>
          ))}
          <textarea className="a-input min-h-[80px]" value={(config.embedAllowedOrigins || []).join("\n")} onChange={(e) => setConfig({ ...config, embedAllowedOrigins: e.target.value.split(/\s+/).filter(Boolean) })} placeholder={t("pubEmbedOrigins")} />
          <code className="text-[12px] break-all rounded bg-black/5 p-3">{`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/lead-form?projectId=${config.projectId}&source=client_site" style="width:100%;border:0" loading="lazy"></iframe>`}</code>
        </div>
      ) : null}

      {activeTab === "Integrations" ? (
        <div className="a-card p-4 grid gap-4">
          <h2 className="text-[15px] font-semibold">{t("telegram")}</h2>
          <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>
            {telegramConfigured ? t("pubTelegramConfigured") : t("pubTelegramMissing")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="a-btn" onClick={testTelegram}><Send className="h-4 w-4" /> {t("pubTestTelegram")}</button>
            <button className="a-btn" onClick={processOutbox}><CheckCircle2 className="h-4 w-4" /> {t("pubRetryOutbox")}</button>
          </div>
          <div className="grid gap-2">
            {failedTelegram.map((log) => (
              <div key={log.id} className="rounded border p-3 text-[13px]" style={{ borderColor: "var(--a-border)" }}>
                <strong>{log.lead?.name || t("pubLeadFallback")}</strong> {t("pubAttempts")} {log.attemptCount} · {log.errorMessage || t("pubFailed")}
              </div>
            ))}
            {failedTelegram.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("pubNoFailedTelegram")}</p> : null}
          </div>
        </div>
      ) : null}

      {activeTab === "Preview" ? (
        <div className="a-card p-4 grid gap-3">
          <h2 className="text-[15px] font-semibold">{t("pubPreview")}</h2>
          <a className="a-btn w-fit" href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> {t("pubOpenPage")}</a>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button className="a-btn a-btn-primary" onClick={save}>{t("pubSaveSettings")}</button>
        {status ? <span className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{status}</span> : null}
      </div>
    </div>
  );
}
