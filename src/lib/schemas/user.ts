import { z } from "zod";
import { V1_PLATFORM_ROLES } from "@/lib/platform-plans";

const UserRoleSchema = z.enum(V1_PLATFORM_ROLES);

export const UserCreateSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120),
  role: UserRoleSchema.optional(),
});

export const UserUpdateSchema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(200).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  role: UserRoleSchema.optional(),
});

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(200),
});

export const UserPasswordResetSchema = z.object({
  password: z.string().min(10).max(200),
});
