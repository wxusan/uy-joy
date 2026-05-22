import { NextRequest, NextResponse } from "next/server";
import { makePaymentsCsv, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiAccess, requirePlatformFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiAccess("viewFinance");
  if (auth.response) return auth.response;
  const featureResponse = requirePlatformFeature("financeReports");
  if (featureResponse) return featureResponse;

  const csv = await makePaymentsCsv(parseReportFilters(new URL(request.url).searchParams), auth.user);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payments.csv"',
    },
  });
}
