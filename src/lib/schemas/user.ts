import { z } from "zod";

export const UserCreateSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "superadmin"]).optional(),
});

export const UserUpdateSchema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(200).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["admin", "superadmin"]).optional(),
});
