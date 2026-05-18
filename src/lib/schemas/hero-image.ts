import { z } from "zod";

export const HeroImageCreateSchema = z.object({
  imageUrl: z.string().trim().url(),
});

export const HeroImageUpdateSchema = z.object({
  imageUrl: z.string().trim().url().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
