import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requirePlatformApiAccess } from "@/lib/platform-guards";
import { roleHasPlatformPermission } from "@/lib/platform-plans";
import { UserPasswordResetSchema } from "@/lib/schemas/user";
import { invalidInput } from "@/lib/schemas/common";
import { logger } from "@/lib/logger";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiAccess("manageUsers");
  if (auth.response) return auth.response;

  const { id } = await params;
  const parsed = UserPasswordResetSchema.safeParse(await req.json());
  if (!parsed.success) return invalidInput(parsed.error);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "developer" && !roleHasPlatformPermission(auth.user?.role, "technicalSettings")) {
    return NextResponse.json({ error: "Developer accounts are managed by Uy Joy support" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id },
    data: { password: await bcrypt.hash(parsed.data.password, 10) },
  });

  logger.info("user_password_reset", { actorId: auth.user?.id, targetUserId: id });
  return NextResponse.json({ success: true });
}

