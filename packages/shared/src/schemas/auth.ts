import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(72)
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(16)
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>;
