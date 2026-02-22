import type { Request, Response } from "express";
import { raceModeSchema, seasonIdSchema, typingLeaderboardQuerySchema, ok, type RaceMode } from "@typeracrer/shared";
import { z } from "zod";
import { getLeaderboardQueueStatus, enqueueFullLeaderboardRecompute } from "../../jobs/leaderboard-recompute.queue.js";
import { HttpError } from "../../utils/http-error.js";
import { getCurrentSeasonWindow, parseSeasonWindow } from "./season.js";
import { getTypingLeaderboard } from "./leaderboard.service.js";

const recomputeRequestSchema = z.object({
  scope: z.enum(["global", "seasonal"]).default("global"),
  seasonId: seasonIdSchema.optional(),
  mode: raceModeSchema.optional()
});

export async function getGlobalTypingLeaderboardHandler(req: Request, res: Response): Promise<void> {
  const parsed = typingLeaderboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid leaderboard query");
  }

  const leaderboard = await getTypingLeaderboard({
    scope: "global",
    mode: parsed.data.mode,
    limit: parsed.data.limit
  });

  res.status(200).json(ok({ leaderboard }));
}

export async function getSeasonalTypingLeaderboardHandler(req: Request, res: Response): Promise<void> {
  const parsed = typingLeaderboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid leaderboard query");
  }

  const query: {
    scope: "seasonal";
    seasonId?: string;
    mode: RaceMode;
    limit: number;
  } = {
    scope: "seasonal",
    mode: parsed.data.mode,
    limit: parsed.data.limit
  };
  if (parsed.data.seasonId !== undefined) {
    query.seasonId = parsed.data.seasonId;
  }

  const leaderboard = await getTypingLeaderboard(query);

  res.status(200).json(ok({ leaderboard }));
}

export function getCurrentLeaderboardSeasonHandler(_req: Request, res: Response): void {
  const season = getCurrentSeasonWindow();
  res.status(200).json(ok({ season }));
}

export function getLeaderboardSeasonByIdHandler(req: Request, res: Response): void {
  const parsed = seasonIdSchema.safeParse(req.params.seasonId);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid season id");
  }

  const season = parseSeasonWindow(parsed.data);
  res.status(200).json(ok({ season }));
}

export function enqueueLeaderboardRecomputeHandler(req: Request, res: Response): void {
  const parsed = recomputeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid recompute payload");
  }

  const payload: { scope: "global" | "seasonal"; seasonId?: string; mode?: RaceMode } = {
    scope: parsed.data.scope
  };
  if (parsed.data.seasonId !== undefined) {
    payload.seasonId = parsed.data.seasonId;
  }
  if (parsed.data.mode !== undefined) {
    payload.mode = parsed.data.mode;
  }

  const key = enqueueFullLeaderboardRecompute(payload);

  const queue = getLeaderboardQueueStatus();
  res.status(202).json(
    ok({
      accepted: true,
      jobKey: key,
      queue
    })
  );
}
