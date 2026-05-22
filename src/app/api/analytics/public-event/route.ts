import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAnalyticsEvent } from "@/lib/analytics-events";
import { requirePlatformFeature } from "@/lib/platform-guards";

const PublicEventSchema = z.object({
  eventName: z.string().trim().min(1).max(120),
  properties: z.record(z.string(), z.unknown()).optional(),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const eventAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  for (const [ip, entry] of Array.from(eventAttempts.entries())) {
    if (entry.resetAt <= now) eventAttempts.delete(ip);
  }
  const entry = eventAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    eventAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
  const featureResponse = requirePlatformFeature("publicPage");
  if (featureResponse) return featureResponse;

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PublicEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true }, { status: 202 });

  try {
    await recordAnalyticsEvent(parsed.data);
  } catch {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
