import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function readJson(filename: string) {
  const filepath = path.join(__dirname, "data", filename);
  const content = fs.readFileSync(filepath, "utf-8").trim();
  if (!content || content === "[]") return [];
  return JSON.parse(content);
}

async function importData() {
  console.log("🔄 Importing data to PostgreSQL...\n");

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log("🧹 Clearing existing data...");
    await prisma.lead.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.building.deleteMany();
    await prisma.heroImage.deleteMany();
    await prisma.fAQ.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // 1. Users
    const users = readJson("users.json");
    console.log(`📦 Importing ${users.length} users...`);
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          createdAt: new Date(user.createdAt),
        },
      });
    }

    // 2. Projects
    const projects = readJson("projects.json");
    console.log(`📦 Importing ${projects.length} projects...`);
    for (const p of projects) {
      await prisma.project.create({
        data: {
          id: p.id,
          name: p.name,
          nameTranslations: p.nameTranslations,
          description: p.description,
          descriptionTranslations: p.descriptionTranslations,
          address: p.address,
          addressTranslations: p.addressTranslations,
          coverImage: p.coverImage,
          topViewImage: p.topViewImage,
          latitude: p.latitude,
          longitude: p.longitude,
          infrastructure: p.infrastructure,
          createdAt: new Date(p.createdAt),
        },
      });
    }

    // 3. Buildings
    const buildings = readJson("buildings.json");
    console.log(`📦 Importing ${buildings.length} buildings...`);
    for (const b of buildings) {
      await prisma.building.create({
        data: {
          id: b.id,
          name: b.name,
          nameTranslations: b.nameTranslations,
          projectId: b.projectId,
          frontViewImage: b.frontViewImage,
          backViewImage: b.backViewImage,
          leftViewImage: b.leftViewImage,
          rightViewImage: b.rightViewImage,
          positionData: b.positionData,
          polygonData: b.polygonData,
          sortOrder: b.sortOrder,
          createdAt: new Date(b.createdAt),
        },
      });
    }

    // 4. Floors
    const floors = readJson("floors.json");
    console.log(`📦 Importing ${floors.length} floors...`);
    for (const f of floors) {
      await prisma.floor.create({
        data: {
          id: f.id,
          number: f.number,
          buildingId: f.buildingId,
          basePricePerM2: f.basePricePerM2,
          floorPlanImage: f.floorPlanImage,
          positionData: f.positionData,
          createdAt: new Date(f.createdAt),
        },
      });
    }

    // 5. Units
    const units = readJson("units.json");
    console.log(`📦 Importing ${units.length} units...`);
    for (const u of units) {
      await prisma.unit.create({
        data: {
          id: u.id,
          unitNumber: u.unitNumber,
          floorId: u.floorId,
          rooms: u.rooms,
          area: u.area,
          status: u.status,
          pricePerM2: u.pricePerM2,
          totalPrice: u.totalPrice,
          svgPathId: u.svgPathId,
          polygonData: u.polygonData,
          labelX: u.labelX,
          labelY: u.labelY,
          sketchImage: u.sketchImage,
          sketchImage2: u.sketchImage2,
          sketchImage3: u.sketchImage3,
          sketchImage4: u.sketchImage4,
          description: u.description,
          descriptionTranslations: u.descriptionTranslations,
          features: u.features,
          customerName: u.customerName,
          customerPhone: u.customerPhone,
          customerNotes: u.customerNotes,
          statusChangedAt: u.statusChangedAt ? new Date(u.statusChangedAt) : null,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

    // 6. Leads
    const leads = readJson("leads.json");
    console.log(`📦 Importing ${leads.length} leads...`);
    for (const l of leads) {
      await prisma.lead.create({
        data: {
          id: l.id,
          name: l.name,
          phone: l.phone,
          projectId: l.projectId,
          projectName: l.projectName,
          unitId: l.unitId,
          unitNumber: l.unitNumber,
          status: l.status,
          notes: l.notes,
          createdAt: new Date(l.createdAt),
        },
      });
    }

    // 7. HeroImages
    const heroImages = readJson("heroImages.json");
    console.log(`📦 Importing ${heroImages.length} hero images...`);
    for (const h of heroImages) {
      await prisma.heroImage.create({
        data: {
          id: h.id,
          imageUrl: h.imageUrl,
          sortOrder: h.sortOrder,
          createdAt: new Date(h.createdAt),
        },
      });
    }

    // 8. FAQs
    const faqs = readJson("faqs.json");
    console.log(`📦 Importing ${faqs.length} FAQs...`);
    for (const f of faqs) {
      await prisma.fAQ.create({
        data: {
          id: f.id,
          questionUz: f.questionUz,
          questionEn: f.questionEn,
          questionRu: f.questionRu,
          answerUz: f.answerUz,
          answerEn: f.answerEn,
          answerRu: f.answerRu,
          sortOrder: f.sortOrder,
          isActive: f.isActive === 1 || f.isActive === true,
          createdAt: new Date(f.createdAt),
        },
      });
    }

    console.log("\n✅ Import completed successfully!");
    console.log("\n⚠️  Note: Image URLs still point to /uploads/* which won't work on Vercel.");
    console.log("   You'll need to re-upload images through the admin panel.");

  } catch (error) {
    console.error("❌ Import failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData();
