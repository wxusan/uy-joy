import { z } from "zod";

export const UploadFormSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(["project", "building", "floor", "unit", "hero", "document", "public-page"]),
  id: z.string().trim().min(1).max(120),
});
