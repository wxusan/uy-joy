import { NextRequest } from "next/server";
import { POST as processTelegramOutbox } from "@/app/api/integrations/telegram/process-outbox/route";

export function GET(request: NextRequest) {
  return processTelegramOutbox(request);
}

export const POST = GET;
