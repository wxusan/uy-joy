import { NextRequest, NextResponse } from "next/server";
import { getFinanceReport, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiAccess, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiAccess("viewFinance");
  if (auth.response) return auth.response;
  const featureResponse = requirePlatformFeature("financeReports");
  if (featureResponse) return featureResponse;

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const report = await getFinanceReport(filters, auth.user);
  return NextResponse.json(report);
}
