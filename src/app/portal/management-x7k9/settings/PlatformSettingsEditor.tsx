"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import type { PlatformSettings } from "@/lib/platform-settings";
import { PLATFORM_PLAN_OPTIONS } from "@/lib/platform-plans";

type EditorState = {
  clientSlug: string;
  companyLegalName: string;
  publicBrandName: string;
  showPoweredByUyJoy: boolean;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultLocale: "uz" | "ru" | "en";
  publicPhoneNumber: string;
  publicTelegramUrl: string;
  publicInstagramUrl: string;
  salesOfficeAddress: string;
  salesHoursLabel: string;
  plan: PlatformSettings["plan"];
  userLimit: string;
  projectLimit: string;
  storageLabel: string;
  allowAgentClaim: boolean;
};

function settingsToState(settings: PlatformSettings): EditorState {
  return {
    clientSlug: settings.clientSlug,
    companyLegalName: settings.companyLegalName,
    publicBrandName: settings.publicBrandName,
    showPoweredByUyJoy: settings.showPoweredByUyJoy,
    logoUrl: settings.branding.logoUrl || "",
    faviconUrl: settings.branding.faviconUrl || "",
    primaryColor: settings.branding.colors.primary,
    secondaryColor: settings.branding.colors.secondary,
    accentColor: settings.branding.colors.accent,
    defaultLocale: settings.defaultLocale,
    publicPhoneNumber: settings.contact.publicPhoneNumber || "",
    publicTelegramUrl: settings.contact.publicTelegramUrl || "",
    publicInstagramUrl: settings.contact.publicInstagramUrl || "",
    salesOfficeAddress: settings.contact.salesOfficeAddress || "",
    salesHoursLabel: settings.contact.salesHoursLabel || "",
    plan: settings.plan,
    userLimit: settings.limits.users ? String(settings.limits.users) : "",
    projectLimit: settings.limits.projects ? String(settings.limits.projects) : "",
    storageLabel: settings.limits.storageLabel || "",
    allowAgentClaim: settings.allowAgentClaim,
  };
}

function textOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function positiveIntOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function PlatformSettingsEditor({ initialSettings, updatedAt }: { initialSettings: PlatformSettings; updatedAt: string | null }) {
  const [form, setForm] = useState(() => settingsToState(initialSettings));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const planSummary = useMemo(() => PLATFORM_PLAN_OPTIONS.find((plan) => plan.key === form.plan)?.summary, [form.plan]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);

    const response = await fetch("/api/settings/platform", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientSlug: textOrUndefined(form.clientSlug),
        companyLegalName: textOrUndefined(form.companyLegalName),
        publicBrandName: textOrUndefined(form.publicBrandName),
        showPoweredByUyJoy: form.showPoweredByUyJoy,
        branding: {
          logoUrl: textOrUndefined(form.logoUrl),
          faviconUrl: textOrUndefined(form.faviconUrl),
          colors: {
            primary: textOrUndefined(form.primaryColor),
            secondary: textOrUndefined(form.secondaryColor),
            accent: textOrUndefined(form.accentColor),
          },
        },
        defaultLocale: form.defaultLocale,
        contact: {
          publicPhoneNumber: textOrUndefined(form.publicPhoneNumber),
          publicTelegramUrl: textOrUndefined(form.publicTelegramUrl),
          publicInstagramUrl: textOrUndefined(form.publicInstagramUrl),
          salesOfficeAddress: textOrUndefined(form.salesOfficeAddress),
          salesHoursLabel: textOrUndefined(form.salesHoursLabel),
        },
        plan: form.plan,
        limits: {
          users: positiveIntOrNull(form.userLimit),
          projects: positiveIntOrNull(form.projectLimit),
          storageLabel: textOrUndefined(form.storageLabel),
        },
        allowAgentClaim: form.allowAgentClaim,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setStatus(typeof data.error === "string" ? data.error : "Settings update failed.");
      return;
    }

    setStatus("Settings saved. Other runtime instances refresh within the cache TTL.");
  }

  return (
    <form onSubmit={save} className="a-card p-4 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--a-text)" }}>
            Editable platform settings
          </h2>
          <p className="text-[12px] mt-1" style={{ color: "var(--a-text-tertiary)" }}>
            {updatedAt ? `Last stored update: ${new Date(updatedAt).toLocaleString()}` : "No stored override yet; env defaults are active."}
          </p>
        </div>
        <button className="a-btn a-btn-primary inline-flex items-center gap-2" disabled={busy}>
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {busy ? "Saving" : "Save settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Client slug">
          <input className="a-input" value={form.clientSlug} onChange={(event) => setForm({ ...form, clientSlug: event.target.value })} />
        </Field>
        <Field label="Legal name">
          <input className="a-input" value={form.companyLegalName} onChange={(event) => setForm({ ...form, companyLegalName: event.target.value })} />
        </Field>
        <Field label="Public brand">
          <input className="a-input" value={form.publicBrandName} onChange={(event) => setForm({ ...form, publicBrandName: event.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Logo URL">
          <input className="a-input" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
        </Field>
        <Field label="Favicon URL">
          <input className="a-input" value={form.faviconUrl} onChange={(event) => setForm({ ...form, faviconUrl: event.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Primary color">
          <input className="a-input" value={form.primaryColor} onChange={(event) => setForm({ ...form, primaryColor: event.target.value })} />
        </Field>
        <Field label="Secondary color">
          <input className="a-input" value={form.secondaryColor} onChange={(event) => setForm({ ...form, secondaryColor: event.target.value })} />
        </Field>
        <Field label="Accent color">
          <input className="a-input" value={form.accentColor} onChange={(event) => setForm({ ...form, accentColor: event.target.value })} />
        </Field>
        <Field label="Default locale">
          <select className="a-input" value={form.defaultLocale} onChange={(event) => setForm({ ...form, defaultLocale: event.target.value as EditorState["defaultLocale"] })}>
            <option value="uz">Uzbek</option>
            <option value="ru">Russian</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Public phone">
          <input className="a-input" value={form.publicPhoneNumber} onChange={(event) => setForm({ ...form, publicPhoneNumber: event.target.value })} />
        </Field>
        <Field label="Telegram URL">
          <input className="a-input" value={form.publicTelegramUrl} onChange={(event) => setForm({ ...form, publicTelegramUrl: event.target.value })} />
        </Field>
        <Field label="Instagram URL">
          <input className="a-input" value={form.publicInstagramUrl} onChange={(event) => setForm({ ...form, publicInstagramUrl: event.target.value })} />
        </Field>
        <Field label="Sales office address">
          <input className="a-input" value={form.salesOfficeAddress} onChange={(event) => setForm({ ...form, salesOfficeAddress: event.target.value })} />
        </Field>
        <Field label="Sales hours">
          <input className="a-input" value={form.salesHoursLabel} onChange={(event) => setForm({ ...form, salesHoursLabel: event.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Plan">
          <select className="a-input" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value as EditorState["plan"] })}>
            {PLATFORM_PLAN_OPTIONS.map((plan) => (
              <option key={plan.key} value={plan.key}>
                {plan.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="User limit">
          <input className="a-input" inputMode="numeric" value={form.userLimit} onChange={(event) => setForm({ ...form, userLimit: event.target.value })} />
        </Field>
        <Field label="Project limit">
          <input className="a-input" inputMode="numeric" value={form.projectLimit} onChange={(event) => setForm({ ...form, projectLimit: event.target.value })} />
        </Field>
        <Field label="Storage label">
          <input className="a-input" value={form.storageLabel} onChange={(event) => setForm({ ...form, storageLabel: event.target.value })} />
        </Field>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <label className="inline-flex items-center gap-2 text-[13px]" style={{ color: "var(--a-text)" }}>
          <input type="checkbox" checked={form.allowAgentClaim} onChange={(event) => setForm({ ...form, allowAgentClaim: event.target.checked })} />
          Agent self-claim enabled
        </label>
        <label className="inline-flex items-center gap-2 text-[13px]" style={{ color: "var(--a-text)" }}>
          <input type="checkbox" checked={form.showPoweredByUyJoy} onChange={(event) => setForm({ ...form, showPoweredByUyJoy: event.target.checked })} />
          Show Powered by Uy Joy
        </label>
      </div>

      {planSummary && (
        <p className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
          {planSummary}
        </p>
      )}
      {status && (
        <p className="text-[12px]" style={{ color: status.includes("saved") ? "var(--a-accent)" : "#dc2626" }}>
          {status}
        </p>
      )}
    </form>
  );
}
