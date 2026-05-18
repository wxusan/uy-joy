import type { Metadata } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import FloatingContact from "@/components/FloatingContact";
import PostHogProvider from "@/components/PostHogProvider";
import { getCurrentTenant } from "@/lib/tenant";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "UyJoy — Interactive Apartment Platform",
  description: "Find and explore apartments in residential complexes",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const publicMessages = { ...(messages as Record<string, unknown>) };
  delete publicMessages.admin;
  const tenant = await getCurrentTenant();

  return (
    <html lang={locale}>
      <body className={`${cormorant.variable} ${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-body bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col antialiased`}>
        <NextIntlClientProvider messages={publicMessages as AbstractIntlMessages}>
          <Suspense fallback={null}>
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </Suspense>
          <FloatingContact
            phoneNumber={tenant?.phoneNumber}
            telegramUrl={tenant?.telegramUrl}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
