import { NextRequest, NextResponse } from "next/server";
import {
  addInterestedUnit,
  canEditClientQualification,
  findVisibleClientForQualification,
  getInterestedUnits,
  InterestedUnitCreateSchema,
} from "@/lib/client-qualification";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "viewLeads");
  if (auth.response) return auth.response;
  const { id } = await params;
  const settings = getPlatformSettings();
  const client = await findVisibleClientForQualification(id, auth.user, settings.allowAgentClaim);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: await getInterestedUnits(id), canEdit: canEditClientQualification(auth.user, client) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("crm", "manageLeads");
  if (auth.response) return auth.response;
  const { id } = await params;
  const settings = getPlatformSettings();
  const client = await findVisibleClientForQualification(id, auth.user, settings.allowAgentClaim);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditClientQualification(auth.user, client)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = InterestedUnitCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidInput(parsed.error);

  const interestedUnit = await addInterestedUnit(id, parsed.data, auth.user?.id ?? null);
  return NextResponse.json(interestedUnit, { status: 201 });
}
