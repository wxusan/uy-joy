import { z } from "zod";
import { PolygonSchema } from "./common";

export const FloorCreateSchema = z.object({
  number: z.number().int().positive(),
  buildingId: z.string().trim().min(1),
  basePricePerM2: z.number().nonnegative().nullable().optional(),
});

export const FloorUpdateSchema = z.object({
  number: z.number().int().positive().optional(),
  basePricePerM2: z.number().nonnegative().nullable().optional(),
  floorPlanImage: z.string().trim().min(1).nullable().optional(),
  positionData: z
    .object({
      yStart: z.number().min(0).max(100).optional(),
      yEnd: z.number().min(0).max(100).optional(),
      polygon: PolygonSchema.optional(),
      label: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).nullable().optional(),
    })
    .nullable()
    .optional(),
});
