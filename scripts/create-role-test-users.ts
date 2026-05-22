import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLE_TEST_USERS = [
  { role: "developer", email: "developer@role-test.local", name: "Role Test Developer" },
  { role: "owner", email: "owner@role-test.local", name: "Role Test Owner" },
  { role: "sales_director", email: "sales-director@role-test.local", name: "Role Test Sales Director" },
  { role: "sales_agent", email: "sales-agent@role-test.local", name: "Role Test Sales Agent" },
  { role: "external_agent", email: "external-agent@role-test.local", name: "Role Test External Agent" },
  { role: "marketing", email: "marketing@role-test.local", name: "Role Test Marketing" },
  { role: "finance", email: "finance@role-test.local", name: "Role Test Finance" },
] as const;

const LEGACY_ROLE_TEST_EMAILS = ["admin@role-test.local", "back-office@role-test.local", "legal@role-test.local", "superadmin@role-test.local"];

type RoleTestAction = "create" | "deactivate" | "delete";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name}.`);
  return value;
}

function actionFromEnv(): RoleTestAction {
  const action = process.env.ROLE_TEST_ACTION || "create";
  if (action === "create" || action === "deactivate" || action === "delete") return action;
  throw new Error("ROLE_TEST_ACTION must be create, deactivate, or delete.");
}

function assertSafety(action: RoleTestAction) {
  if (process.env.ROLE_TEST_CONFIRM !== action) {
    throw new Error(`Set ROLE_TEST_CONFIRM=${action} to ${action} role-test users.`);
  }

  if (process.env.NODE_ENV === "production" && process.env.ROLE_TEST_ALLOW_PRODUCTION !== "1") {
    throw new Error(`Refusing to ${action} role-test users with NODE_ENV=production. Set ROLE_TEST_ALLOW_PRODUCTION=1 only after verifying the target DB.`);
  }
}

async function upsertSalesProfile(userId: string, role: string, name: string) {
  if (role !== "sales_agent" && role !== "external_agent" && role !== "sales_director") return;

  await prisma.salesAgentProfile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: name,
      phone: "+998 90 000 00 00",
      monthlyTargetDeals: role === "sales_director" ? 8 : 4,
      monthlyTargetRevenue: role === "sales_director" ? 8000000000 : 4000000000,
    },
    update: {
      displayName: name,
      monthlyTargetDeals: role === "sales_director" ? 8 : 4,
      monthlyTargetRevenue: role === "sales_director" ? 8000000000 : 4000000000,
    },
  });
}

async function main() {
  const action = actionFromEnv();
  assertSafety(action);

  if (action === "deactivate") {
    const result = await prisma.user.updateMany({
      where: { email: { in: [...ROLE_TEST_USERS.map((user) => user.email), ...LEGACY_ROLE_TEST_EMAILS] } },
      data: { isActive: false },
    });
    console.log(`Deactivated ${result.count} role-test user(s).`);
    return;
  }

  if (action === "delete") {
    const users = await prisma.user.findMany({
      where: { email: { in: [...ROLE_TEST_USERS.map((user) => user.email), ...LEGACY_ROLE_TEST_EMAILS] } },
      select: { id: true },
    });
    await prisma.salesAgentProfile.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });
    const result = await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    console.log(`Deleted ${result.count} role-test user(s).`);
    return;
  }

  const password = required("ROLE_TEST_PASSWORD");
  const hashedPassword = await bcrypt.hash(password, 10);

  for (const input of ROLE_TEST_USERS) {
    const user = await prisma.user.upsert({
      where: { email: input.email },
      create: {
        email: input.email,
        name: input.name,
        role: input.role,
        password: hashedPassword,
        isActive: true,
      },
      update: {
        name: input.name,
        role: input.role,
        password: hashedPassword,
        isActive: true,
      },
    });
    await upsertSalesProfile(user.id, input.role, input.name);
    console.log(`${input.role}\t${input.email}`);
  }

  console.log("Role-test users are stored in the connected database.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
