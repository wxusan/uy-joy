import { z } from "zod";

const NullableString = z.string().nullable();

export const ProjectCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: NullableString.optional(),
  address: NullableString.optional(),
  coverImage: NullableString.optional(),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  nameTranslations: NullableString.optional(),
  description: NullableString.optional(),
  descriptionTranslations: NullableString.optional(),
  address: NullableString.optional(),
  addressTranslations: NullableString.optional(),
  topViewImage: NullableString.optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  infrastructure: z.unknown().nullable().optional(),
  expectedYear: z.number().int().min(2000).max(2200).nullable().optional(),
});
