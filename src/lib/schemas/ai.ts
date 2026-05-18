import { z } from "zod";

export const DetectApartmentsSchema = z.object({
  imageUrl: z.string().trim().min(1),
});

export const DetectFloorsSchema = z.object({
  imageUrl: z.string().trim().min(1),
  floorCount: z.number().int().positive().max(200),
});

export const TranslateSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  existingTranslations: z.record(z.string(), z.string().optional()).optional(),
  context: z.string().trim().max(200).optional(),
});
