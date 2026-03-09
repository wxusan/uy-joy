import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import FloatingContact from "@/components/FloatingContact";
import PostHogProvider from "@/components/PostHogProvider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
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

  return (
    <html lang={locale}>
      <body className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-body bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </Suspense>
          <FloatingContact />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
