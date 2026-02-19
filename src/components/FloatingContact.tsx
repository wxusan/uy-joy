"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export default function FloatingContact() {
  const t = useTranslations("contact");
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const pathname = usePathname();

  // Don't show on admin/portal pages
  if (pathname?.startsWith("/portal")) return null;

  const buttons = [
    {
      id: "telegram",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      label: t("telegramChat"),
      href: "https://t.me/wxusan?text=Salom!%20Men%20kvartira%20haqida%20ma'lumot%20olmoqchiman.",
      color: "bg-navy-600 hover:bg-navy-700",
    },
    {
      id: "chat",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      label: t("chatComingSoon"),
      href: "#",
      color: "bg-navy-500 hover:bg-navy-600",
      disabled: true,
    },
    {
      id: "phone",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      label: "+998 77 041 12 22",
      href: "tel:+998770411222",
      color: "bg-navy-900 hover:bg-navy-800 ring-2 ring-gold-400",
    },
  ];

  return (
    <div className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-50 flex flex-col gap-3">
      {buttons.map((btn) => (
        <div key={btn.id} className="relative group">
          {/* Tooltip */}
          <div
            className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-navy-900 text-white text-sm rounded-lg whitespace-nowrap transition-all duration-200 ${
              showTooltip === btn.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
            }`}
          >
            {btn.label}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent border-l-navy-900" />
          </div>

          {/* Button */}
          {btn.disabled ? (
            <div
              onMouseEnter={() => setShowTooltip(btn.id)}
              onMouseLeave={() => setShowTooltip(null)}
              className={`w-14 h-14 rounded-full ${btn.color} text-white flex items-center justify-center shadow-card cursor-not-allowed opacity-60`}
            >
              {btn.icon}
            </div>
          ) : (
            <a
              href={btn.href}
              target={btn.id === "telegram" ? "_blank" : undefined}
              rel={btn.id === "telegram" ? "noopener noreferrer" : undefined}
              onMouseEnter={() => setShowTooltip(btn.id)}
              onMouseLeave={() => setShowTooltip(null)}
              className={`w-14 h-14 rounded-full ${btn.color} text-white flex items-center justify-center shadow-card transition-all duration-200 hover:scale-110`}
            >
              {btn.icon}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
