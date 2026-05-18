import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getLocale } from "next-intl/server";

type Locale = "uz" | "ru" | "en";

const content: Record<Locale, {
  title: string;
  intro: string;
  updated: string;
  sections: Array<{ title: string; body: string }>;
}> = {
  uz: {
    title: "Foydalanish shartlari",
    intro: "UyJoy platformasidan foydalanish orqali quyidagi shartlarga rozilik bildirasiz.",
    updated: "Oxirgi yangilanish: 16-may, 2026",
    sections: [
      {
        title: "Xizmat doirasi",
        body: "UyJoy turar joy loyihalarini ko'rish, xonadon rejalari bilan tanishish va savdo jamoasiga ariza yuborish uchun raqamli platformadir.",
      },
      {
        title: "Xarid kafolati yo'q",
        body: "Ariza yuborish, xonadonni ko'rish yoki xonadon bo'yicha qiziqish bildirish xarid, bron yoki narx kafolatini bermaydi.",
      },
      {
        title: "Ma'lumotlar aniqligi",
        body: "Maydon, narx, mavjudlik, rasm va loyiha haqidagi ma'lumotlar o'zgarishi mumkin. Yakuniy ma'lumotlarni savdo jamoasi va rasmiy shartnoma tasdiqlaydi.",
      },
      {
        title: "Nizolar yurisdiksiyasi",
        body: "Platformadan foydalanish bilan bog'liq nizolar O'zbekiston Respublikasi qonunchiligi va vakolatli sudlari doirasida ko'rib chiqiladi.",
      },
    ],
  },
  ru: {
    title: "Условия использования",
    intro: "Используя платформу UyJoy, вы соглашаетесь со следующими условиями.",
    updated: "Последнее обновление: 16 мая 2026",
    sections: [
      {
        title: "Объем сервиса",
        body: "UyJoy — цифровая платформа для просмотра жилых проектов, планировок квартир и отправки заявки в отдел продаж.",
      },
      {
        title: "Нет гарантии покупки",
        body: "Отправка заявки, просмотр квартиры или выражение интереса не является гарантией покупки, бронирования или фиксированной цены.",
      },
      {
        title: "Точность информации",
        body: "Площадь, цена, доступность, изображения и сведения о проекте могут изменяться. Окончательные условия подтверждаются отделом продаж и официальным договором.",
      },
      {
        title: "Юрисдикция споров",
        body: "Споры, связанные с использованием платформы, рассматриваются по законодательству Республики Узбекистан и в компетентных судах.",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    intro: "By using UyJoy, you agree to the following service terms.",
    updated: "Last updated: May 16, 2026",
    sections: [
      {
        title: "Scope of service",
        body: "UyJoy is a digital platform for browsing residential projects, viewing apartment plans, and sending requests to the sales team.",
      },
      {
        title: "No purchase guarantee",
        body: "Submitting a lead, viewing a unit, or expressing interest does not guarantee a purchase, reservation, or fixed price.",
      },
      {
        title: "Information accuracy",
        body: "Area, price, availability, images, and project information may change. Final details are confirmed by the sales team and official contract documents.",
      },
      {
        title: "Dispute jurisdiction",
        body: "Disputes related to platform use are governed by the laws of the Republic of Uzbekistan and handled by the competent courts.",
      },
    ],
  },
};

export default async function TermsPage() {
  const locale = (await getLocale()) as Locale;
  const page = content[locale] ?? content.uz;

  return (
    <main className="min-h-screen bg-[#f4efe7] text-[#15120f]">
      <Navbar />
      <section className="px-5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="font-heading text-[13px] font-semibold uppercase tracking-[0.24em] text-[#c66348]">
            UyJoy
          </p>
          <h1 className="mt-4 font-display text-[48px] font-semibold leading-none tracking-normal text-[#15120f] md:text-[76px]">
            {page.title}
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] font-medium leading-8 text-[#6f675e]">
            {page.intro}
          </p>
          <p className="mt-4 text-[13px] font-semibold text-[#8a7d70]">{page.updated}</p>

          <div className="mt-12 divide-y divide-[#d8cabc] border-y border-[#d8cabc]">
            {page.sections.map((section) => (
              <section key={section.title} className="grid gap-4 py-8 md:grid-cols-[240px_1fr]">
                <h2 className="font-heading text-[22px] font-semibold leading-snug text-[#15120f]">
                  {section.title}
                </h2>
                <p className="text-[15px] font-medium leading-7 text-[#5f574f]">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
