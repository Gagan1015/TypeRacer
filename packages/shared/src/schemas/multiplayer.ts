import { z } from "zod";
import { raceModeSchema } from "./race.js";

export const multiplayerCreateRoomSchema = z.object({
  mode: raceModeSchema.default("timed_30"),
  customDurationMs: z.number().int().positive().max(600_000).optional()
});

export const multiplayerJoinRoomSchema = z.object({
  roomId: z.string().trim().min(4).max(20)
});

export const multiplayerReadySchema = z.object({
  ready: z.boolean()
});

export const multiplayerProgressSchema = z.object({
  typed: z.string().max(5000),
  elapsedMs: z.number().int().min(1).max(300_000)
});

export const multiplayerFinishSchema = multiplayerProgressSchema;

export type MultiplayerCreateRoomInput = z.infer<typeof multiplayerCreateRoomSchema>;
export type MultiplayerJoinRoomInput = z.infer<typeof multiplayerJoinRoomSchema>;
export type MultiplayerReadyInput = z.infer<typeof multiplayerReadySchema>;
export type MultiplayerProgressInput = z.infer<typeof multiplayerProgressSchema>;
export type MultiplayerFinishInput = z.infer<typeof multiplayerFinishSchema>;
