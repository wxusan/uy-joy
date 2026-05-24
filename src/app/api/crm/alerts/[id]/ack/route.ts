import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformApiAccess } from "@/lib/platform-guards";
import { canViewDirectorPanel } from "@/lib/crm-access";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiAccess("viewReports");
  if (auth.response) return auth.response;
  if (!canViewDirectorPanel(auth.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const alert = await prisma.telegramNotificationLog.update({
    where: { id },
    data: { status: "acknowledged", errorMessage: null },
  });

  return NextResponse.json(alert);
}
