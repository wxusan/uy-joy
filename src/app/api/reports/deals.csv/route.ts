import { NextRequest, NextResponse } from "next/server";
import { makeDealsCsv, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("reports", "viewDeals");
  if (auth.response) return auth.response;

  const csv = await makeDealsCsv(parseReportFilters(new URL(request.url).searchParams), auth.user);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="deals.csv"',
    },
  });
}
