import { NextRequest, NextResponse } from "next/server";
import { canEditClientQualification, findVisibleClientForQualification, removeInterestedUnit } from "@/lib/client-qualification";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; unitId: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;
  const { id, unitId } = await params;
  const settings = getPlatformSettings();
  const client = await findVisibleClientForQualification(id, auth.user, settings.allowAgentClaim);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditClientQualification(auth.user, client)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await removeInterestedUnit(id, unitId, auth.user?.id ?? null);
  return NextResponse.json({ success: true });
}
