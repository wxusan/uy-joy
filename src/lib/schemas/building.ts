import { z } from "zod";
import { PolygonSchema } from "./common";

const ImageField = z.string().trim().min(1).nullable();
const Percent = z.number().min(0).max(100).nullable();

export const BuildingCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  projectId: z.string().trim().min(1),
  completionYear: z.number().int().min(2020).max(2060).nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  polygonData: PolygonSchema.nullable().optional(),
});

export const BuildingUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  completionYear: z.number().int().min(2020).max(2060).nullable().optional(),
  frontViewImage: ImageField.optional(),
  backViewImage: ImageField.optional(),
  leftViewImage: ImageField.optional(),
  rightViewImage: ImageField.optional(),
  polygonData: PolygonSchema.nullable().optional(),
  labelX: Percent.optional(),
  labelY: Percent.optional(),
  pointX: Percent.optional(),
  pointY: Percent.optional(),
  labelScale: z.number().positive().max(4).nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const FloorPositionsUpdateSchema = z.object({
  floorPositions: z.array(
    z.object({
      floorId: z.string().trim().min(1),
      positionData: z.object({
        yStart: z.number().min(0).max(100).optional(),
        yEnd: z.number().min(0).max(100).optional(),
        polygon: PolygonSchema.optional(),
        label: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).nullable().optional(),
      }),
    })
  ),
});
