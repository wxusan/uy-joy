import { z } from "zod";
import { PolygonSchema } from "./common";

export const UnitStatusSchema = z.enum(["available", "reserved", "sold"]);

export const UnitCreateSchema = z.object({
  unitNumber: z.string().trim().min(1).max(40),
  floorId: z.string().trim().min(1),
  rooms: z.number().int().positive().optional(),
  area: z.number().nonnegative().optional(),
  status: UnitStatusSchema.optional(),
  pricePerM2: z.number().nonnegative().nullable().optional(),
  totalPrice: z.number().nonnegative().nullable().optional(),
  polygonData: PolygonSchema.nullable().optional(),
  labelX: z.number().min(0).max(100).nullable().optional(),
  labelY: z.number().min(0).max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  features: z.unknown().nullable().optional(),
});

export const UnitUpdateSchema = UnitCreateSchema.omit({ floorId: true }).partial().extend({
  sketchImage: z.string().trim().min(1).nullable().optional(),
  sketchImage2: z.string().trim().min(1).nullable().optional(),
  sketchImage3: z.string().trim().min(1).nullable().optional(),
  sketchImage4: z.string().trim().min(1).nullable().optional(),
  customerName: z.string().trim().max(120).nullable().optional(),
  customerPhone: z.string().trim().max(40).nullable().optional(),
  customerNotes: z.string().trim().max(1000).nullable().optional(),
});

export const UnitBulkUpdateSchema = z.object({
  unitIds: z.array(z.string().trim().min(1)).min(1),
  data: z.object({
    status: UnitStatusSchema.optional(),
    pricePerM2: z.number().nonnegative().nullable().optional(),
    totalPrice: z.number().nonnegative().nullable().optional(),
  }),
});
