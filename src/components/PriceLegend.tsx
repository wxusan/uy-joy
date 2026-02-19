"use client";

import { useTranslations } from "next-intl";

export default function PriceLegend() {
  const t = useTranslations("legend");

  const items = [
    { key: "available", color: "bg-green-500" },
    { key: "reserved", color: "bg-yellow-500" },
    { key: "sold", color: "bg-red-500" },
  ];

  return (
    <div className="flex items-center gap-6 p-3 bg-white rounded-lg shadow-sm border">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${item.color} opacity-70`} />
          <span className="text-sm text-slate-600">{t(item.key)}</span>
        </div>
      ))}
    </div>
  );
}
