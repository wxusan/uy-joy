"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Cross, ShoppingCart, GraduationCap, Bus, Landmark } from "lucide-react";

interface NearbyPlace {
  category: string;
  categoryIcon: string;
  places: string[];
}

interface Props {
  latitude: number;
  longitude: number;
  infrastructure?: NearbyPlace[];
  address: string;
}

const defaultInfrastructure: NearbyPlace[] = [
  {
    category: "religious",
    categoryIcon: "",
    places: [],
  },
  {
    category: "medical",
    categoryIcon: "",
    places: [],
  },
  {
    category: "shopping",
    categoryIcon: "",
    places: [],
  },
  {
    category: "education",
    categoryIcon: "",
    places: [],
  },
  {
    category: "transport",
    categoryIcon: "",
    places: [],
  },
];

const categoryLabels: Record<string, Record<string, string>> = {
  religious: { en: "Religious Centers", ru: "Религиозные центры", uz: "Diniy markazlar" },
  medical: { en: "Medical Clinics", ru: "Медицинские клиники", uz: "Tibbiy klinikalar" },
  shopping: { en: "Shopping & Supermarkets", ru: "Магазины и супермаркеты", uz: "Savdo markazlari va supermarketlar" },
  education: { en: "Educational Institutions", ru: "Образовательные учреждения", uz: "Ta'lim muassasalari" },
  transport: { en: "Public Transport", ru: "Общественный транспорт", uz: "Jamoat transporti" },
};

const categoryIconComponents: Record<string, React.ReactNode> = {
  religious: <Landmark className="w-5 h-5 text-emerald-400" />,
  medical: <Cross className="w-5 h-5 text-emerald-400" />,
  shopping: <ShoppingCart className="w-5 h-5 text-emerald-400" />,
  education: <GraduationCap className="w-5 h-5 text-emerald-400" />,
  transport: <Bus className="w-5 h-5 text-emerald-400" />,
};

export default function LocationInfrastructure({ latitude, longitude, infrastructure, address }: Props) {
  const t = useTranslations("project");
  const [locale, setLocale] = useState("uz"); // Default to uz to match server

  // Get locale from cookie after mount (client-side only)
  useEffect(() => {
    const cookieLocale = document.cookie.match(/locale=([^;]+)/)?.[1];
    if (cookieLocale) {
      setLocale(cookieLocale);
    }
  }, []);

  const places = infrastructure && infrastructure.length > 0
    ? infrastructure
    : defaultInfrastructure;

  // Filter out categories with no places
  const activePlaces = places.filter(p => p.places && p.places.length > 0);

  const mapUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${latitude},${longitude}&zoom=15&maptype=roadmap&language=${locale}`;

  return (
    <section className="bg-slate-800 text-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8 text-emerald-400">{t("location") || "Joylashuv"}</h2>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Map */}
          <div className="rounded-xl overflow-hidden h-[400px]">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Project Location"
            />
          </div>

          {/* Infrastructure */}
          <div className="bg-slate-700/50 rounded-xl p-6">
            <h3 className="font-semibold text-emerald-400 mb-4">
              {locale === "uz" ? "Yaqin atrofdagi infratuzilma" : locale === "ru" ? "\u0418\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430" : "Nearby Infrastructure"}
            </h3>
            <div className="flex items-start gap-3 mb-6">
              <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="font-medium text-white">{address}</p>
            </div>

            {activePlaces.length > 0 ? (
              <div className="space-y-4">
                {activePlaces.map((category, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5">{categoryIconComponents[category.category] || <MapPin className="w-5 h-5 text-emerald-400" />}</span>
                    <div>
                      <p className="text-sm font-medium text-emerald-300">
                        {categoryLabels[category.category]?.[locale] || category.category}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {category.places.map((place, pIdx) => (
                          <span key={pIdx} className="text-xs text-slate-300">{place}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                {locale === "uz" ? "Infratuzilma ma\u2019lumotlari kiritilmagan" : locale === "ru" ? "\u0414\u0430\u043d\u043d\u044b\u0435 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u044b" : "Not available"}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
