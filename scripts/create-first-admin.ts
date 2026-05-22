import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";
import { V1_PLATFORM_ROLES, isPlatformRole } from "../src/lib/platform-plans";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertStrongPassword(password: string) {
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("ADMIN_PASSWORD must include uppercase, lowercase, and a number");
  }
}

async function main() {
  const email = required("ADMIN_EMAIL").toLowerCase();
  const password = required("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "Client Owner";
  const requestedRole = process.env.ADMIN_ROLE?.trim() || "owner";
  if (!isPlatformRole(requestedRole) || !(V1_PLATFORM_ROLES as readonly string[]).includes(requestedRole)) {
    throw new Error(`ADMIN_ROLE must be one of: ${V1_PLATFORM_ROLES.join(", ")}`);
  }
  assertStrongPassword(password);

  const existingUsers = await prisma.user.count();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && process.env.ADMIN_OVERWRITE !== "1") {
    throw new Error("A user with ADMIN_EMAIL already exists. Set ADMIN_OVERWRITE=1 to reset it.");
  }
  if (existingUsers > 0 && !existing && process.env.ALLOW_ADMIN_BOOTSTRAP !== "1") {
    throw new Error("Users already exist. Set ALLOW_ADMIN_BOOTSTRAP=1 to add another bootstrap admin.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name, password: hashedPassword, role: requestedRole, isActive: true },
      })
    : await prisma.user.create({
        data: { name, email, password: hashedPassword, role: requestedRole, isActive: true },
      });

  console.log(`Bootstrap admin ready: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

