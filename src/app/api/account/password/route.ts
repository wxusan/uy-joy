import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requirePlatformApiAccess } from "@/lib/platform-guards";
import { PasswordChangeSchema } from "@/lib/schemas/user";
import { invalidInput } from "@/lib/schemas/common";
import { logger } from "@/lib/logger";

export async function PATCH(req: Request) {
  const auth = await requirePlatformApiAccess();
  if (auth.response) return auth.response;
  if (!auth.user?.id) return NextResponse.json({ error: "Missing user id" }, { status: 401 });

  const parsed = PasswordChangeSchema.safeParse(await req.json());
  if (!parsed.success) return invalidInput(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, password: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const matches = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!matches) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  logger.info("account_password_changed", { userId: user.id });
  return NextResponse.json({ success: true });
}

