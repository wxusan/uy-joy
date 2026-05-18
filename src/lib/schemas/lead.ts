import { z } from "zod";
import { LeadStatusSchema } from "@/lib/lead-status";

export const LeadSourceSchema = z.enum([
  "kvartiralar",
  "vizual",
  "bosh-sahifa",
  "floating_matchmaker",
  "intent_popup",
  "interactive-floor",
  "apartment-card",
  "waitlist",
]);

export const LeadCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  projectId: z.string().trim().max(64).optional(),
  projectName: z.string().trim().max(140).optional(),
  unitId: z.string().trim().max(64).optional(),
  unitNumber: z.string().trim().max(40).optional(),
  source: LeadSourceSchema.optional(),
  website: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  url: z.string().max(200).optional(),
});

export const LeadUpdateSchema = z.object({
  status: LeadStatusSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
});
