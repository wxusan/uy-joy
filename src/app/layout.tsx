import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import FloatingContact from "@/components/FloatingContact";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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
      <body className={`${inter.variable} ${poppins.variable} font-body bg-[#F7F8FA] text-[#111827] min-h-screen flex flex-col antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <FloatingContact />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
