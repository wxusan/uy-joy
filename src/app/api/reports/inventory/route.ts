import { NextRequest, NextResponse } from "next/server";
import { getInventoryReport, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiFeature, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("reports", "viewReports");
  if (auth.response) return auth.response;
  const inventoryResponse = requirePlatformFeature("inventory");
  if (inventoryResponse) return inventoryResponse;

  const filters = parseReportFilters(new URL(request.url).searchParams);
  const report = await getInventoryReport(filters, auth.user);
  return NextResponse.json(report);
}
