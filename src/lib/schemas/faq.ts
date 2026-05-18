import { z } from "zod";

const RequiredText = z.string().trim().min(1).max(2000);

export const FAQCreateSchema = z.object({
  questionUz: RequiredText,
  questionEn: RequiredText,
  questionRu: RequiredText,
  answerUz: RequiredText,
  answerEn: RequiredText,
  answerRu: RequiredText,
});

export const FAQUpdateSchema = FAQCreateSchema.partial();
