import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Globe2, Instagram, Phone, Send } from "lucide-react";
import { getCurrentTenant } from "@/lib/tenant";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";

export default async function Footer() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  const year = new Date().getFullYear();
  const tenant = await getCurrentTenant();
  const platformSettings = getPlatformSettings();
  const inventoryEnabled = platformSettingsHasFeature(platformSettings, "inventory");

  const projectName = tenant?.name ?? platformSettings.publicBrandName;
  const phoneNumber = tenant?.phoneNumber ?? null;
  const telegramUrl = tenant?.telegramUrl ?? null;
  const instagramUrl = tenant?.instagramUrl ?? null;

  const columns = [
    {
      title: t("residence"),
      links: [
        { label: t("masterPlan"), href: "/#explore" },
        { label: t("buildings"), href: "/#explore" },
        ...(inventoryEnabled ? [{ label: t("apartments"), href: "/apartments" }] : []),
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("aboutUyjoy").replace(/UyJoy|Uy Joy/g, platformSettings.publicBrandName), href: "/#about" },
        { label: t("news") },
        { label: t("careers") },
      ],
    },
    {
      title: t("information"),
      links: [
        { label: t("paymentOptions"), href: "/#contact" },
        { label: t("documents"), href: "/#contact" },
        { label: t("visitResidence"), href: "/#contact" },
        { label: t("privacyPolicy"), href: "/privacy" },
        { label: t("terms"), href: "/terms" },
      ],
    },
  ];

  return (
    <footer className="bg-[#111412] px-5 py-12 text-[#b9aa9c] md:py-16">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.9fr_0.9fr_0.9fr_1.1fr_0.9fr] lg:gap-0">
        <div className="lg:pr-10">
          <Link href="/" className="font-display text-[38px] font-semibold leading-none text-[#fff8ec]">
            {platformSettings.publicBrandName}
          </Link>
          <p className="mt-7 text-[14px] font-semibold text-[#fff8ec]">
            © {year} {projectName}
          </p>
          <p className="mt-3 text-[14px] font-medium text-[#b9aa9c]">
            {t("allRightsReserved")}
          </p>
          {platformSettings.showPoweredByUyJoy && (
            <p className="mt-3 text-[12px] font-medium text-[#81776d]">
              Powered by Uy Joy
            </p>
          )}
        </div>

        {columns.map((column) => (
          <div key={column.title} className="border-[#2c302c] lg:border-l lg:px-10">
            <h3 className="font-heading text-[14px] font-semibold text-[#fff8ec]">
              {column.title}
            </h3>
            <ul className="mt-5 space-y-3 text-[14px] font-medium">
              {column.links.map((link) => (
                <li key={link.label}>
                  {"href" in link && link.href ? (
                    <Link href={link.href} className="transition-colors hover:text-[#f0a383]">
                      {link.label}
                    </Link>
                  ) : (
                    <span className="text-[#81776d]">{link.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="border-[#2c302c] lg:border-l lg:px-10">
          <h3 className="font-heading text-[14px] font-semibold text-[#fff8ec]">
            {t("followUs")}
          </h3>
          <div className="mt-5 flex gap-4">
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[#2f342f] text-[#d8c8b5] transition-colors hover:border-[#c66348] hover:text-[#f0a383]"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" strokeWidth={1.7} />
              </a>
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[#2f342f] text-[#756c62]">
                <Instagram className="h-5 w-5" strokeWidth={1.7} />
              </span>
            )}
            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[#2f342f] text-[#d8c8b5] transition-colors hover:border-[#c66348] hover:text-[#f0a383]"
                aria-label="Telegram"
              >
                <Send className="h-5 w-5" strokeWidth={1.7} />
              </a>
            )}
            {phoneNumber && (
              <a
                href={`tel:${phoneNumber.replace(/\s/g, "")}`}
                className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[#2f342f] text-[#d8c8b5] transition-colors hover:border-[#c66348] hover:text-[#f0a383]"
                aria-label={phoneNumber}
              >
                <Phone className="h-5 w-5" strokeWidth={1.7} />
              </a>
            )}
          </div>
        </div>

        <div className="border-[#2c302c] lg:border-l lg:pl-10">
          <h3 className="font-heading text-[14px] font-semibold text-[#fff8ec]">
            {t("language")}
          </h3>
          <div className="mt-5 inline-flex items-center gap-3 text-[14px] font-semibold text-[#fff8ec]">
            <Globe2 className="h-5 w-5" strokeWidth={1.7} />
            {locale.toUpperCase()}
          </div>
        </div>
      </div>
    </footer>
  );
}
