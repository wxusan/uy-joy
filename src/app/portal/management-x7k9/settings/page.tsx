import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getDeploymentInfo } from "@/lib/deployment";
import { getPlatformPlanDefinition, roleHasPlatformPermission } from "@/lib/platform-plans";
import { getPlatformSettingsRecord, getStoredPlatformSettings } from "@/lib/platform-settings-store";
import PasswordChangeForm from "./PasswordChangeForm";
import PlatformSettingsEditor from "./PlatformSettingsEditor";

function statusPill(ok: boolean, label: string) {
  return (
    <span
      className="inline-flex items-center rounded px-2 py-1 text-[11px] font-medium"
      style={{ background: ok ? "#ecfdf5" : "#fff7ed", color: ok ? "#047857" : "#c2410c" }}
    >
      {label}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-4">
      <h2 className="text-[16px] font-semibold" style={{ color: "var(--a-text)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b last:border-b-0 py-2" style={{ borderColor: "var(--a-border)" }}>
      <span className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
        {label}
      </span>
      <span className="text-[12px] text-right break-words max-w-[70%]" style={{ color: "var(--a-text)" }}>
        {value || "Not configured"}
      </span>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await requireAdmin();
  const user = session.user as { role?: string } | undefined;
  const canManageSettings = roleHasPlatformPermission(user?.role, "technicalSettings");
  if (!canManageSettings) redirect("/portal/management-x7k9");

  const [settings, settingsRecord] = await Promise.all([getStoredPlatformSettings(), getPlatformSettingsRecord()]);
  const deployment = getDeploymentInfo();
  const plan = getPlatformPlanDefinition(settings.plan);
  const canSeeTechnical = roleHasPlatformPermission(user?.role, "technicalSettings");
  const tabs = [
    ["company", "Company"],
    ["branding", "Branding"],
    ["users", "Users"],
    ["integrations", "Integrations"],
    ["plan", "Feature Plan"],
    ["system", "System Info"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="a-page-title">Deployment settings</h1>
          <p className="a-page-sub">White-label launch configuration for {settings.publicBrandName}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="a-btn">Public page</Link>
          <Link href="/portal/management-x7k9/users" className="a-btn">Users</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="a-btn" style={{ height: 30, padding: "0 10px", fontSize: 12 }}>
            {label}
          </a>
        ))}
      </div>

      <PasswordChangeForm />

      <PlatformSettingsEditor initialSettings={settings} updatedAt={settingsRecord?.updatedAt?.toISOString() ?? null} />

      <Section id="company" title="Company">
        <div className="a-card p-4">
          <Row label="Client slug" value={settings.clientSlug} />
          <Row label="Legal name" value={settings.companyLegalName} />
          <Row label="Public brand" value={settings.publicBrandName} />
          <Row label="Support contact" value={settings.createdBySupportContact} />
          <Row label="Public domain" value={deployment.publicDomain} />
          <Row label="Admin URL" value={deployment.adminUrl} />
        </div>
      </Section>

      <Section id="branding" title="Branding">
        <div className="a-card p-4">
          <Row label="Logo" value={settings.branding.logoUrl} />
          <Row label="Favicon" value={settings.branding.faviconUrl} />
          <Row label="Primary color" value={settings.branding.colors.primary} />
          <Row label="Secondary color" value={settings.branding.colors.secondary} />
          <Row label="Accent color" value={settings.branding.colors.accent} />
          <Row label="Default locale" value={settings.defaultLocale} />
          <Row label="Enabled locales" value={settings.enabledLocales.join(", ")} />
        </div>
      </Section>

      <Section id="users" title="Users">
        <div className="a-card p-4">
          <Row label="User limit" value={settings.limits.users ?? "Custom"} />
          <Row label="Project limit" value={settings.limits.projects ?? "Custom"} />
          <Row label="Agent self-claim" value={settings.allowAgentClaim ? "Enabled" : "Disabled"} />
          <Row label="Password operations" value="Self-service change and admin reset are enabled." />
        </div>
      </Section>

      <Section id="integrations" title="Integrations">
        <div className="a-card p-4">
          <Row label="Telegram" value={statusPill(deployment.integrations.telegram, deployment.integrations.telegram ? "Configured" : "Missing")} />
          <Row label="Cloudinary" value={statusPill(deployment.integrations.cloudinary, deployment.integrations.cloudinary ? "Configured" : "Missing")} />
          <Row label="PostHog" value={statusPill(deployment.integrations.posthog, deployment.integrations.posthog ? "Configured" : "Missing")} />
          <Row
            label="Email"
            value={statusPill(
              deployment.integrations.email.configured && deployment.integrations.email.digestRecipients > 0,
              deployment.integrations.email.configured ? `${deployment.integrations.email.digestRecipients} digest recipient(s)` : "Missing"
            )}
          />
        </div>
      </Section>

      <Section id="plan" title="Feature Plan">
        <div className="a-card p-4">
          <Row label="Plan" value={`${plan.label} (${settings.plan})`} />
          <Row label="Summary" value={plan.summary} />
          <Row label="Enabled features" value={deployment.enabledFeatures.join(", ")} />
          <Row label="Missing required env" value={deployment.env.missingRequired.length ? deployment.env.missingRequired.join(", ") : "None"} />
          <Row label="Missing recommended env" value={deployment.env.missingRecommended.length ? deployment.env.missingRecommended.join(", ") : "None"} />
        </div>
      </Section>

      <Section id="system" title="System Info">
        <div className="a-card p-4">
          <Row label="App version" value={deployment.appVersion} />
          <Row label="Commit" value={canSeeTechnical ? deployment.commitSha : "Developer-only"} />
          <Row label="Runtime" value={process.env.VERCEL ? "Vercel" : "Node.js"} />
          <Row label="Health endpoint" value="/api/health" />
          <Row label="Weekly digest endpoint" value="/api/reports/digests/send-weekly" />
        </div>
      </Section>
    </div>
  );
}
