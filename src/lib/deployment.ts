import { telegramConfigured } from "./telegram";
import { emailProviderStatus } from "./email";
import { getClientEnvStatus, getPlatformSettings, platformSettingsHasFeature } from "./platform-settings";
import { PLATFORM_FEATURES } from "./platform-plans";

export function getDeploymentInfo() {
  const settings = getPlatformSettings();
  const env = getClientEnvStatus();
  const publicDomain = process.env.CLIENT_PUBLIC_DOMAIN || process.env.NEXTAUTH_URL || null;
  const adminUrl = process.env.CLIENT_ADMIN_URL || (publicDomain ? `${publicDomain.replace(/\/$/, "")}/portal/management-x7k9` : null);

  return {
    clientSlug: settings.clientSlug,
    publicBrandName: settings.publicBrandName,
    companyLegalName: settings.companyLegalName,
    plan: settings.plan,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || process.env.APP_VERSION || "0.1.0",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || null,
    publicDomain,
    adminUrl,
    enabledFeatures: PLATFORM_FEATURES.filter((feature) => platformSettingsHasFeature(settings, feature)),
    env,
    integrations: {
      telegram: telegramConfigured(),
      cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      posthog: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
      email: emailProviderStatus(),
    },
  };
}

