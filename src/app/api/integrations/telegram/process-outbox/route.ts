import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/platform-guards";
import { processTelegramOutbox } from "@/lib/telegram";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const cron = requireCronSecret(request);
  if (cron) return cron;

  const results = await processTelegramOutbox();
  logger.info("telegram_outbox_processed", {
    processed: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
    pending: results.filter((result) => result.status === "pending").length,
  });
  return NextResponse.json({
    processed: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
    pending: results.filter((result) => result.status === "pending").length,
    results,
  });
}

export const GET = POST;
