import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import LanguageSwitcher from "./LanguageSwitcher";

export default async function Navbar() {
  const t = await getTranslations("common");
  const locale = await getLocale();

  return (
    <nav className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-emerald-400">Uy</span>Joy
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:text-emerald-400 transition">
              {t("home")}
            </Link>
            <Link
              href="/kvartiralarni-korish"
              className="text-sm hover:text-emerald-400 transition"
            >
              {t("explore")}
            </Link>
            <LanguageSwitcher currentLocale={locale} />
          </div>
        </div>
      </div>
    </nav>
  );
}
