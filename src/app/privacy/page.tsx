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
    title: "Maxfiylik siyosati",
    intro: "UyJoy orqali yuborilgan arizalar ko'chmas mulk savdo jamoasi bilan bog'lanish uchun qayta ishlanadi.",
    updated: "Oxirgi yangilanish: 16-may, 2026",
    sections: [
      {
        title: "Qanday ma'lumotlarni yig'amiz",
        body: "Ariza yuborganingizda ismingiz, telefon raqamingiz va siz qiziqqan loyiha, bino, qavat yoki xonadon haqidagi ma'lumotlarni yig'amiz.",
      },
      {
        title: "Ma'lumotlar qayerda saqlanadi",
        body: "Arizalar Postgres ma'lumotlar bazasida Vercel infratuzilmasi orqali saqlanadi. Rasm va yuklangan materiallar Cloudinary xizmatida saqlanishi mumkin.",
      },
      {
        title: "Kimlar kirish huquqiga ega",
        body: "Ma'lumotlarga faqat savdo jamoasi va xizmatni ishlatish uchun zarur bo'lgan infratuzilma, monitoring, captcha, analytics va Anthropic-style data sub-processors kirishi mumkin.",
      },
      {
        title: "Saqlash muddati",
        body: "Ariza ma'lumotlari siz bilan oxirgi aloqa qilingan kundan boshlab 24 oy davomida saqlanadi, keyin o'chiriladi yoki anonimlashtiriladi.",
      },
      {
        title: "O'chirishni so'rash",
        body: "Ma'lumotlaringizni ko'rish yoki o'chirishni so'rash uchun sales@uy-joy.com manziliga ismingiz va telefon raqamingiz bilan yozing.",
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    intro: "Заявки, отправленные через UyJoy, обрабатываются для связи с отделом продаж недвижимости.",
    updated: "Последнее обновление: 16 мая 2026",
    sections: [
      {
        title: "Какие данные мы собираем",
        body: "При отправке заявки мы собираем имя, номер телефона и информацию о проекте, корпусе, этаже или квартире, которыми вы интересуетесь.",
      },
      {
        title: "Где хранятся данные",
        body: "Заявки хранятся в базе данных Postgres на инфраструктуре Vercel. Изображения и загруженные материалы могут храниться в Cloudinary.",
      },
      {
        title: "Кто имеет доступ",
        body: "Доступ имеют только отдел продаж и необходимые субпроцессоры данных для инфраструктуры, мониторинга, captcha, аналитики и Anthropic-style data sub-processors.",
      },
      {
        title: "Срок хранения",
        body: "Данные заявки хранятся 24 месяца с момента последнего контакта с вами, после чего удаляются или анонимизируются.",
      },
      {
        title: "Как запросить удаление",
        body: "Чтобы запросить доступ к данным или их удаление, напишите на sales@uy-joy.com, указав имя и номер телефона.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    intro: "Leads submitted through UyJoy are processed so the real-estate sales team can contact you.",
    updated: "Last updated: May 16, 2026",
    sections: [
      {
        title: "What we collect",
        body: "When you submit a lead, we collect your name, phone number, and the project, building, floor, or unit interest connected to the request.",
      },
      {
        title: "Where we store it",
        body: "Lead data is stored in Postgres on Vercel infrastructure. Images and uploaded materials may be stored on Cloudinary.",
      },
      {
        title: "Who can access it",
        body: "Access is limited to the sales team and necessary infrastructure, monitoring, captcha, analytics, and Anthropic-style data sub-processors used to operate the service.",
      },
      {
        title: "Retention period",
        body: "Lead data is retained for 24 months from the last contact with you, then deleted or anonymized.",
      },
      {
        title: "How to request deletion",
        body: "To request access or deletion, email sales@uy-joy.com with your name and phone number.",
      },
    ],
  },
};

export default async function PrivacyPage() {
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
