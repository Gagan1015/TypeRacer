import { z } from "zod";
import { raceModes } from "../constants/race.js";

export const raceModeSchema = z.enum(raceModes);

export const raceTextQuerySchema = z.object({
  mode: raceModeSchema
});

export const createTypingAttemptSchema = z.object({
  mode: raceModeSchema,
  textId: z.string().trim().min(2).max(80),
  typed: z.string().max(1200),
  durationMs: z.coerce.number().int().positive().max(300_000)
});

export const attemptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export type RaceModeInput = z.infer<typeof raceModeSchema>;
export type CreateTypingAttemptInput = z.infer<typeof createTypingAttemptSchema>;
export type AttemptsQueryInput = z.infer<typeof attemptsQuerySchema>;

