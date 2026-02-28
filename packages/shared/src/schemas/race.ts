import { z } from "zod";
import { characterProfiles, raceDifficulties, raceModes, raceThemes } from "../constants/race.js";

export const raceModeSchema = z.enum(raceModes);
export const raceThemeSchema = z.enum(raceThemes);
export const characterProfileSchema = z.enum(characterProfiles);
export const raceDifficultySchema = z.enum(raceDifficulties);

const raceThemesQuerySchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return value;
}, z.array(raceThemeSchema).min(1).max(3)).refine((themes) => new Set(themes).size === themes.length, {
  message: "Themes must be unique"
});

export const raceTextQuerySchema = z.object({
  mode: raceModeSchema,
  durationMs: z.coerce.number().int().positive().max(600_000).optional(),
  themes: raceThemesQuerySchema.optional(),
  characterProfile: characterProfileSchema.optional(),
  difficulty: raceDifficultySchema.optional()
});

export const createTypingAttemptSchema = z.object({
  mode: raceModeSchema,
  textId: z.string().trim().min(2).max(80),
  typed: z.string().max(5000),
  durationMs: z.coerce.number().int().positive().max(300_000),
  targetDurationMs: z.coerce.number().int().positive().max(600_000).optional()
});

export const attemptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export type RaceModeInput = z.infer<typeof raceModeSchema>;
export type RaceThemeInput = z.infer<typeof raceThemeSchema>;
export type CharacterProfileInput = z.infer<typeof characterProfileSchema>;
export type RaceDifficultyInput = z.infer<typeof raceDifficultySchema>;
export type RaceTextQueryInput = z.infer<typeof raceTextQuerySchema>;
export type CreateTypingAttemptInput = z.infer<typeof createTypingAttemptSchema>;
export type AttemptsQueryInput = z.infer<typeof attemptsQuerySchema>;
