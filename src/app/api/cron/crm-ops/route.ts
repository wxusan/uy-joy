import { NextRequest, NextResponse } from "next/server";
import { GET as processTelegramOutbox } from "@/app/api/integrations/telegram/process-outbox/route";
import { GET as runFollowupReminders } from "@/app/api/crm/automation/run-followup-reminders/route";
import { GET as runReservationExpiryCheck } from "@/app/api/crm/deals/run-reservation-expiry-check/route";
import { GET as runPaymentOverdueCheck } from "@/app/api/crm/payments/run-overdue-check/route";
import { GET as runDuplicateCheck } from "@/app/api/crm/automation/run-duplicate-check/route";
import { GET as runInactivityCheck } from "@/app/api/crm/automation/run-inactivity-check/route";

type CronStep = {
  name: string;
  run: (request: NextRequest) => Promise<Response>;
};

const steps: CronStep[] = [
  { name: "followup-reminders", run: runFollowupReminders },
  { name: "reservation-expiry", run: runReservationExpiryCheck },
  { name: "payment-overdue", run: runPaymentOverdueCheck },
  { name: "duplicate-check", run: runDuplicateCheck },
  { name: "inactivity-check", run: runInactivityCheck },
  { name: "telegram-outbox", run: processTelegramOutbox },
];

export async function GET(request: NextRequest) {
  const results = [];

  for (const step of steps) {
    try {
      const response = await step.run(request);
      const body = await response.json().catch(() => null);
      results.push({ name: step.name, status: response.status, ok: response.ok, body });
      if (!response.ok) {
        return NextResponse.json({ ok: false, failedAt: step.name, results }, { status: response.status });
      }
    } catch (error) {
      results.push({
        name: step.name,
        status: 500,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json({ ok: false, failedAt: step.name, results }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, results });
}

export const POST = GET;
