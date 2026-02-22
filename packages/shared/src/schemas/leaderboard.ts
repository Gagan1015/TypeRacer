import { z } from "zod";
import { raceModeSchema } from "./race.js";

const seasonIdPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const seasonIdSchema = z.string().regex(seasonIdPattern, "Season id must be in YYYY-MM format");

export const typingLeaderboardQuerySchema = z.object({
  mode: raceModeSchema.default("timed_30"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  seasonId: seasonIdSchema.optional()
});

export const rankedLeaderboardScopeSchema = z.enum(["global", "seasonal"]);

export const rankedLeaderboardQuerySchema = z.object({
  scope: rankedLeaderboardScopeSchema.default("global"),
  seasonId: seasonIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const rankedHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export type TypingLeaderboardQueryInput = z.infer<typeof typingLeaderboardQuerySchema>;
export type RankedLeaderboardQueryInput = z.infer<typeof rankedLeaderboardQuerySchema>;
export type RankedHistoryQueryInput = z.infer<typeof rankedHistoryQuerySchema>;
