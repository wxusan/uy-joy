import { NextRequest, NextResponse } from "next/server";
import { getAgentReport, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiAccess, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiAccess();
  if (auth.response) return auth.response;
  const featureResponse = requirePlatformFeature("reports");
  if (featureResponse) return featureResponse;

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const report = await getAgentReport(filters, auth.user, true);
  return NextResponse.json(report);
}
