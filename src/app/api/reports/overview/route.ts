import { NextRequest, NextResponse } from "next/server";
import { getOverviewReport, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("reports", "viewReports");
  if (auth.response) return auth.response;

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const report = await getOverviewReport(filters, auth.user);
  return NextResponse.json(report);
}
