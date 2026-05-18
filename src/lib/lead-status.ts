import { z } from "zod";

export const LEAD_STATUSES = [
  "new",
  "inCRM",
  "callback",
  "inProgress",
  "contacted",
  "converted",
  "notInterested",
  "closed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LeadStatusSchema = z.enum(LEAD_STATUSES);

export function getLeadStatusTone(status: string) {
  if (status === "new") return "var(--a-accent)";
  if (status === "converted") return "var(--a-success)";
  if (status === "notInterested" || status === "closed") return "var(--a-text-tertiary)";
  return "var(--a-warning)";
}
