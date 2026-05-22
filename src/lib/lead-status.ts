import { z } from "zod";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "meeting",
  "negotiation",
  "reserved",
  "sold",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LeadStatusSchema = z.enum(LEAD_STATUSES);

export function getLeadStatusTone(status: string) {
  if (status === "new") return "var(--a-accent)";
  if (status === "sold") return "var(--a-success)";
  if (status === "lost") return "var(--a-text-tertiary)";
  if (status === "reserved") return "var(--a-warning)";
  return "var(--a-warning)";
}

export const LEGACY_LEAD_STATUS_ALIASES: Record<string, LeadStatus> = {
  inCRM: "contacted",
  callback: "contacted",
  inProgress: "negotiation",
  converted: "sold",
  notInterested: "lost",
  closed: "lost",
};

export function normalizeLeadStatus(status: string | null | undefined): LeadStatus {
  if (!status) return "new";
  if ((LEAD_STATUSES as readonly string[]).includes(status)) return status as LeadStatus;
  return LEGACY_LEAD_STATUS_ALIASES[status] ?? "new";
}
