import { z } from "zod";

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(32).optional(),
  bio: z.string().trim().max(280).optional(),
  avatarUrl: z.string().url().trim().max(1024).optional(),
  keyboardLayout: z.enum(["qwerty", "dvorak", "colemak"]).optional()
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
