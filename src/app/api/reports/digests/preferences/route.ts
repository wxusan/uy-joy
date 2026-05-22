import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getReportDigestPreference, upsertReportDigestPreference } from "@/lib/report-digests";

export const dynamic = "force-dynamic";

const DigestPreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  email: z.string().trim().email().nullable().optional(),
});

export async function GET() {
  const auth = await requirePlatformApiFeature("reports", "viewReports");
  if (auth.response) return auth.response;
  if (!auth.user?.id) return NextResponse.json({ error: "User id missing from session" }, { status: 401 });

  const preference = await getReportDigestPreference(auth.user.id);
  return NextResponse.json({
    preference: preference ?? {
      enabled: true,
      email: null,
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requirePlatformApiFeature("reports", "viewReports");
  if (auth.response) return auth.response;
  if (!auth.user?.id) return NextResponse.json({ error: "User id missing from session" }, { status: 401 });

  const parsed = DigestPreferenceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const preference = await upsertReportDigestPreference(auth.user.id, parsed.data);
  return NextResponse.json({ success: true, preference });
}
