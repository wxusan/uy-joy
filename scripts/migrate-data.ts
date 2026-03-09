// @ts-nocheck
import { PrismaClient as SqliteClient } from "@prisma/client";
import { PrismaClient as PostgresClient } from "@prisma/client";

// This script migrates data from SQLite to PostgreSQL
// Run with: npx ts-node scripts/migrate-data.ts

const SQLITE_URL = "file:./prisma/dev.db";
const POSTGRES_URL = process.env.DATABASE_URL!;

async function migrate() {
  console.log("🔄 Starting migration from SQLite to PostgreSQL...\n");

  // Connect to SQLite (source)
  const sqlite = new SqliteClient({
    datasources: { db: { url: SQLITE_URL } },
  });

  // Connect to PostgreSQL (target) 
  const postgres = new PostgresClient({
    datasources: { db: { url: POSTGRES_URL } },
  });

  try {
    // 1. Migrate Users
    console.log("📦 Migrating Users...");
    const users = await sqlite.user.findMany();
    for (const user of users) {
      await postgres.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log(`   ✅ ${users.length} users migrated`);

    // 2. Migrate Projects
    console.log("📦 Migrating Projects...");
    const projects = await sqlite.project.findMany();
    for (const project of projects) {
      await postgres.project.upsert({
        where: { id: project.id },
        update: project,
        create: project,
      });
    }
    console.log(`   ✅ ${projects.length} projects migrated`);

    // 3. Migrate Buildings
    console.log("📦 Migrating Buildings...");
    const buildings = await sqlite.building.findMany();
    for (const building of buildings) {
      await postgres.building.upsert({
        where: { id: building.id },
        update: building,
        create: building,
      });
    }
    console.log(`   ✅ ${buildings.length} buildings migrated`);

    // 4. Migrate Floors
    console.log("📦 Migrating Floors...");
    const floors = await sqlite.floor.findMany();
    for (const floor of floors) {
      await postgres.floor.upsert({
        where: { id: floor.id },
        update: floor,
        create: floor,
      });
    }
    console.log(`   ✅ ${floors.length} floors migrated`);

    // 5. Migrate Units
    console.log("📦 Migrating Units...");
    const units = await sqlite.unit.findMany();
    for (const unit of units) {
      await postgres.unit.upsert({
        where: { id: unit.id },
        update: unit,
        create: unit,
      });
    }
    console.log(`   ✅ ${units.length} units migrated`);

    // 6. Migrate Leads
    console.log("📦 Migrating Leads...");
    const leads = await sqlite.lead.findMany();
    for (const lead of leads) {
      await postgres.lead.upsert({
        where: { id: lead.id },
        update: lead,
        create: lead,
      });
    }
    console.log(`   ✅ ${leads.length} leads migrated`);

    // 7. Migrate HeroImages
    console.log("📦 Migrating HeroImages...");
    const heroImages = await sqlite.heroImage.findMany();
    for (const img of heroImages) {
      await postgres.heroImage.upsert({
        where: { id: img.id },
        update: img,
        create: img,
      });
    }
    console.log(`   ✅ ${heroImages.length} hero images migrated`);

    // 8. Migrate FAQs
    console.log("📦 Migrating FAQs...");
    const faqs = await sqlite.fAQ.findMany();
    for (const faq of faqs) {
      await postgres.fAQ.upsert({
        where: { id: faq.id },
        update: faq,
        create: faq,
      });
    }
    console.log(`   ✅ ${faqs.length} FAQs migrated`);

    console.log("\n✅ Migration completed successfully!");
    console.log("\n⚠️  Note: Image URLs pointing to /uploads/* won't work on Vercel.");
    console.log("   You'll need to re-upload images through the admin panel.");
    console.log("   They will automatically go to Cloudinary now.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  }
}

migrate();
