import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getPlatformSettings } from "@/lib/platform-settings";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const platformSettings = getPlatformSettings();

  return (
    <NextIntlClientProvider messages={messages}>
      <AdminLayoutClient brandName={platformSettings.publicBrandName} featureFlags={platformSettings.featureFlags}>
        {children}
      </AdminLayoutClient>
    </NextIntlClientProvider>
  );
}
