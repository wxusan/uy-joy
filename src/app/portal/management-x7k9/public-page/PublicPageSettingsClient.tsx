"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const tabs = ["Brand", "Hero", "Sections", "Forms", "Integrations", "Preview"] as const;
const locales = ["uz", "ru", "en"] as const;

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
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brand");
  const [config, setConfig] = useState<Config>(initialConfig);
  const [status, setStatus] = useState("");
  const enabledSections = useMemo(() => new Set(config.enabledSections || []), [config.enabledSections]);

  function setTranslation(field: keyof Config, locale: "uz" | "ru" | "en", value: string) {
    setConfig((current) => ({
      ...current,
      [field]: { ...((current[field] as Translation | null) || {}), [locale]: value },
    }));
  }

  async function save() {
    setStatus("Saving...");
    const res = await fetch("/api/public-page/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus(payload?.error || "Save failed");
      return;
    }
    setConfig(payload.config);
    setStatus(payload.warnings?.length ? payload.warnings.join(" ") : "Saved");
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
      setStatus(payload?.error || "Upload failed");
      return;
    }
    setConfig((current) => ({ ...current, [field]: payload.url }));
  }

  async function testTelegram() {
    setStatus("Sending Telegram test...");
    const res = await fetch("/api/integrations/telegram/test", { method: "POST" });
    const payload = await res.json().catch(() => null);
    setStatus(res.ok ? "Telegram test sent" : payload?.error || "Telegram test failed");
  }

  async function processOutbox() {
    setStatus("Processing outbox...");
    const res = await fetch("/api/integrations/telegram/process-outbox", {
      method: "POST",
      headers: { "x-cron-secret": prompt("Cron secret") || "" },
    });
    const payload = await res.json().catch(() => null);
    setStatus(res.ok ? `Processed ${payload.processed}` : payload?.error || "Outbox failed");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="a-card p-2 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} className={`a-btn ${activeTab === tab ? "a-btn-primary" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {warnings.length > 0 ? (
        <div className="a-card p-4 text-[13px]" style={{ color: "#9a3412" }}>{warnings.join(" ")}</div>
      ) : null}

      {activeTab === "Brand" ? (
        <div className="a-card p-4 grid gap-3">
          <h2 className="text-[15px] font-semibold">Brand</h2>
          <input className="a-input" value={config.brandName || ""} onChange={(e) => setConfig({ ...config, brandName: e.target.value })} placeholder="Brand name" />
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
              <Upload className="h-4 w-4" /> {field}
              <input className="hidden" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], field)} />
            </label>
          ))}
        </div>
      ) : null}

      {activeTab === "Hero" ? (
        <div className="a-card p-4 grid gap-4">
          <h2 className="text-[15px] font-semibold">Hero copy</h2>
          {locales.map((locale) => (
            <div key={locale} className="grid gap-2 md:grid-cols-2">
              <input className="a-input" value={translationValue(config.heroTitleJson, locale)} onChange={(e) => setTranslation("heroTitleJson", locale, e.target.value)} placeholder={`Title ${locale}`} />
              <input className="a-input" value={translationValue(config.heroSubtitleJson, locale)} onChange={(e) => setTranslation("heroSubtitleJson", locale, e.target.value)} placeholder={`Subtitle ${locale}`} />
            </div>
          ))}
          <label className="a-btn w-fit">
            <Upload className="h-4 w-4" /> Hero image
            <input className="hidden" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "heroImageUrl")} />
          </label>
        </div>
      ) : null}

      {activeTab === "Sections" ? (
        <div className="a-card p-4 grid gap-3">
          <h2 className="text-[15px] font-semibold">Sections</h2>
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
          <h2 className="text-[15px] font-semibold">Form copy and embed</h2>
          {locales.map((locale) => (
            <div key={locale} className="grid gap-2 md:grid-cols-2">
              <input className="a-input" value={translationValue(config.formTitleJson, locale)} onChange={(e) => setTranslation("formTitleJson", locale, e.target.value)} placeholder={`Form title ${locale}`} />
              <input className="a-input" value={translationValue(config.thankYouMessageJson, locale)} onChange={(e) => setTranslation("thankYouMessageJson", locale, e.target.value)} placeholder={`Thank-you ${locale}`} />
            </div>
          ))}
          <textarea className="a-input min-h-[80px]" value={(config.embedAllowedOrigins || []).join("\n")} onChange={(e) => setConfig({ ...config, embedAllowedOrigins: e.target.value.split(/\s+/).filter(Boolean) })} placeholder="Allowed embed origins, one per line" />
          <code className="text-[12px] break-all rounded bg-black/5 p-3">{`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/lead-form?projectId=${config.projectId}&source=client_site" style="width:100%;border:0" loading="lazy"></iframe>`}</code>
        </div>
      ) : null}

      {activeTab === "Integrations" ? (
        <div className="a-card p-4 grid gap-4">
          <h2 className="text-[15px] font-semibold">Telegram</h2>
          <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>
            {telegramConfigured ? "Telegram token and chat id are configured." : "Telegram env vars are missing."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="a-btn" onClick={testTelegram}><Send className="h-4 w-4" /> Test Telegram</button>
            <button className="a-btn" onClick={processOutbox}><CheckCircle2 className="h-4 w-4" /> Retry outbox</button>
          </div>
          <div className="grid gap-2">
            {failedTelegram.map((log) => (
              <div key={log.id} className="rounded border p-3 text-[13px]" style={{ borderColor: "var(--a-border)" }}>
                <strong>{log.lead?.name || "Lead"}</strong> · attempts {log.attemptCount} · {log.errorMessage || "failed"}
              </div>
            ))}
            {failedTelegram.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>No failed Telegram notifications.</p> : null}
          </div>
        </div>
      ) : null}

      {activeTab === "Preview" ? (
        <div className="a-card p-4 grid gap-3">
          <h2 className="text-[15px] font-semibold">Preview</h2>
          <a className="a-btn w-fit" href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open public page</a>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button className="a-btn a-btn-primary" onClick={save}>Save settings</button>
        {status ? <span className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{status}</span> : null}
      </div>
    </div>
  );
}
