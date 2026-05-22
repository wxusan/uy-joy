import { z } from "zod";
import { LeadStatusSchema } from "@/lib/lead-status";

const IdString = z.string().trim().min(1).max(120);

export const ClientStatusSchema = z.enum(["active", "inactive", "blacklisted", "duplicate"]);
export const ClientTypeSchema = z.enum(["individual", "company"]);
export const PreferredLanguageSchema = z.enum(["uz", "ru", "en"]).nullable().optional();

export const ClientCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(32),
  secondaryPhone: z.string().trim().max(32).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  telegramUsername: z.string().trim().max(80).nullable().optional(),
  instagramUsername: z.string().trim().max(80).nullable().optional(),
  preferredLanguage: PreferredLanguageSchema,
  type: ClientTypeSchema.default("individual"),
  companyName: z.string().trim().max(160).nullable().optional(),
  source: z.string().trim().max(80).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: ClientStatusSchema.default("active"),
  assignedToId: IdString.nullable().optional(),
});

export const ClientUpdateSchema = ClientCreateSchema.partial();

export const ActivityTypeSchema = z.enum([
  "created",
  "status_changed",
  "assigned",
  "note",
  "communication",
  "meeting",
  "visit",
  "task",
  "deal",
  "document",
  "payment",
  "system",
]);

export const ActivityCreateSchema = z.object({
  type: ActivityTypeSchema,
  title: z.string().trim().min(1).max(180),
  body: z.string().max(4000).nullable().optional(),
  clientId: IdString.nullable().optional(),
  leadId: IdString.nullable().optional(),
  unitId: IdString.nullable().optional(),
  taskId: IdString.nullable().optional(),
  assignedToId: IdString.nullable().optional(),
  direction: z.enum(["inbound", "outbound", "internal"]).nullable().optional(),
  channel: z.enum(["phone", "sms", "telegram", "instagram", "website", "manual", "system"]).nullable().optional(),
  metadata: z.unknown().optional(),
  occurredAt: z.string().datetime().optional(),
});

export const TaskTypeSchema = z.enum(["call", "message", "meeting", "visit", "document", "payment", "other"]);
export const TaskStatusSchema = z.enum(["open", "completed", "cancelled"]);
export const TaskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(2000).nullable().optional(),
  type: TaskTypeSchema.default("call"),
  priority: TaskPrioritySchema.default("normal"),
  clientId: IdString.nullable().optional(),
  leadId: IdString.nullable().optional(),
  unitId: IdString.nullable().optional(),
  assignedToId: IdString,
  dueAt: z.string().datetime().nullable().optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: TaskTypeSchema.optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignedToId: IdString.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const PipelineStageUpdateSchema = z.object({
  status: LeadStatusSchema,
  updatedAt: z.string().datetime().optional(),
  lostReason: z.string().trim().max(500).optional(),
});
