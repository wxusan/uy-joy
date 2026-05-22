import { NextResponse } from "next/server";
import { getOverviewReport, getSalesReport, parseReportFilters } from "@/lib/reports";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function GET() {
  const auth = await requirePlatformApiFeature("reports", "viewReports");
  if (auth.response) return auth.response;

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  const filters = parseReportFilters(new URLSearchParams({ from: from.toISOString(), to: to.toISOString() }));
  const [overview, sales] = await Promise.all([getOverviewReport(filters, auth.user), getSalesReport(filters, auth.user)]);
  return NextResponse.json({
    schedule: "Monday morning Asia/Tashkent",
    recipients: ["owner", "sales_director"],
    delivery: "in_app_preview",
    overview,
    sales,
  });
}
