import { Prisma } from "@prisma/client";
import prisma from "./prisma";

const PRIVATE_PROPERTY_KEYS = new Set(["name", "phone", "email", "fullName", "phoneNormalized"]);

export type AnalyticsEventInput = {
  eventName: string;
  properties?: Record<string, unknown>;
  leadId?: string | null;
  clientId?: string | null;
  occurredAt?: Date;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, maxLength);
  return cleaned || null;
}

function cleanProperties(properties: Record<string, unknown> = {}) {
  return Object.entries(properties).reduce<Prisma.JsonObject>((safe, [key, value]) => {
    if (PRIVATE_PROPERTY_KEYS.has(key)) return safe;
    if (value == null) return safe;
    if (typeof value === "string") {
      safe[key] = value.slice(0, 500);
      return safe;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
      return safe;
    }
    return safe;
  }, {});
}

export async function recordAnalyticsEvent(
  input: AnalyticsEventInput,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const eventName = cleanText(input.eventName, 120);
  if (!eventName) return null;

  const properties = cleanProperties(input.properties);
  return db.analyticsEvent.create({
    data: {
      eventName,
      source: cleanText(properties.source, 80),
      campaign: cleanText(properties.campaign, 160),
      utmSource: cleanText(properties.utmSource, 160),
      utmMedium: cleanText(properties.utmMedium, 160),
      utmCampaign: cleanText(properties.utmCampaign, 160),
      utmContent: cleanText(properties.utmContent, 160),
      utmTerm: cleanText(properties.utmTerm, 160),
      projectId: cleanText(properties.projectId, 120),
      unitId: cleanText(properties.unitId, 120),
      leadId: input.leadId || cleanText(properties.leadId, 120),
      clientId: input.clientId || cleanText(properties.clientId, 120),
      distinctId: cleanText(properties.distinctId, 160),
      sessionId: cleanText(properties.analyticsSessionId ?? properties.sessionId, 160),
      landingPath: cleanText(properties.landingPath, 400),
      referrer: cleanText(properties.referrer, 400),
      locale: cleanText(properties.locale ?? properties.preferredLanguage, 20),
      properties,
      occurredAt: input.occurredAt || new Date(),
    },
  });
}
