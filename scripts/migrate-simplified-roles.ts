import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_MIGRATIONS = [
  { from: "admin", to: "owner" },
  { from: "superadmin", to: "owner" },
  { from: "back_office", to: "finance" },
  { from: "legal", to: "finance" },
] as const;

function assertSafety() {
  if (process.env.ROLE_MIGRATION_CONFIRM !== "simplify") {
    throw new Error("Set ROLE_MIGRATION_CONFIRM=simplify to migrate legacy roles.");
  }
}

async function main() {
  assertSafety();

  for (const migration of ROLE_MIGRATIONS) {
    const result = await prisma.user.updateMany({
      where: { role: migration.from },
      data: { role: migration.to },
    });
    console.log(`${migration.from} -> ${migration.to}: ${result.count}`);
  }

  const developerEmail = process.env.UY_JOY_DEVELOPER_EMAIL?.trim().toLowerCase();
  if (developerEmail) {
    const result = await prisma.user.updateMany({
      where: { email: developerEmail },
      data: { role: "developer", isActive: true },
    });
    console.log(`developer assignment (${developerEmail}): ${result.count}`);
  }

  console.log("Legacy roles migrated to the simplified role model.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
