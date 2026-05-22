import { z } from "zod";
import { LeadStatusSchema } from "@/lib/lead-status";

const IdString = z.string().trim().min(1).max(120);

export const LeadSourceSchema = z.string().trim().min(1).max(80).optional();

export const LeadCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  projectId: z.string().trim().max(64).optional(),
  projectName: z.string().trim().max(140).optional(),
  unitId: z.string().trim().max(64).optional(),
  unitNumber: z.string().trim().max(40).optional(),
  source: LeadSourceSchema.optional(),
  sourceDetail: z.string().trim().max(160).optional(),
  campaign: z.string().trim().max(160).optional(),
  utmSource: z.string().trim().max(160).optional(),
  utmMedium: z.string().trim().max(160).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
  utmContent: z.string().trim().max(160).optional(),
  utmTerm: z.string().trim().max(160).optional(),
  referrer: z.string().trim().max(400).optional(),
  landingPath: z.string().trim().max(400).optional(),
  preferredLanguage: z.enum(["uz", "ru", "en"]).optional(),
  analyticsSessionId: z.string().trim().max(160).optional(),
  website: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  url: z.string().max(200).optional(),
});

export const LeadUpdateSchema = z.object({
  status: LeadStatusSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  assignedToId: IdString.nullable().optional(),
  clientId: IdString.nullable().optional(),
  lostReason: z.string().trim().max(500).nullable().optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
});
