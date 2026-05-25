import { NextRequest, NextResponse } from "next/server";
import { findVisibleClientForQualification, getUnitRecommendations } from "@/lib/client-qualification";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;
  const { id } = await params;
  const settings = getPlatformSettings();
  const client = await findVisibleClientForQualification(id, auth.user, settings.allowAgentClaim);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: await getUnitRecommendations(id) });
}
