import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { UserCreateSchema } from "@/lib/schemas/user";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiAccess } from "@/lib/platform-guards";
import { roleHasPlatformPermission } from "@/lib/platform-plans";

export async function GET() {
  const auth = await requirePlatformApiAccess("manageUsers");
  if (auth.response) return auth.response;
  const canSeeDeveloperAccounts = roleHasPlatformPermission(auth.user?.role, "technicalSettings");

  const users = await prisma.user.findMany({
    where: canSeeDeveloperAccounts ? undefined : { role: { not: "developer" } },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const auth = await requirePlatformApiAccess("manageUsers");
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = UserCreateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const role = input.role || "owner";

  if (role === "developer" && !roleHasPlatformPermission(auth.user?.role, "technicalSettings")) {
    return NextResponse.json({ error: "Developer accounts are managed by Uy Joy support" }, { status: 403 });
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role,
      ...(role === "sales_agent" || role === "external_agent" || role === "sales_director"
        ? {
            salesAgentProfile: {
              create: {
                displayName: input.name,
              },
            },
          }
        : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  const auth = await requirePlatformApiAccess("manageUsers");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Prevent self-deletion
  if (id === auth.user?.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === "developer" && !roleHasPlatformPermission(auth.user?.role, "technicalSettings")) {
    return NextResponse.json({ error: "Developer accounts are managed by Uy Joy support" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
