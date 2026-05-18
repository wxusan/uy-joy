import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const unitTemplates = [
  { rooms: 1, area: 35, position: 0 },
  { rooms: 2, area: 54, position: 1 },
  { rooms: 3, area: 78, position: 2 },
  { rooms: 2, area: 58, position: 3 },
  { rooms: 3, area: 82, position: 4 },
  { rooms: 1, area: 38, position: 5 },
];

const statuses = ["available", "available", "available", "available", "reserved", "reserved", "sold"];

const defaultFaqs = [
  {
    questionUz: "Ipoteka kredit bormi?",
    answerUz:
      "Ha, biz bir nechta banklar bilan hamkorlik qilamiz, ular qulay shartlarda ipoteka kreditlarini taklif qiladi. Menejerlarimiz sizga eng yaxshi variantni tanlashda yordam beradi.",
    questionEn: "Is mortgage credit available?",
    answerEn:
      "Yes, we work with several banks that offer mortgage loans with favorable terms. Our managers will help you choose the best option.",
    questionRu: "Есть ли ипотечный кредит?",
    answerRu:
      "Да, мы сотрудничаем с несколькими банками, которые предлагают ипотечные кредиты на выгодных условиях. Наши менеджеры помогут подобрать лучший вариант.",
  },
  {
    questionUz: "Xonadon ta'mirlangan holda topshiriladimi?",
    answerUz:
      "Xonadonlar tayyor ta'mir bilan, lekin mebelsiz topshiriladi. Kerak bo'lsa, ichki dizayn bo'yicha hamkorlarimizni tavsiya qilishimiz mumkin.",
    questionEn: "Are apartments delivered furnished?",
    answerEn:
      "Apartments are delivered with finished repairs but without furniture. We can recommend interior design partners if needed.",
    questionRu: "Квартиры сдаются с ремонтом?",
    answerRu:
      "Квартиры сдаются с чистовой отделкой, но без мебели. При необходимости мы можем порекомендовать партнеров по дизайну интерьера.",
  },
  {
    questionUz: "To'lash muddatini uzaytirish mumkinmi?",
    answerUz:
      "Ha, biz moslashuvchan to'lov rejalarini taklif qilamiz. Siz bo'lib to'lash variantlarini savdo bo'limimiz bilan muhokama qilishingiz mumkin.",
    questionEn: "Is it possible to extend the payment period?",
    answerEn:
      "Yes, we offer flexible payment plans. You can discuss installment options with our sales team.",
    questionRu: "Можно ли продлить срок оплаты?",
    answerRu:
      "Да, мы предлагаем гибкие планы оплаты. Вы можете обсудить варианты рассрочки с нашим отделом продаж.",
  },
  {
    questionUz: "Sizning savdo ofisingiz qayerda?",
    answerUz:
      "Savdo ofisimiz qurilish maydonchasida joylashgan. Har kuni soat 9:00 dan 18:00 gacha tashrif buyurishingiz mumkin.",
    questionEn: "Where is your sales office located?",
    answerEn:
      "Our sales office is located at the construction site. You can visit us any day from 9:00 to 18:00.",
    questionRu: "Где находится ваш офис продаж?",
    answerRu:
      "Наш офис продаж расположен на строительной площадке. Вы можете посетить нас в любой день с 9:00 до 18:00.",
  },
];

async function main() {
  // Clear existing data
  await prisma.unit.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.project.deleteMany();
  await prisma.fAQ.deleteMany();
  await prisma.user.deleteMany();

  // Create superadmin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      email: "admin@navruz.uz",
      password: hashedPassword,
      name: "Super Admin",
      role: "superadmin",
    },
  });

  // Create project
  const project = await prisma.project.create({
    data: {
      name: "Navruz Residence",
      description:
        "Premium residential complex in the heart of Tashkent. Modern architecture, green areas, underground parking, children's playground, and 24/7 security. Located near Amir Temur Square with easy access to metro, schools, and shopping centers.",
      address: "Tashkent, Mirzo Ulugbek district, Buyuk Ipak Yuli 123",
      // Sample aerial view - admin can upload real image
      topViewImage: null,
    },
  });

  // Create building with position data (for clickable area on aerial view)
  // Position is percentage-based: x, y, width, height relative to image
  const building = await prisma.building.create({
    data: {
      name: "Block A",
      projectId: project.id,
      // Building facade images - admin can upload
      frontViewImage: null,
      backViewImage: null,
      leftViewImage: null,
      rightViewImage: null,
    },
  });

  // Create 9 floors with units
  for (let floorNum = 1; floorNum <= 9; floorNum++) {
    let basePricePerM2: number;
    if (floorNum <= 3) basePricePerM2 = 8_000_000;
    else if (floorNum <= 6) basePricePerM2 = 10_000_000;
    else basePricePerM2 = 12_000_000;

    // Calculate floor position on building facade (percentage from bottom)
    // 9 floors, so each floor takes about 10% of height, starting from 10%
    const yEnd = 90 - (floorNum - 1) * 9;
    const yStart = yEnd - 8;

    const floor = await prisma.floor.create({
      data: {
        number: floorNum,
        buildingId: building.id,
        basePricePerM2,
        // Position on building facade image (as percentage from top)
        positionData: JSON.stringify({ yStart, yEnd }),
        // Floor plan image - admin can upload
        floorPlanImage: null,
      },
    });

    // Create 6 units per floor
    for (const template of unitTemplates) {
      const unitNum = `${floorNum}0${template.position + 1}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Corner units (position 0 and 5) get 15% premium
      const isCorner = template.position === 0 || template.position === 5;
      const priceOverride = isCorner ? basePricePerM2 * 1.15 : undefined;

      await prisma.unit.create({
        data: {
          unitNumber: unitNum,
          floorId: floor.id,
          rooms: template.rooms,
          area: template.area,
          status,
          pricePerM2: priceOverride,
        },
      });
    }
  }

  await prisma.fAQ.createMany({
    data: defaultFaqs.map((faq, index) => ({
      ...faq,
      sortOrder: index,
      isActive: true,
    })),
  });

  console.log("✅ Seed completed: 1 project, 1 building, 9 floors, 54 units, 4 FAQs, 1 superadmin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
