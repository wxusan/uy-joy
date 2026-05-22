"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Globe2, Menu, Phone, X } from "lucide-react";
import { Locale, localeNames, locales } from "@/lib/locales";

type NavbarLabels = {
  residence: string;
  apartments: string;
  location: string;
  aboutUyjoy: string;
  contacts: string;
  contactSales: string;
};

type NavItem = {
  label: string;
  href: string;
  matchPath?: string;
  hash?: string;
};

type NavbarClientProps = {
  currentLocale: string;
  phoneNumber?: string | null;
  brandName: string;
  showApartments: boolean;
  labels: NavbarLabels;
};

const localeShortNames: Record<Locale, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

const homeSectionIds = ["explore", "about", "location", "contact"] as const;

export default function NavbarClient({ currentLocale, phoneNumber, brandName, showApartments, labels }: NavbarClientProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const tc = useTranslations("common");
  const [activeSection, setActiveSection] = useState("explore");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const normalizedLocale = locales.includes(currentLocale as Locale)
    ? (currentLocale as Locale)
    : "uz";

  const navItems: NavItem[] = [
    { label: labels.residence, href: "/", matchPath: "/" },
    ...(showApartments ? [{ label: labels.apartments, href: "/apartments", matchPath: "/apartments" }] : []),
    { label: labels.location, href: "/#location", hash: "location" },
    { label: labels.aboutUyjoy, href: "/#about", hash: "about" },
    { label: labels.contacts, href: "/#contact", hash: "contact" },
  ];

  useEffect(() => {
    if (pathname !== "/") return;

    const getHeaderOffset = () => {
      const header = document.querySelector("header");
      return header ? Math.round(header.getBoundingClientRect().height) : 92;
    };

    const getCurrentSection = () => {
      const offset = getHeaderOffset() + window.innerHeight * 0.22;
      let current = "explore";

      for (const sectionId of homeSectionIds) {
        const element = document.getElementById(sectionId);
        if (!element) continue;

        const top = element.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY + offset >= top) {
          current = sectionId;
        }
      }

      setActiveSection(current);
    };

    getCurrentSection();
    window.addEventListener("scroll", getCurrentSection, { passive: true });
    window.addEventListener("resize", getCurrentSection);

    return () => {
      window.removeEventListener("scroll", getCurrentSection);
      window.removeEventListener("resize", getCurrentSection);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") return;

    const target = window.location.hash.replace("#", "");
    if (!homeSectionIds.includes(target as (typeof homeSectionIds)[number])) return;

    window.setTimeout(() => {
      scrollToSection(target, "auto");
    }, 80);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        setLanguageOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const switchLocale = (locale: Locale) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    setLanguageOpen(false);
    setMenuOpen(false);
    startTransition(() => {
      router.refresh();
    });
  };

  const scrollToSection = (sectionId: string, behavior: ScrollBehavior = "smooth") => {
    const element = document.getElementById(sectionId);
    const header = document.querySelector("header");
    const headerOffset = header ? Math.round(header.getBoundingClientRect().height) : 92;
    const sectionTop = element ? element.getBoundingClientRect().top + window.scrollY : 0;
    const revealGap = sectionId === "explore" ? 0 : 12;
    const top = sectionId === "explore" ? 0 : Math.max(0, sectionTop - headerOffset - revealGap);

    window.scrollTo({ top, behavior });
    setActiveSection(sectionId);

    const nextHash = sectionId === "explore" ? "/" : `/#${sectionId}`;
    window.history.replaceState(null, "", nextHash);
  };

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    setMenuOpen(false);

    if (!item.hash && item.matchPath === "/") {
      if (pathname === "/") {
        event.preventDefault();
        scrollToSection("explore");
      }
      return;
    }

    if (!item.hash) return;

    event.preventDefault();

    if (pathname === "/") {
      scrollToSection(item.hash);
      return;
    }

    window.sessionStorage.setItem("uyjoy-scroll-target", item.hash);
    router.push(`/#${item.hash}`);
  };

  useEffect(() => {
    if (pathname !== "/") return;

    const target = window.sessionStorage.getItem("uyjoy-scroll-target");
    if (!target) return;

    window.sessionStorage.removeItem("uyjoy-scroll-target");
    window.setTimeout(() => {
      scrollToSection(target);
    }, 120);
  }, [pathname]);

  const isActive = (item: NavItem) => {
    if (item.hash) {
      return pathname === "/" && activeSection === item.hash;
    }

    if (item.matchPath === "/") {
      return pathname === "/" && activeSection === "explore";
    }

    return pathname === item.matchPath || pathname.startsWith(`${item.matchPath}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#f0d7be]/10 bg-[#10100f] text-[#f3eadc] shadow-[0_1px_0_rgba(255,255,255,0.025)] lg:bg-[rgba(17,18,16,0.36)] lg:backdrop-blur-xl">
      <div className="flex h-[76px] items-center px-[clamp(22px,2.6vw,44px)] lg:h-[92px]">
        <Link
          href="/"
          className="group relative top-[4px] flex shrink-0 flex-col leading-none lg:top-[7px]"
          aria-label={`${brandName} ${labels.residence}`}
          onClick={() => setMenuOpen(false)}
        >
          <span className="font-display text-[34px] font-semibold leading-[0.82] tracking-normal text-[#f2dfc5] transition-colors group-hover:text-white lg:text-[39px]">
            {brandName}
          </span>
          <span className="mt-1 pl-[15px] text-[13px] font-medium leading-none tracking-normal text-[#d8c5ad] lg:text-[13px]">
            {labels.residence}
          </span>
        </Link>

        <span className="ml-[20px] mr-[34px] hidden h-8 w-px shrink-0 bg-[#5b5048]/80 lg:block" />

        <nav className="hidden items-center gap-[clamp(28px,3.2vw,58px)] lg:flex">
          {navItems.map((item) => {
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => handleNavClick(event, item)}
                className={`relative flex h-[92px] items-center whitespace-nowrap text-[16px] font-medium leading-none tracking-normal transition-colors ${
                  active ? "text-[#f5eadc]" : "text-[#e3d7c8] hover:text-white"
                } after:absolute after:bottom-[18px] after:left-0 after:h-[2px] after:w-[40px] after:origin-left after:rounded-full after:bg-[#d76445] after:transition-transform ${
                  active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <div ref={languageMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setLanguageOpen((open) => !open)}
              disabled={isPending}
              className="flex h-[50px] items-center gap-2 rounded-[6px] px-1 text-[15px] font-medium leading-none text-[#efe3d3] transition-colors hover:text-white disabled:opacity-55"
              aria-haspopup="menu"
              aria-expanded={languageOpen}
            >
              <Globe2 className="h-[20px] w-[20px]" strokeWidth={1.8} />
              <span>{localeShortNames[normalizedLocale]}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${languageOpen ? "rotate-180" : ""}`}
                strokeWidth={1.8}
              />
            </button>

            {languageOpen && (
              <div className="absolute right-0 top-[58px] w-40 overflow-hidden rounded-[6px] border border-[#4a4038] bg-[#151513]/95 py-1 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => switchLocale(locale)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] transition-colors ${
                      locale === normalizedLocale
                        ? "text-[#f2dfc5]"
                        : "text-[#cbbdab] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{localeNames[locale]}</span>
                    <span className="text-[11px] text-[#9f8f7e]">{localeShortNames[locale]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {phoneNumber && (
            <a
              href={`tel:${phoneNumber.replace(/\s/g, "")}`}
              className="flex h-[50px] min-w-[207px] items-center justify-center gap-3 rounded-[6px] border border-[#a95b40]/85 px-5 text-[15px] font-medium leading-none tracking-normal text-[#f4e8d8] transition-colors hover:border-[#d36a4b] hover:bg-[#d36a4b]/10 hover:text-white"
            >
              <Phone className="h-[20px] w-[20px] text-[#d36a4b]" strokeWidth={1.8} />
              <span>{phoneNumber}</span>
            </a>
          )}

          <Link
            href="/#contact"
            onClick={(event) => handleNavClick(event, { label: labels.contacts, href: "/#contact", hash: "contact" })}
            className="flex h-[50px] min-w-[160px] items-center justify-center rounded-[6px] bg-[#d36a4b] px-6 text-[16px] font-semibold leading-none text-white transition-colors hover:bg-[#e07856]"
          >
            {labels.contactSales}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-[6px] border border-[#5b5048] text-[#f2dfc5] transition-colors hover:border-[#d36a4b] hover:text-white lg:hidden"
          aria-label={menuOpen ? tc("closeNavigation") : tc("openNavigation")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[#f0d7be]/10 bg-[rgba(17,18,16,0.92)] px-[clamp(22px,2.6vw,44px)] py-4 shadow-[0_24px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:hidden">
          <nav className="flex flex-col">
            {navItems.map((item) => {
              const active = isActive(item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => handleNavClick(event, item)}
                  className={`border-b border-white/5 py-3 text-[16px] font-medium ${
                    active ? "text-[#f2dfc5]" : "text-[#d7caba]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="grid grid-cols-3 overflow-hidden rounded-[6px] border border-[#4a4038]">
              {locales.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => switchLocale(locale)}
                  disabled={isPending}
                  className={`h-11 text-[13px] font-semibold transition-colors ${
                    locale === normalizedLocale
                      ? "bg-[#d36a4b] text-white"
                      : "text-[#d7caba] hover:bg-white/5"
                  }`}
                >
                  {localeShortNames[locale]}
                </button>
              ))}
            </div>

            {phoneNumber && (
              <a
                href={`tel:${phoneNumber.replace(/\s/g, "")}`}
                className="flex h-11 items-center justify-center gap-2 rounded-[6px] border border-[#a95b40]/85 px-4 text-[14px] font-medium text-[#f4e8d8]"
              >
                <Phone className="h-4 w-4 text-[#d36a4b]" />
                {phoneNumber}
              </a>
            )}

            <Link
              href="/#contact"
              onClick={(event) => handleNavClick(event, { label: labels.contacts, href: "/#contact", hash: "contact" })}
              className="flex h-11 items-center justify-center rounded-[6px] bg-[#d36a4b] px-4 text-[14px] font-semibold text-white"
            >
              {labels.contactSales}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
