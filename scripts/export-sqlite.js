const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

// Temporarily point to SQLite
process.env.DATABASE_URL = "file:./prisma/dev.db";

const prisma = new PrismaClient();

async function exportData() {
  console.log("📦 Exporting data from SQLite...\n");

  const data = {
    users: await prisma.user.findMany(),
    projects: await prisma.project.findMany(),
    buildings: await prisma.building.findMany(),
    floors: await prisma.floor.findMany(),
    units: await prisma.unit.findMany(),
    leads: await prisma.lead.findMany(),
    heroImages: await prisma.heroImage.findMany(),
    faqs: await prisma.fAQ.findMany(),
  };

  console.log(`Users: ${data.users.length}`);
  console.log(`Projects: ${data.projects.length}`);
  console.log(`Buildings: ${data.buildings.length}`);
  console.log(`Floors: ${data.floors.length}`);
  console.log(`Units: ${data.units.length}`);
  console.log(`Leads: ${data.leads.length}`);
  console.log(`HeroImages: ${data.heroImages.length}`);
  console.log(`FAQs: ${data.faqs.length}`);

  fs.writeFileSync("scripts/data-export.json", JSON.stringify(data, null, 2));
  console.log("\n✅ Exported to scripts/data-export.json");

  await prisma.$disconnect();
}

exportData().catch(console.error);
