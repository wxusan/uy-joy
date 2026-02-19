import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="bg-slate-900 text-slate-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              <span className="text-emerald-400">Uy</span>Joy
            </h3>
            <p className="text-sm">
              {t("description")}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-slate-200 mb-3">{t("contact")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="tel:+998901234567" className="hover:text-emerald-400 transition">
                  +998 90 123 45 67
                </a>
              </li>
              <li>
                <a href="mailto:info@navruz.uz" className="hover:text-emerald-400 transition">
                  info@navruz.uz
                </a>
              </li>
              <li>Tashkent, Uzbekistan</li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold text-slate-200 mb-3">{t("salesOffice")}</h4>
            <ul className="space-y-2 text-sm">
              <li>{t("monFri")}</li>
              <li>{t("sat")}</li>
              <li>{t("sun")}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} {t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
