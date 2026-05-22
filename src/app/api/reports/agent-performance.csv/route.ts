import { NextRequest, NextResponse } from "next/server";
import { makeAgentPerformanceCsv, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformApiFeature("reports", "viewReports");
  if (auth.response) return auth.response;

  const csv = await makeAgentPerformanceCsv(parseReportFilters(new URL(request.url).searchParams), auth.user);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agent-performance.csv"',
    },
  });
}
