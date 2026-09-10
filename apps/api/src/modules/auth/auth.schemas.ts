import { UserRole } from "@prisma/client";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(
    8,
    "Password must contain at least 8 characters.",
  )
  .max(
    128,
    "Password cannot exceed 128 characters.",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.nativeEnum(UserRole),
});

export const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required.")
    .max(100),

  email: emailSchema,

  password: passwordSchema
    .regex(
      /[A-Z]/,
      "Password requires an uppercase letter.",
    )
    .regex(
      /[a-z]/,
      "Password requires a lowercase letter.",
    )
    .regex(
      /[0-9]/,
      "Password requires a number.",
    ),

  phone: z
    .string()
    .trim()
    .max(20)
    .optional(),

  role: z.nativeEnum(UserRole),

  organisation: z
    .string()
    .trim()
    .max(150)
    .optional(),

  district: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

export type LoginInput = z.infer<
  typeof loginSchema
>;

export type CreateUserInput = z.infer<
  typeof createUserSchema
>;